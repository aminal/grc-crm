import 'server-only';
import { adminStorage, db } from '@/lib/firebase/admin';
import { PAYMENT_METHODS } from '@/lib/domain/constants';
import type {
  ActivityData,
  ActorSnapshot,
  AuthenticatedUser,
  FirestoreRecord,
  InvoiceData,
  InvoicePayment,
  OrderData,
  OrderItem,
  OrderStatus,
  OrderTerms,
  PackageData,
  PaymentMethod,
} from '@/lib/domain/types';
import {
  applyDiscountToInvoice,
  assertDiscountWithinSubtotal,
  assertPaymentDoesNotOverpay,
  discountCentsFor,
  hasInvoicePayments,
  invoicePayments,
  recalculateInvoice as recalculateInvoiceTotals
} from '@/lib/sales/invoice';
import { buildPackageStatusMap } from '@/lib/sales/package-status';
import { assertSameSourcePrice, sourcePackageKey, type SourcePriceRecord } from '@/lib/sales/pricing';
import { canTransition, CLOSABLE_ORDER_STATUSES, RELEASING_ORDER_STATUSES } from '@/lib/sales/order-status';
import { findCompany } from './crm';
import { docIdFromTag, getDocument, listCollection, millis, now } from './firestore';
import { getUserProfile } from './profiles';
import { generateInvoicePdf } from './pdf';

export { availableOrderActions, canTransition } from '@/lib/sales/order-status';

const ORDERS = 'orders';
const ACTIVITY = 'activity';
const FIRST_ORDER_NUMBER = 1501;
const INVOICE_PDF_TEMPLATE_VERSION = 7.10;

type InvoiceApprovalInput = {
    invoice_number: string;
    terms: OrderTerms;
    terms_notes: string;
};

type PaidActivityInput = {
    action: string;
    payment_id?: string;
    payment_amount_cents?: number;
};

function actorMap(user: AuthenticatedUser): ActorSnapshot {
    return {
        uid: user.uid,
        email: user.email,
        name: user.name ?? user.email,
        picture: user.picture ?? '',
    };
}

async function userActorMap(uid: string): Promise<ActorSnapshot> {
    const profile = await getUserProfile(uid);
    if (!profile) {
        throw new Error('Salesperson not found.');
    }

    const email = profile.data.email?.trim() ?? '';
    const name = profile.data.display_name?.trim() || email || uid;

    return {
        uid,
        email,
        name,
        picture: profile.data.picture?.trim() ?? '',
    };
}

function normalizeTags(tags: string[]): string[] {
    return [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))];
}

function priceCentsForTag(prices: Record<string, number>, tag: string): number {
    const cents = prices[tag] ?? prices[docIdFromTag(tag)] ?? null;
    if (cents === null || !Number.isFinite(cents) || cents < 1) {
        throw new Error(`A valid price is required for package ${tag}.`);
    }

    return Math.round(cents);
}

function itemSnapshot(packageRecord: FirestoreRecord<PackageData>, priceCents: number): OrderItem {
    const packageData = packageRecord.data;
    return {
        package_id: packageRecord.id,
        package_tag: packageData.package_tag,
        ...(packageData.product_id ? { product_id: packageData.product_id } : {}),
        strain: packageData.strain ?? '',
        source_harvest: packageData.source_harvest ?? '',
        source_packages: packageData.source_packages ?? '',
        original_source_package_label: packageData.original_source_package_label ?? '',
        source_processing_jobs: packageData.source_processing_jobs ?? '',
        location: packageData.location ?? '',
        sublocation: packageData.sublocation ?? '',
        item: packageData.item ?? '',
        category: packageData.category ?? '',
        quantity: Number(packageData.quantity ?? 0),
        unit_of_measure: packageData.unit_of_measure ?? '',
        production_batch_number: packageData.production_batch_number ?? '',
        source_production_batch: packageData.source_production_batch ?? '',
        lab_testing_status: packageData.lab_testing_status ?? '',
        finished_goods: packageData.finished_goods ?? '',
        administrative_hold: packageData.administrative_hold ?? '',
        administrative_recall: packageData.administrative_recall ?? '',
        packaged_date: packageData.packaged_date ?? '',
        received: packageData.received ?? '',
        expiration_date: packageData.expiration_date ?? '',
        sell_by_date: packageData.sell_by_date ?? '',
        lab_test_expiration: packageData.lab_test_expiration ?? '',
        source_package_key: sourcePackageKey(packageData),
        price_cents: priceCents,
    };
}

function orderTotalCents(orderOrItems: Pick<OrderData, 'items'>): number {
    return (orderOrItems.items ?? []).reduce((total, item) => total + Number(item.price_cents ?? 0), 0);
}

async function writeActivity(orderId: string, fields: Partial<ActivityData> & {
    action: string;
    from_status: OrderStatus | null;
    to_status: OrderStatus | ''
}, user: AuthenticatedUser): Promise<void> {
    await db.collection(`${ORDERS}/${orderId}/${ACTIVITY}`).add({
        action: fields.action,
        from_status: fields.from_status,
        to_status: fields.to_status,
        actor_user_id: user.uid,
        actor_email: user.email,
        actor_name: user.name ?? user.email,
        actor_picture: user.picture ?? '',
        ...(fields.packages ? { packages: fields.packages } : {}),
        ...(fields.invoice_id ? { invoice_id: fields.invoice_id } : {}),
        ...(fields.invoice_total_cents !== undefined ? { invoice_total_cents: fields.invoice_total_cents } : {}),
        ...(fields.payment_id ? { payment_id: fields.payment_id } : {}),
        ...(fields.payment_amount_cents !== undefined ? { payment_amount_cents: fields.payment_amount_cents } : {}),
        ...(fields.discount_cents !== undefined ? { discount_cents: fields.discount_cents } : {}),
        created_at: now(),
    });
}

function invoiceFromOrder(orderData: OrderData): InvoiceData | null {
    const invoice = orderData.invoice;
    if (!invoice || invoice.status === 'void') {
        return null;
    }

    return invoice;
}

function nextPaymentId(payments: InvoicePayment[]): string {
    const max = payments.reduce((highest, payment) => {
        const match = payment.id.match(/payment-(\d+)/);
        return Math.max(highest, match ? Number(match[1]) : 0);
    }, 0);

    return `payment-${max + 1}`;
}

function recalculateInvoice(invoice: InvoiceData): InvoiceData {
    return recalculateInvoiceTotals(invoice, now());
}

function paymentRecordedAction(invoice: InvoiceData): string {
    return Number(invoice.balance_cents ?? 0) === 0 ? 'full_payment_recorded' : 'partial_payment_recorded';
}

function assertInvoiceHasNoPayments(invoice: InvoiceData, message: string): void {
    if (hasInvoicePayments(invoice)) {
        throw new Error(message);
    }
}

function dateOnly(date: Date): string {
    return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
    const next = new Date(date.getTime());
    next.setUTCDate(next.getUTCDate() + days);
    return next;
}

function dueDaysForOrderTerms(terms: OrderTerms): number {
    if (terms === 'NET-30') {
        return 30;
    }

    if (terms === 'NET-60') {
        return 60;
    }

    return 0;
}

function invoiceForApproval(order: FirestoreRecord<OrderData>, user: AuthenticatedUser, input: InvoiceApprovalInput): InvoiceData {
    const total = orderTotalCents(order.data);
    const issuedBy = actorMap(user);
    const invoiceNumber = input.invoice_number.trim();

    if (!invoiceNumber) {
        throw new Error('An invoice number is required to approve an order.');
    }

    return {
        id: `invoice-${order.data.order_number}`,
        invoice_number: invoiceNumber,
        order_id: order.id,
        order_number: order.data.order_number,
        company_id: order.data.company_id,
        company_name: order.data.company_name,
        status: 'unpaid',
        due_date: null,
        delivery_confirmed_at: null,
        subtotal_cents: total,
        total_cents: total,
        paid_cents: 0,
        balance_cents: total,
        payments: [],
        issued_by: issuedBy,
        issued_at: now(),
        delivered_at: null,
        voided_at: null,
        created_by: issuedBy,
        created_at: now(),
        updated_at: now(),
    };
}

function applyDeliveryToInvoice(invoice: InvoiceData, deliveredAt: Date, terms: OrderTerms): InvoiceData {
    const dueDate = addDays(deliveredAt, dueDaysForOrderTerms(terms));
    return {
        ...invoice,
        delivery_confirmed_at: deliveredAt,
        delivered_at: deliveredAt,
        due_date: dateOnly(dueDate),
        updated_at: now(),
    };
}

function voidInvoice(invoice: InvoiceData): InvoiceData {
    return {
        ...invoice,
        status: 'void',
        balance_cents: 0,
        voided_at: now(),
        updated_at: now(),
    };
}

async function markPaidIfSettled(order: FirestoreRecord<OrderData>, user: AuthenticatedUser, activity?: PaidActivityInput): Promise<FirestoreRecord<OrderData>> {
    const invoice = invoiceFromOrder(order.data);
    if (!invoice || order.data.status !== 'delivered' || Number(invoice.balance_cents ?? 0) > 0) {
        return order;
    }

    await db.doc(`${ORDERS}/${order.id}`).set(
        {
            status: 'paid',
            status_changed_at: now(),
            updated_at: now(),
        },
        { merge: true },
    );
    await writeActivity(order.id, {
        action: activity?.action ?? 'paid',
        from_status: 'delivered',
        to_status: 'paid',
        ...(activity?.payment_id ? { payment_id: activity.payment_id } : {}),
        ...(activity?.payment_amount_cents !== undefined ? { payment_amount_cents: activity.payment_amount_cents } : {}),
    }, user);
    const updated = await findOrder(order.id);
    if (!updated) {
        throw new Error('Order not found after update.');
    }

    return updated;
}

async function reopenPaidIfBalanceDue(order: FirestoreRecord<OrderData>, invoice: InvoiceData, user: AuthenticatedUser): Promise<void> {
    if (order.data.status !== 'paid' || Number(invoice.balance_cents ?? 0) === 0) {
        return;
    }

    await db.doc(`${ORDERS}/${order.id}`).set(
        {
            status: 'delivered',
            status_changed_at: now(),
            updated_at: now(),
        },
        { merge: true },
    );
    await writeActivity(order.id, { action: 'payment_balance_due', from_status: 'paid', to_status: 'delivered' }, user);
}

export async function listOrders(): Promise<FirestoreRecord<OrderData>[]> {
    const orders = await listCollection<OrderData>(ORDERS);
    return orders.sort((a, b) => millis(b.data.created_at) - millis(a.data.created_at));
}

export async function listOrdersForCompany(companyId: string): Promise<FirestoreRecord<OrderData>[]> {
    const orders = await listOrders();
    return orders.filter((order) => order.data.company_id === companyId);
}

export async function findOrder(orderId: string): Promise<FirestoreRecord<OrderData> | null> {
    return getDocument<OrderData>(`${ORDERS}/${orderId}`);
}

export async function listActivity(orderId: string): Promise<FirestoreRecord<ActivityData>[]> {
    const entries = await listCollection<ActivityData>(`${ORDERS}/${orderId}/${ACTIVITY}`);
    return entries.sort((a, b) => millis(b.data.created_at) - millis(a.data.created_at));
}

export async function createOrder(companyId: string, packageTags: string[], packagePrices: Record<string, number>, user: AuthenticatedUser, termsInput: {
    salesperson_user_id: string;
    delivery_date: string;
    delivery_date_tbd: boolean;
    terms: OrderTerms;
    terms_notes: string
}): Promise<FirestoreRecord<OrderData>> {
    const tags = normalizeTags(packageTags);
    if (tags.length === 0) {
        throw new Error('At least one package is required to create an order.');
    }

    const company = await findCompany(companyId);
    if (!company) {
        throw new Error('Company not found.');
    }

    const salesperson = termsInput.salesperson_user_id === user.uid ? actorMap(user) : await userActorMap(termsInput.salesperson_user_id);
    const result: { order: FirestoreRecord<OrderData> | null } = { order: null };

    await db.runTransaction(async (transaction) => {
        const orderSnapshot = await transaction.get(db.collection(ORDERS));
        const existingOrders = orderSnapshot.docs.map((doc) => ({ id: doc.id, data: doc.data() as OrderData }));
        const statuses = buildPackageStatusMap(existingOrders);
        const sourcePrices = new Map<string, SourcePriceRecord>();
        const items: OrderItem[] = [];

        for (const tag of tags) {
            const packageRef = db.doc(`packages/${docIdFromTag(tag)}`);
            const packageSnapshot = await transaction.get(packageRef);
            if (!packageSnapshot.exists) {
                throw new Error(`Package ${tag} is not in active inventory.`);
            }

            const packageData = packageSnapshot.data() as PackageData;
            if (!packageData.active || packageData.package_tag !== tag) {
                throw new Error(`Package ${tag} is not in active inventory.`);
            }

            const status = statuses[packageData.package_tag]?.status ?? 'available';
            if (status !== 'available') {
                throw new Error(`Package ${tag} is already reserved on another order.`);
            }

            const priceCents = priceCentsForTag(packagePrices, tag);
            assertSameSourcePrice(sourcePrices, packageData, priceCents);
            items.push(itemSnapshot({ id: packageRef.id, data: packageData }, priceCents));
        }

        const highest = existingOrders.reduce((max, existingOrder) => Math.max(max, Number(existingOrder.data.order_number ?? 0)), 0);
        const orderNumber = Math.max(FIRST_ORDER_NUMBER, highest + 1);
        const orderRef = db.doc(`${ORDERS}/order-${orderNumber}`);
        const payload = {
            order_number: orderNumber,
            company_id: companyId,
            company_name: company.data.company_name,
            facility_type: company.data.facility_type,
            salesperson,
            delivery_date: termsInput.delivery_date_tbd ? '' : termsInput.delivery_date,
            delivery_date_tbd: termsInput.delivery_date_tbd,
            terms: termsInput.terms,
            terms_notes: termsInput.terms === 'Other' ? termsInput.terms_notes : '',
            status: 'pending',
            state: 'open',
            items,
            total_cents: orderTotalCents({ items }),
            created_by: actorMap(user),
            created_at: now(),
            updated_at: now(),
            status_changed_at: now(),
        } satisfies OrderData;

        transaction.create(orderRef, payload);
        result.order = { id: orderRef.id, data: payload };
    });

    if (!result.order) {
        throw new Error('Unable to assign a unique order number.');
    }

    await writeActivity(result.order.id, {
        action: 'created',
        from_status: null,
        to_status: 'pending',
        packages: tags
    }, user);
    return result.order;
}

type TransitionUpdateBuilder = (order: FirestoreRecord<OrderData>) => Record<string, unknown>;

async function transitionOrderWithUpdate(orderId: string, to: OrderStatus, user: AuthenticatedUser, action: string, buildUpdate: TransitionUpdateBuilder): Promise<FirestoreRecord<OrderData>> {
    const orderRef = db.doc(`${ORDERS}/${orderId}`);
    let from: OrderStatus = 'pending';

    await db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(orderRef);
        if (!snapshot.exists) {
            throw new Error('Order not found.');
        }

        const orderData = snapshot.data() as OrderData;
        const order = { id: orderId, data: orderData } satisfies FirestoreRecord<OrderData>;
        from = orderData.status;
        if (!canTransition(from, to)) {
            throw new Error(`Order cannot transition from ${from} to ${to}.`);
        }

        const extraUpdate = buildUpdate(order);
        transaction.set(
            orderRef,
            {
                status: to,
                status_changed_at: now(),
                updated_at: now(),
                ...extraUpdate,
            },
            { merge: true },
        );
    });

    await writeActivity(orderId, { action, from_status: from, to_status: to }, user);

    const updated = await findOrder(orderId);
    if (!updated) {
        throw new Error('Order not found after update.');
    }

    return updated;
}

export async function transitionOrder(orderId: string, to: OrderStatus, user: AuthenticatedUser, action: string, extraUpdate: Record<string, unknown> = {}): Promise<FirestoreRecord<OrderData>> {
    return transitionOrderWithUpdate(orderId, to, user, action, () => extraUpdate);
}

async function transitionAndVoidInvoiceWithoutPayments(orderId: string, to: OrderStatus, user: AuthenticatedUser, action: string, paymentMessage: string): Promise<FirestoreRecord<OrderData>> {
    const orderRef = db.doc(`${ORDERS}/${orderId}`);
    let from: OrderStatus = 'pending';

    await db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(orderRef);
        if (!snapshot.exists) {
            throw new Error('Order not found.');
        }

        const orderData = snapshot.data() as OrderData;
        from = orderData.status;
        if (!canTransition(from, to)) {
            throw new Error(`Order cannot transition from ${from} to ${to}.`);
        }

        const invoice = invoiceFromOrder(orderData);
        const extraUpdate: Record<string, unknown> = {};
        if (invoice) {
            assertInvoiceHasNoPayments(invoice, paymentMessage);
            extraUpdate.invoice = voidInvoice(invoice);
        }

        transaction.set(
            orderRef,
            {
                status: to,
                status_changed_at: now(),
                updated_at: now(),
                ...extraUpdate,
            },
            { merge: true },
        );
    });

    await writeActivity(orderId, { action, from_status: from, to_status: to }, user);

    const updated = await findOrder(orderId);
    if (!updated) {
        throw new Error('Order not found after update.');
    }

    return updated;
}

export async function approveOrder(orderId: string, user: AuthenticatedUser, input: InvoiceApprovalInput): Promise<FirestoreRecord<OrderData>> {
    const result: { invoice: InvoiceData | null } = { invoice: null };
    const updated = await transitionOrderWithUpdate(orderId, 'approved', user, 'approved', (order) => {
        result.invoice = invoiceForApproval(order, user, input);
        return {
            invoice: result.invoice,
            terms: input.terms,
            terms_notes: input.terms === 'Other' ? input.terms_notes : '',
        };
    });

    if (!result.invoice) {
        throw new Error('Invoice was not created.');
    }

    await writeActivity(orderId, {
        action: 'invoice_created',
        from_status: 'approved',
        to_status: 'approved',
        invoice_id: result.invoice.id,
        invoice_total_cents: result.invoice.total_cents,
    }, user);

    return updated;
}

export async function rejectOrder(orderId: string, user: AuthenticatedUser): Promise<FirestoreRecord<OrderData>> {
    return transitionOrder(orderId, 'rejected', user, 'rejected');
}

export async function cancelOrder(orderId: string, user: AuthenticatedUser): Promise<FirestoreRecord<OrderData>> {
    return transitionAndVoidInvoiceWithoutPayments(orderId, 'cancelled', user, 'cancelled', 'Orders with invoice payments cannot be cancelled.');
}

export async function closeOrder(orderId: string, user: AuthenticatedUser): Promise<FirestoreRecord<OrderData>> {
    const orderRef = db.doc(`${ORDERS}/${orderId}`);
    let status: OrderStatus = 'pending';

    await db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(orderRef);
        if (!snapshot.exists) {
            throw new Error('Order not found.');
        }

        const orderData = snapshot.data() as OrderData;
        status = orderData.status;
        if ((orderData.state ?? 'open') === 'closed') {
            throw new Error('Order is already closed.');
        }

        if (!CLOSABLE_ORDER_STATUSES.has(status)) {
            throw new Error(`Order cannot be closed while ${status}.`);
        }

        transaction.set(orderRef, { state: 'closed', updated_at: now() }, { merge: true });
    });

    await writeActivity(orderId, { action: 'closed', from_status: status, to_status: status }, user);

    const updated = await findOrder(orderId);
    if (!updated) {
        throw new Error('Order not found after update.');
    }

    return updated;
}

export async function reopenOrder(orderId: string, user: AuthenticatedUser): Promise<FirestoreRecord<OrderData>> {
    const orderRef = db.doc(`${ORDERS}/${orderId}`);
    let status: OrderStatus = 'pending';

    await db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(orderRef);
        if (!snapshot.exists) {
            throw new Error('Order not found.');
        }

        const orderData = snapshot.data() as OrderData;
        status = orderData.status;
        if ((orderData.state ?? 'open') !== 'closed') {
            throw new Error('Order is already open.');
        }

        transaction.set(orderRef, { state: 'open', updated_at: now() }, { merge: true });
    });

    await writeActivity(orderId, { action: 'reopened', from_status: status, to_status: status }, user);

    const updated = await findOrder(orderId);
    if (!updated) {
        throw new Error('Order not found after update.');
    }

    return updated;
}

export async function deleteOrder(orderId: string): Promise<void> {
    const orderRef = db.doc(`${ORDERS}/${orderId}`);

    await db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(orderRef);
        if (!snapshot.exists) {
            throw new Error('Order not found.');
        }

        const orderData = snapshot.data() as OrderData;
        if (orderData.status !== 'cancelled') {
            throw new Error('Only cancelled orders can be deleted.');
        }

        transaction.delete(orderRef);
    });

    await db.recursiveDelete(orderRef);
}

export async function unapproveOrder(orderId: string, user: AuthenticatedUser): Promise<FirestoreRecord<OrderData>> {
    return transitionAndVoidInvoiceWithoutPayments(orderId, 'pending', user, 'unapproved', 'Orders with invoice payments cannot be moved back to pending.');
}

export async function deliverOrder(orderId: string, user: AuthenticatedUser, deliveredAtValue?: string): Promise<FirestoreRecord<OrderData>> {
    const deliveredAt = deliveredAtValue ? new Date(deliveredAtValue) : new Date();
    if (Number.isNaN(deliveredAt.getTime())) {
        throw new Error('Enter a valid delivery date.');
    }

    const delivered = await transitionOrderWithUpdate(orderId, 'delivered', user, 'delivered', (order) => {
        const invoice = invoiceFromOrder(order.data);
        return {
            delivered_at: deliveredAt,
            ...(invoice ? { invoice: applyDeliveryToInvoice(invoice, deliveredAt, order.data.terms) } : {}),
        };
    });
    return markPaidIfSettled(delivered, user);
}

export async function deliveryRejectOrder(orderId: string, user: AuthenticatedUser): Promise<FirestoreRecord<OrderData>> {
    return transitionAndVoidInvoiceWithoutPayments(orderId, 'delivery_rejected', user, 'delivery_rejected', 'Orders with invoice payments cannot be marked delivery rejected.');
}

export async function addPayment(orderId: string, paymentData: {
    amount: number;
    method: PaymentMethod;
    check_number: string;
    paid_at: string
}, user: AuthenticatedUser): Promise<FirestoreRecord<OrderData>> {
    const orderRef = db.doc(`${ORDERS}/${orderId}`);
    let orderStatus: OrderStatus = 'pending';
    const result: { payment: InvoicePayment | null; invoice: InvoiceData | null } = { payment: null, invoice: null };

    await db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(orderRef);
        if (!snapshot.exists) {
            throw new Error('Order not found.');
        }

        const orderData = snapshot.data() as OrderData;
        orderStatus = orderData.status;
        assertPaymentsEditable(orderData);
        const invoice = invoiceFromOrder(orderData);
        if (!invoice) {
            throw new Error('An active invoice is required before payments can be added.');
        }

        const amountCents = paymentData.amount;
        assertPaymentDoesNotOverpay(invoice, amountCents);

        if (paymentData.method === 'check' && !paymentData.check_number.trim()) {
            throw new Error('A check number is required for check payments.');
        }

        const payments = invoicePayments(invoice);
        result.payment = {
            id: nextPaymentId(payments),
            method: paymentData.method,
            method_label: PAYMENT_METHODS[paymentData.method],
            amount_cents: amountCents,
            paid_at: paymentData.paid_at,
            check_number: paymentData.method === 'check' ? paymentData.check_number.trim() : '',
            recorded_by: actorMap(user),
            created_at: new Date(),
        };

        result.invoice = recalculateInvoice({ ...invoice, payments: [...payments, result.payment] });
        transaction.set(
            orderRef,
            {
                invoice: result.invoice,
                updated_at: now(),
            },
            { merge: true },
        );
    });

    if (!result.payment || !result.invoice) {
        throw new Error('Payment was not saved.');
    }

    const paymentActivity = {
        action: paymentRecordedAction(result.invoice),
        from_status: orderStatus,
        to_status: orderStatus,
        payment_id: result.payment.id,
        payment_amount_cents: result.payment.amount_cents,
    };

    const updated = await findOrder(orderId);
    if (!updated) {
        throw new Error('Order not found after payment.');
    }

    if (paymentActivity.action === 'full_payment_recorded' && updated.data.status === 'delivered') {
        return markPaidIfSettled(updated, user, paymentActivity);
    }

    await writeActivity(orderId, paymentActivity, user);
    return updated;
}

export async function updatePayment(orderId: string, paymentId: string, paymentData: {
    amount: number;
    method: PaymentMethod;
    check_number: string;
    paid_at: string
}, user: AuthenticatedUser): Promise<FirestoreRecord<OrderData>> {
    const orderRef = db.doc(`${ORDERS}/${orderId}`);
    let orderStatus: OrderStatus = 'pending';
    let updatedInvoice: InvoiceData | null = null;
    let orderForReopen: FirestoreRecord<OrderData> | null = null;

    await db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(orderRef);
        if (!snapshot.exists) {
            throw new Error('Order not found.');
        }

        const orderData = snapshot.data() as OrderData;
        orderStatus = orderData.status;
        assertPaymentsEditable(orderData);
        orderForReopen = { id: orderId, data: orderData };
        const invoice = orderData.invoice;
        if (!invoice || invoice.status === 'void') {
            throw new Error('An active invoice is required before payments can be updated.');
        }

        const payments = invoicePayments(invoice);
        const existing = payments.find((row) => row.id === paymentId);
        if (!existing) {
            throw new Error('Payment not found.');
        }

        if (paymentData.method === 'check' && !paymentData.check_number.trim()) {
            throw new Error('A check number is required for check payments.');
        }

        assertPaymentDoesNotOverpay(invoice, paymentData.amount, paymentId);

        const updatedPayments = payments.map((row) =>
            row.id === paymentId
                ? {
                    ...row,
                    method: paymentData.method,
                    method_label: PAYMENT_METHODS[paymentData.method],
                    amount_cents: paymentData.amount,
                    paid_at: paymentData.paid_at,
                    check_number: paymentData.method === 'check' ? paymentData.check_number.trim() : '',
                    updated_by: actorMap(user),
                    updated_at: new Date(),
                }
                : row,
        );
        updatedInvoice = recalculateInvoice({ ...invoice, payments: updatedPayments });

        transaction.set(orderRef, { invoice: updatedInvoice, updated_at: now() }, { merge: true });
    });

    if (!updatedInvoice || !orderForReopen) {
        throw new Error('Payment was not updated.');
    }

    await writeActivity(orderId, {
        action: 'payment_updated',
        from_status: orderStatus,
        to_status: orderStatus,
        payment_id: paymentId,
        payment_amount_cents: paymentData.amount
    }, user);
    await reopenPaidIfBalanceDue(orderForReopen, updatedInvoice, user);

    const updated = await findOrder(orderId);
    if (!updated) {
        throw new Error('Order not found after payment update.');
    }

    return markPaidIfSettled(updated, user);
}

export async function deletePayment(orderId: string, paymentId: string, user: AuthenticatedUser): Promise<FirestoreRecord<OrderData>> {
    const orderRef = db.doc(`${ORDERS}/${orderId}`);
    let orderStatus: OrderStatus = 'pending';
    let paymentAmountCents = 0;
    let updatedInvoice: InvoiceData | null = null;
    let orderForReopen: FirestoreRecord<OrderData> | null = null;

    await db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(orderRef);
        if (!snapshot.exists) {
            throw new Error('Order not found.');
        }

        const orderData = snapshot.data() as OrderData;
        orderStatus = orderData.status;
        assertPaymentsEditable(orderData);
        orderForReopen = { id: orderId, data: orderData };
        const invoice = orderData.invoice;
        if (!invoice || invoice.status === 'void') {
            throw new Error('An active invoice is required before payments can be deleted.');
        }

        const payments = invoicePayments(invoice);
        const payment = payments.find((row) => row.id === paymentId);
        if (!payment) {
            throw new Error('Payment not found.');
        }

        paymentAmountCents = payment.amount_cents;
        updatedInvoice = recalculateInvoice({
            ...invoice,
            payments: payments.filter((row) => row.id !== paymentId),
        });

        transaction.set(orderRef, { invoice: updatedInvoice, updated_at: now() }, { merge: true });
    });

    if (!updatedInvoice || !orderForReopen) {
        throw new Error('Payment was not deleted.');
    }

    await writeActivity(orderId, {
        action: 'payment_deleted',
        from_status: orderStatus,
        to_status: orderStatus,
        payment_id: paymentId,
        payment_amount_cents: paymentAmountCents
    }, user);
    await reopenPaidIfBalanceDue(orderForReopen, updatedInvoice, user);

    const updated = await findOrder(orderId);
    if (!updated) {
        throw new Error('Order not found after payment delete.');
    }

    return updated;
}

export async function updateInvoiceDiscount(orderId: string, input: {
    type: 'percent' | 'amount' | null;
    value: number
}, user: AuthenticatedUser): Promise<FirestoreRecord<OrderData>> {
    const orderRef = db.doc(`${ORDERS}/${orderId}`);
    let orderStatus: OrderStatus = 'pending';
    let discountRecord: InvoiceData['discount'] = null;
    let invoiceTotalCents = 0;

    await db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(orderRef);
        if (!snapshot.exists) {
            throw new Error('Order not found.');
        }

        const orderData = snapshot.data() as OrderData;
        orderStatus = orderData.status;
        if (orderStatus !== 'approved' && orderStatus !== 'delivered') {
            throw new Error('Discounts can only be applied while an order is approved or delivered.');
        }

        const invoice = invoiceFromOrder(orderData);
        if (!invoice) {
            throw new Error('An active invoice is required to apply a discount.');
        }
        assertInvoiceHasNoPayments(invoice, 'Discounts cannot be changed once payments have been recorded.');

        const discountCents = input.type ? discountCentsFor(input.type, input.value, invoice.subtotal_cents) : 0;
        assertDiscountWithinSubtotal(discountCents, invoice.subtotal_cents);

        discountRecord = input.type
            ? {
                type: input.type,
                value: input.value,
                cents: discountCents,
                applied_by: actorMap(user),
                applied_at: now()
            }
            : null;

        const updatedInvoice = applyDiscountToInvoice(invoice, discountRecord, now());
        invoiceTotalCents = updatedInvoice.total_cents;

        transaction.set(orderRef, { invoice: updatedInvoice, updated_at: now() }, { merge: true });
    });

    await writeActivity(orderId, {
        action: discountRecord ? 'discount_applied' : 'discount_removed',
        from_status: orderStatus,
        to_status: orderStatus,
        invoice_total_cents: invoiceTotalCents,
        ...(discountRecord ? { discount_cents: (discountRecord as { cents: number }).cents } : {}),
    }, user);

    const updated = await findOrder(orderId);
    if (!updated) {
        throw new Error('Order not found after discount update.');
    }

    return markPaidIfSettled(updated, user);
}

function assertPaymentsEditable(orderData: OrderData): void {
    if ((orderData.state ?? 'open') === 'closed') {
        throw new Error('Payments cannot be changed after an order is closed.');
    }
}

function assertItemsEditable(order: FirestoreRecord<OrderData>): void {
    if (order.data.status !== 'pending') {
        throw new Error('Packages can only be changed while an order is pending.');
    }
}

export async function addPackages(orderId: string, packageTags: string[], packagePrices: Record<string, number>, user: AuthenticatedUser): Promise<FirestoreRecord<OrderData>> {
    const orderRef = db.doc(`${ORDERS}/${orderId}`);
    let addedTags: string[] = [];

    await db.runTransaction(async (transaction) => {
        const orderSnapshot = await transaction.get(orderRef);
        if (!orderSnapshot.exists) {
            throw new Error('Order not found.');
        }

        const orderData = orderSnapshot.data() as OrderData;
        const order = { id: orderId, data: orderData } satisfies FirestoreRecord<OrderData>;
        assertItemsEditable(order);

        const tags = normalizeTags(packageTags).filter((tag) => !orderData.items.some((item) => item.package_tag === tag));
        if (tags.length === 0) {
            throw new Error('Choose at least one new package.');
        }
        addedTags = tags;

        const orderCollectionSnapshot = await transaction.get(db.collection(ORDERS));
        const statuses = buildPackageStatusMap(orderCollectionSnapshot.docs.map((doc) => ({
            id: doc.id,
            data: doc.data() as OrderData
        })));
        const sourcePrices = new Map(orderData.items.map((item) => [item.source_package_key, {
            priceCents: item.price_cents,
            quantity: Number(item.quantity ?? 0)
        }]));
        const newItems: OrderItem[] = [];

        for (const tag of tags) {
            const packageRef = db.doc(`packages/${docIdFromTag(tag)}`);
            const packageSnapshot = await transaction.get(packageRef);
            if (!packageSnapshot.exists) {
                throw new Error(`Package ${tag} is not in active inventory.`);
            }

            const packageData = packageSnapshot.data() as PackageData;
            if (!packageData.active || packageData.package_tag !== tag) {
                throw new Error(`Package ${tag} is not in active inventory.`);
            }

            const statusInfo = statuses[packageData.package_tag];
            if (statusInfo && statusInfo.order_id !== order.id && statusInfo.status !== 'available') {
                throw new Error(`Package ${tag} is already reserved on another order.`);
            }

            const priceCents = priceCentsForTag(packagePrices, tag);
            assertSameSourcePrice(sourcePrices, packageData, priceCents);
            newItems.push(itemSnapshot({ id: packageRef.id, data: packageData }, priceCents));
        }

        const items = [...orderData.items, ...newItems];
        transaction.set(
            orderRef,
            {
                items,
                total_cents: orderTotalCents({ items }),
                updated_at: now(),
            },
            { merge: true },
        );
    });

    await writeActivity(orderId, {
        action: 'packages_added',
        from_status: 'pending',
        to_status: 'pending',
        packages: addedTags
    }, user);

    const updated = await findOrder(orderId);
    if (!updated) {
        throw new Error('Order not found after package update.');
    }

    return updated;
}

export async function updatePackages(orderId: string, packageTags: string[], packagePrices: Record<string, number>, user: AuthenticatedUser): Promise<FirestoreRecord<OrderData>> {
    const orderRef = db.doc(`${ORDERS}/${orderId}`);
    const tags = normalizeTags(packageTags);
    let addedTags: string[] = [];
    let removedTags: string[] = [];
    let pricesChanged = false;
    let didUpdate = false;

    if (tags.length === 0) {
        throw new Error('Choose at least one package.');
    }

    await db.runTransaction(async (transaction) => {
        const orderSnapshot = await transaction.get(orderRef);
        if (!orderSnapshot.exists) {
            throw new Error('Order not found.');
        }

        const orderData = orderSnapshot.data() as OrderData;
        const order = { id: orderId, data: orderData } satisfies FirestoreRecord<OrderData>;
        assertItemsEditable(order);

        const selectedSet = new Set(tags);
        const currentItemsByTag = new Map(orderData.items.map((item) => [item.package_tag, item]));
        const currentTagSet = new Set(currentItemsByTag.keys());
        addedTags = tags.filter((tag) => !currentTagSet.has(tag));
        removedTags = orderData.items.map((item) => item.package_tag).filter((tag) => !selectedSet.has(tag));

        const orderCollectionSnapshot = addedTags.length > 0 ? await transaction.get(db.collection(ORDERS)) : null;
        const statuses: ReturnType<typeof buildPackageStatusMap> = orderCollectionSnapshot ? buildPackageStatusMap(orderCollectionSnapshot.docs.map((doc) => ({
            id: doc.id,
            data: doc.data() as OrderData
        }))) : {};
        const sourcePrices = new Map<string, SourcePriceRecord>();
        const items: OrderItem[] = [];
        let transactionPricesChanged = false;

        for (const tag of tags) {
            const existingItem = currentItemsByTag.get(tag);
            const priceCents = priceCentsForTag(packagePrices, tag);

            if (existingItem) {
                assertSameSourcePrice(sourcePrices, existingItem, priceCents);
                transactionPricesChanged ||= existingItem.price_cents !== priceCents;
                items.push({ ...existingItem, price_cents: priceCents });
                continue;
            }

            const packageRef = db.doc(`packages/${docIdFromTag(tag)}`);
            const packageSnapshot = await transaction.get(packageRef);
            if (!packageSnapshot.exists) {
                throw new Error(`Package ${tag} is not in active inventory.`);
            }

            const packageData = packageSnapshot.data() as PackageData;
            if (!packageData.active || packageData.package_tag !== tag) {
                throw new Error(`Package ${tag} is not in active inventory.`);
            }

            const statusInfo = statuses[packageData.package_tag];
            if (statusInfo && statusInfo.order_id !== order.id && statusInfo.status !== 'available') {
                throw new Error(`Package ${tag} is already reserved on another order.`);
            }

            assertSameSourcePrice(sourcePrices, packageData, priceCents);
            items.push(itemSnapshot({ id: packageRef.id, data: packageData }, priceCents));
        }

        pricesChanged = transactionPricesChanged;
        didUpdate = addedTags.length > 0 || removedTags.length > 0 || pricesChanged;
        if (!didUpdate) {
            return;
        }

        transaction.set(
            orderRef,
            {
                items,
                total_cents: orderTotalCents({ items }),
                updated_at: now(),
            },
            { merge: true },
        );
    });

    if (addedTags.length > 0) {
        await writeActivity(orderId, {
            action: 'packages_added',
            from_status: 'pending',
            to_status: 'pending',
            packages: addedTags
        }, user);
    }

    if (removedTags.length > 0) {
        await writeActivity(orderId, {
            action: 'packages_removed',
            from_status: 'pending',
            to_status: 'pending',
            packages: removedTags
        }, user);
    }

    if (addedTags.length === 0 && removedTags.length === 0 && pricesChanged) {
        await writeActivity(orderId, {
            action: 'packages_updated',
            from_status: 'pending',
            to_status: 'pending',
            packages: tags
        }, user);
    }

    const updated = await findOrder(orderId);
    if (!updated) {
        throw new Error('Order not found after package update.');
    }

    return updated;
}

export async function removePackages(orderId: string, packageTags: string[], user: AuthenticatedUser): Promise<FirestoreRecord<OrderData>> {
    const orderRef = db.doc(`${ORDERS}/${orderId}`);
    const removeSet = new Set(normalizeTags(packageTags));

    await db.runTransaction(async (transaction) => {
        const orderSnapshot = await transaction.get(orderRef);
        if (!orderSnapshot.exists) {
            throw new Error('Order not found.');
        }

        const orderData = orderSnapshot.data() as OrderData;
        const order = { id: orderId, data: orderData } satisfies FirestoreRecord<OrderData>;
        assertItemsEditable(order);

        const items = orderData.items.filter((item) => !removeSet.has(item.package_tag));
        if (items.length === orderData.items.length) {
            throw new Error('Choose at least one package to remove.');
        }

        if (items.length === 0) {
            throw new Error('An order must keep at least one package.');
        }

        transaction.set(
            orderRef,
            {
                items,
                total_cents: orderTotalCents({ items }),
                updated_at: now(),
            },
            { merge: true },
        );
    });

    await writeActivity(orderId, {
        action: 'packages_removed',
        from_status: 'pending',
        to_status: 'pending',
        packages: [...removeSet]
    }, user);

    const updated = await findOrder(orderId);
    if (!updated) {
        throw new Error('Order not found after package update.');
    }

    return updated;
}

export function packagesReleasedByStatus(status: OrderStatus): boolean {
    return RELEASING_ORDER_STATUSES.has(status);
}

export async function ensureInvoicePdf(orderId: string): Promise<string> {
    const order = await findOrder(orderId);
    if (!order || !order.data.invoice || order.data.invoice.status === 'void') {
        throw new Error('Order not found or invoice is void');
    }

    const invoice = order.data.invoice;
    const salespersonProfile = await getUserProfile(order.data.salesperson.uid);
    const updatedAt = Math.max(
        millis(order.data.updated_at),
        salespersonProfile?.data.updated_at ? millis(salespersonProfile.data.updated_at) : 0,
    );
    const pdfGeneratedAt = invoice.pdf_generated_at ? millis(invoice.pdf_generated_at) : 0;

    const bucket = adminStorage.bucket();

    if (invoice.pdf_path && invoice.pdf_template_version === INVOICE_PDF_TEMPLATE_VERSION && pdfGeneratedAt >= updatedAt) {
        const file = bucket.file(invoice.pdf_path);
        const [exists] = await file.exists();
        if (exists) {
            const [url] = await file.getSignedUrl({
                action: 'read',
                expires: Date.now() + 1000 * 60 * 60,
            });
            return url;
        }
    }

    const buffer = await generateInvoicePdf(orderId);

    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const pdfPath = `invoices/${year}/${month}/${day}/order-${order.data.order_number}-${invoice.invoice_number}.pdf`;

    const file = bucket.file(pdfPath);
    await file.save(buffer, {
        contentType: 'application/pdf',
        metadata: {
            metadata: {
                order_id: orderId,
                invoice_number: invoice.invoice_number,
            },
        },
    });

    const [url] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + 1000 * 60 * 60,
    });

    const generatedAt = now();

    await db.doc(`${ORDERS}/${orderId}`).set(
        {
            invoice: {
                pdf_path: pdfPath,
                pdf_generated_at: generatedAt,
                pdf_template_version: INVOICE_PDF_TEMPLATE_VERSION,
            },
            updated_at: generatedAt,
        },
        { merge: true },
    );

    return url;
}
