import 'server-only';

import { Document, Font, Page, Text, View, StyleSheet, Image as PdfImage, renderToBuffer } from '@react-pdf/renderer';
import path from 'path';
import { findOrder } from './orders';
import { findCompany } from './crm';
import { getUserProfile } from './profiles';
import { listProducts } from './sales-settings';
import { compactNumber, formatDate, formatMoney } from '../domain/format';
import type { OrderItem } from '../domain/types';

Font.register({
    family: 'Jost',
    fonts: [
        { src: 'https://fonts.gstatic.com/s/jost/v20/92zPtBhPNqw79Ij1E865zBUv7myjJQVG.ttf', fontWeight: 400 },
        { src: 'https://fonts.gstatic.com/s/jost/v20/92zPtBhPNqw79Ij1E865zBUv7myRJQVG.ttf', fontWeight: 500 },
        { src: 'https://fonts.gstatic.com/s/jost/v20/92zPtBhPNqw79Ij1E865zBUv7mx9IgVG.ttf', fontWeight: 600 },
        { src: 'https://fonts.gstatic.com/s/jost/v20/92zPtBhPNqw79Ij1E865zBUv7mxEIgVG.ttf', fontWeight: 700 },
    ],
});

const colors = {
    zinc950: '#09090b',
    zinc700: '#3f3f46',
    zinc500: '#71717a',
    zinc400: '#a1a1aa',
    zinc300: '#d4d4d8',
    zinc200: '#e4e4e7',
    white: '#ffffff',
};

const styles = StyleSheet.create({
    page: {
        padding: 40,
        backgroundColor: colors.white,
        fontFamily: 'Jost',
        fontSize: 9,
        color: colors.zinc950,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderBottomWidth: 1,
        borderBottomColor: colors.zinc200,
        paddingBottom: 20,
        marginBottom: 20,
    },
    headerLeft: {
        width: '33%',
    },
    companyName: {
        fontSize: 12,
        fontWeight: 'bold',
        lineHeight: 1.1,
        marginBottom: 5,
    },
    headerText: {
        color: colors.zinc700,
        lineHeight: 0.95,
    },
    companyDetailsText: {
        color: colors.zinc700,
        lineHeight: 0.8,
    },
    billToDetailsText: {
        color: colors.zinc700,
        lineHeight: 0.8,
    },
    logoContainer: {
        width: '33%',
        alignItems: 'center',
    },
    logo: {
        width: 120,
    },
    headerRight: {
        width: '33%',
        alignItems: 'flex-end',
        transform: 'translateY(-8px)',
    },
    invoiceTitle: {
        width: '100%',
        fontSize: 32,
        fontWeight: 'bold',
        lineHeight: 1,
        textAlign: 'right',
        textTransform: 'uppercase',
        letterSpacing: 4,
        marginRight: -4,
        marginBottom: 2,
    },
    invoiceNumber: {
        width: '100%',
        fontSize: 14,
        lineHeight: 1.1,
        textAlign: 'right',
        color: colors.zinc700,
    },
    section: {
        flexDirection: 'row',
        marginBottom: 20,
    },
    sectionColumn: {
        width: '50%',
    },
    sectionTitle: {
        fontSize: 8,
        fontWeight: 'bold',
        lineHeight: 1.1,
        textTransform: 'uppercase',
        letterSpacing: 2,
        color: colors.zinc500,
        marginBottom: 4,
    },
    billToName: {
        fontSize: 10,
        fontWeight: 'bold',
        lineHeight: 1,
        marginBottom: 5,
    },
    detailLine: {
        flexDirection: 'row',
        marginBottom: 2,
    },
    detailLabel: {
        fontWeight: 'bold',
        color: colors.zinc500,
        marginRight: 4,
    },
    detailValue: {
        color: colors.zinc700,
    },
    table: {
        marginTop: 10,
    },
    tableHeader: {
        flexDirection: 'row',
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderTopColor: colors.zinc300,
        borderBottomColor: colors.zinc300,
        paddingVertical: 8,
    },
    tableHeaderCell: {
        fontSize: 8,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 2,
        color: colors.zinc500,
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: colors.zinc200,
        paddingVertical: 10,
        alignItems: 'flex-start',
    },
    colItem: { width: '40%' },
    colCases: { width: '15%', textAlign: 'right' },
    colQty: { width: '15%', textAlign: 'right' },
    colPrice: { width: '15%', textAlign: 'right' },
    colSubtotal: { width: '15%', textAlign: 'right' },
    productName: {
        fontWeight: 'bold',
        fontSize: 10,
    },
    strainText: {
        marginTop: 2,
        fontSize: 8,
        color: colors.zinc500,
    },
    tagsText: {
        marginTop: 2,
        fontSize: 7,
        color: colors.zinc400,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    totalsContainer: {
        marginTop: 20,
        alignItems: 'flex-end',
    },
    totalsWrapper: {
        width: 200,
    },
    totalLine: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    totalLabel: {
        color: colors.zinc700,
    },
    totalValue: {
        textAlign: 'right',
    },
    totalLineStrong: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: colors.zinc950,
        paddingVertical: 8,
        marginTop: 4,
        marginBottom: 8,
    },
    totalLabelStrong: {
        fontWeight: 'bold',
        fontSize: 12,
    },
    totalValueStrong: {
        fontWeight: 'bold',
        fontSize: 12,
        textAlign: 'right',
    },
    paymentHistory: {
        marginTop: 10,
    },
    paymentTitle: {
        fontSize: 8,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 2,
        color: colors.zinc500,
        marginBottom: 6,
    },
    paymentRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    paymentText: {
        fontSize: 8,
        color: colors.zinc700,
    },
});

type PackageGroup = {
    key: string;
    productName: string;
    caseCount: number;
    quantity: number;
    unitOfMeasure: string;
    subtotalCents: number;
    packageTags: string[];
    strains: string[];
};

type MutablePackageGroup = Omit<PackageGroup, 'strains' | 'unitOfMeasure'> & {
    strainSet: Set<string>;
    unitSet: Set<string>;
};

function groupOrderItemsByProduct(items: OrderItem[], productNames: Map<string, string>): PackageGroup[] {
    const groups = new Map<string, MutablePackageGroup>();

    for (const item of items) {
        const productName = (item.product_id ? productNames.get(item.product_id) : '') || item.item || 'Unknown Product';
        const key = item.product_id ? `product:${item.product_id}` : `item:${productName.trim().toLowerCase()}`;
        let group = groups.get(key);

        if (!group) {
            group = {
                key,
                productName,
                caseCount: 0,
                quantity: 0,
                subtotalCents: 0,
                packageTags: [],
                strainSet: new Set<string>(),
                unitSet: new Set<string>(),
            };
            groups.set(key, group);
        }

        const unitOfMeasure = item.unit_of_measure || '';
        group.caseCount += 1;
        group.quantity += Number(item.quantity ?? 0);
        group.subtotalCents += Number(item.price_cents ?? 0);
        group.packageTags.push(item.package_tag);

        if (item.strain) {
            group.strainSet.add(item.strain);
        }

        if (unitOfMeasure) {
            group.unitSet.add(unitOfMeasure);
        }
    }

    return Array.from(groups.values()).map((group) => {
        const units = Array.from(group.unitSet);
        return {
            key: group.key,
            productName: group.productName,
            caseCount: group.caseCount,
            quantity: group.quantity,
            unitOfMeasure: units.length > 1 ? 'mixed units' : units[0] ?? '',
            subtotalCents: group.subtotalCents,
            packageTags: group.packageTags,
            strains: Array.from(group.strainSet).sort((a, b) => a.localeCompare(b)),
        };
    });
}

function formatQuantity(quantity: number, unitOfMeasure: string): string {
    const quantityLabel = compactNumber(quantity);
    if (!unitOfMeasure) return quantityLabel;
    if (unitOfMeasure === 'ea') return `${quantityLabel} ${quantity === 1 ? 'unit' : 'units'}`;
    return `${quantityLabel} ${unitOfMeasure}`;
}

function formatPackageTags(packageTags: string[]): string {
    return packageTags.map((tag) => tag.trim().replace(/,+$/u, '')).filter(Boolean).join(' ');
}

export async function generateInvoicePdf(orderId: string): Promise<Buffer> {
    const [order, products] = await Promise.all([findOrder(orderId), listProducts()]);
    if (!order || !order.data.invoice || order.data.invoice.status === 'void') {
        throw new Error('Order not found or invoice is void');
    }

    const [company, salespersonProfile] = await Promise.all([
        findCompany(order.data.company_id),
        getUserProfile(order.data.salesperson.uid),
    ]);

    const salespersonName = salespersonProfile?.data.display_name?.trim() || order.data.salesperson.name;
    const productNames = new Map(products.map((product) => [product.id, product.data.name]));
    const packageGroups = groupOrderItemsByProduct(order.data.items, productNames);
    const invoice = order.data.invoice;
    const orderTermsLabel = order.data.terms === 'Other' && order.data.terms_notes ? order.data.terms_notes : order.data.terms;
    const invoiceDiscountLabel = invoice.discount ? `${formatMoney(invoice.discount.cents)} (${invoice.discount.type === 'percent' ? `${invoice.discount.value}% off` : `${formatMoney(invoice.discount.value)} off`})` : null;
    const customerAddress = company?.data.address;

    const logoPath = path.join(process.cwd(), 'public/grc-logo.png');
    const companyDetails = ['95 Dorothy St. STE 2', 'Buffalo, NY 14206', '716-201-0234', 'OCM-MICR-24-000120'].join('\n');
    const billToDetails = [
        customerAddress?.street,
        customerAddress ? `${[customerAddress.city, customerAddress.state].filter(Boolean).join(', ')} ${customerAddress.postal_code}`.trim() : '',
        company?.data.license_number ? company.data.license_number : '',
    ].filter(Boolean).join('\n');

    const MyDocument = (
        <Document title={`Invoice ${invoice.invoice_number}`}>
            <Page size="A4" style={styles.page}>
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <Text style={styles.companyName}>Green Room Cannabis LLC</Text>
                        <Text style={styles.companyDetailsText}>{companyDetails}</Text>
                    </View>
                    <View style={styles.logoContainer}>
                        <PdfImage src={logoPath} style={styles.logo} />
                    </View>
                    <View style={styles.headerRight}>
                        <Text style={styles.invoiceTitle}>Invoice</Text>
                        <Text style={styles.invoiceNumber}>{invoice.invoice_number}</Text>
                    </View>
                </View>

                <View style={styles.section}>
                    <View style={styles.sectionColumn}>
                        <Text style={styles.sectionTitle}>Bill To</Text>
                        <Text style={styles.billToName}>{order.data.company_name}</Text>
                        {billToDetails ? <Text style={styles.billToDetailsText}>{billToDetails}</Text> : null}
                    </View>
                    <View style={styles.sectionColumn}>
                        <Text style={styles.sectionTitle}>Order Details</Text>
                        <View style={styles.detailLine}>
                            <Text style={styles.detailLabel}>Salesperson:</Text>
                            <Text style={styles.detailValue}>{salespersonName}</Text>
                        </View>
                        <View style={styles.detailLine}>
                            <Text style={styles.detailLabel}>Terms:</Text>
                            <Text style={styles.detailValue}>{orderTermsLabel}</Text>
                        </View>
                        <View style={styles.detailLine}>
                            <Text style={styles.detailLabel}>Delivery Date:</Text>
                            <Text style={styles.detailValue}>{order.data.delivery_date_tbd ? 'TBD' : formatDate(order.data.delivery_date)}</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.table}>
                    <View style={styles.tableHeader}>
                        <Text style={[styles.tableHeaderCell, styles.colItem]}>Line Item</Text>
                        <Text style={[styles.tableHeaderCell, styles.colCases]}>Cases</Text>
                        <Text style={[styles.tableHeaderCell, styles.colQty]}>Quantity</Text>
                        <Text style={[styles.tableHeaderCell, styles.colPrice]}>Unit Price</Text>
                        <Text style={[styles.tableHeaderCell, styles.colSubtotal]}>Subtotal</Text>
                    </View>
                    {packageGroups.map((group) => (
                        <View key={group.key} style={styles.tableRow} wrap={false}>
                            <View style={styles.colItem}>
                                <Text style={styles.productName}>{group.productName}</Text>
                                <Text style={styles.strainText}>{group.strains.length > 0 ? group.strains.join(', ') : 'No strain'}</Text>
                                <Text style={styles.tagsText}>{formatPackageTags(group.packageTags)}</Text>
                            </View>
                            <Text style={styles.colCases}>{group.caseCount} {group.caseCount === 1 ? 'case' : 'cases'}</Text>
                            <Text style={styles.colQty}>{formatQuantity(group.quantity, group.unitOfMeasure)}</Text>
                            <Text style={styles.colPrice}>{formatMoney(group.quantity > 0 ? Math.round(group.subtotalCents / group.quantity) : 0)}</Text>
                            <Text style={[styles.colSubtotal, { fontWeight: 'bold' }]}>{formatMoney(group.subtotalCents)}</Text>
                        </View>
                    ))}
                </View>

                <View style={styles.totalsContainer}>
                    <View style={styles.totalsWrapper}>
                        <View style={styles.totalLine}>
                            <Text style={styles.totalLabel}>Subtotal</Text>
                            <Text style={styles.totalValue}>{formatMoney(invoice.subtotal_cents)}</Text>
                        </View>
                        {invoiceDiscountLabel ? (
                            <View style={styles.totalLine}>
                                <Text style={styles.totalLabel}>Discount</Text>
                                <Text style={styles.totalValue}>-{invoiceDiscountLabel}</Text>
                            </View>
                        ) : null}
                        <View style={styles.totalLine}>
                            <Text style={styles.totalLabel}>Tax</Text>
                            <Text style={styles.totalValue}>{formatMoney(0)}</Text>
                        </View>
                        <View style={styles.totalLineStrong}>
                            <Text style={styles.totalLabelStrong}>Total</Text>
                            <Text style={styles.totalValueStrong}>{formatMoney(invoice.total_cents)}</Text>
                        </View>
                        {invoice.paid_cents > 0 ? (
                            <View style={styles.paymentHistory}>
                                <Text style={styles.paymentTitle}>Payment History</Text>
                                {invoice.payments.map((payment) => (
                                    <View key={payment.id} style={styles.paymentRow}>
                                        <Text style={styles.paymentText}>
                                            {formatDate(payment.paid_at)} — {payment.method_label}
                                            {payment.check_number ? ` #${payment.check_number}` : ''}
                                        </Text>
                                        <Text style={styles.paymentText}>{formatMoney(payment.amount_cents)}</Text>
                                    </View>
                                ))}
                                <View style={[styles.totalLineStrong, { marginTop: 10 }]}>
                                    <Text style={styles.totalLabelStrong}>Balance Due</Text>
                                    <Text style={styles.totalValueStrong}>{formatMoney(invoice.balance_cents)}</Text>
                                </View>
                            </View>
                        ) : null}
                    </View>
                </View>
            </Page>
        </Document>
    );

    return await renderToBuffer(MyDocument);
}
