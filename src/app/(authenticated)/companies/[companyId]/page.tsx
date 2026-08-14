import { ChatBubbleLeftRightIcon, DocumentTextIcon, EnvelopeIcon, PhoneIcon } from '@heroicons/react/20/solid';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    FacebookIcon,
    InstagramIcon,
    socialHandleFromValue,
    ThreadsIcon,
    XIcon
} from '@/components/company/company-form';
import { CompanyTabs } from '@/components/company/company-tabs';
import { FacilityBadge } from '@/components/company/facility-badge';
import { EditCompanyDialog } from '../new-company-dialog';
import { listContacts } from '@/lib/data/crm';
import { listOrdersForCompany } from '@/lib/data/orders';
import { loadCompanyRoute } from './company-route';
import { formatCompanySubheading, formatMoney } from '@/lib/domain/format';

export default async function CompanyDetailsPage({ params }: {
    params: Promise<{ companyId: string }>
}): Promise<React.ReactElement> {
    const { companyId: routeSegment } = await params;
    const { company, companyId, companySlug } = await loadCompanyRoute(routeSegment);
    const [contacts, orders] = await Promise.all([listContacts(companyId), listOrdersForCompany(companyId)]);

    const primary = contacts.find((contact) => contact.id === company.data.primary_contact_id);
    const openInvoices = orders.flatMap((order) => {
        const invoice = order.data.invoice;
        const balance = Number(invoice?.balance_cents ?? 0);
        return invoice && invoice.status !== 'void' && balance > 0 ? [{ orderId: order.id, invoice }] : [];
    });
    const balanceCents = openInvoices.reduce((total, { invoice }) => total + Number(invoice.balance_cents ?? 0), 0);
    const primaryEmail = primary?.data.email.trim() ?? '';
    const primaryPhone = primary?.data.phone.trim() ?? '';
    const location = [company.data.address.city, company.data.address.state].filter(Boolean).join(', ');
    const address = [company.data.address.street, location, company.data.address.postal_code].filter(Boolean).join(', ');
    const socialLinks = company.data.social_links ?? { facebook: '', instagram: '', x: '', threads: '' };
    const companyFormValues = {
        company_name: company.data.company_name,
        license_number: company.data.license_number,
        facility_type: company.data.facility_type,
        address: {
            street: company.data.address.street,
            city: company.data.address.city,
            state: company.data.address.state,
            postal_code: company.data.address.postal_code,
        },
        website_url: company.data.website_url,
        social_links: {
            facebook: socialLinks.facebook ?? '',
            instagram: socialLinks.instagram ?? '',
            x: socialLinks.x ?? '',
            threads: socialLinks.threads ?? '',
        },
    };

    return (
        <div>
            <PageHeader
                title={company.data.company_name}
                description={formatCompanySubheading(company.data)}
            >
                <FacilityBadge facilityType={company.data.facility_type} />
            </PageHeader>
            <CompanyTabs companySlug={companySlug} active='details' />

            <div className='grid gap-6 xl:grid-cols-[1.2fr_0.8fr]'>
                <Card>
                    <CardHeader>
                        <div className='flex items-start justify-between gap-4'>
                            <CardTitle>Company Details</CardTitle>
                            <EditCompanyDialog companyId={companyId} company={companyFormValues} />
                        </div>
                    </CardHeader>
                    <CardContent className='p-0'>
                        <dl className='divide-y divide-zinc-950/5 dark:divide-white/10'>
                            <DetailItem label='Company name' value={company.data.company_name} />
                            <DetailItem label='Facility type' value={company.data.facility_type} />
                            <DetailItem label='License number' value={company.data.license_number} />
                            <DetailItem label='Website' value={company.data.website_url} href={isHttpUrl(company.data.website_url) ? company.data.website_url : undefined} />
                            <DetailItem label='Address' value={address} />
                            <SocialDetailsGrid
                                items={[
                                    {
                                        label: 'Facebook',
                                        handle: socialHandleFromValue(socialLinks.facebook, ['facebook.com', 'fb.com']),
                                        href: socialProfileUrl(socialLinks.facebook, 'https://www.facebook.com/'),
                                        Icon: FacebookIcon
                                    },
                                    {
                                        label: 'Instagram',
                                        handle: socialHandleFromValue(socialLinks.instagram, ['instagram.com']),
                                        href: socialProfileUrl(socialLinks.instagram, 'https://www.instagram.com/'),
                                        Icon: InstagramIcon
                                    },
                                    {
                                        label: 'X',
                                        handle: socialHandleFromValue(socialLinks.x, ['x.com', 'twitter.com']),
                                        href: socialProfileUrl(socialLinks.x, 'https://x.com/'),
                                        Icon: XIcon
                                    },
                                    {
                                        label: 'Threads',
                                        handle: socialHandleFromValue(socialLinks.threads, ['threads.net']),
                                        href: socialProfileUrl(socialLinks.threads, 'https://www.threads.net/@'),
                                        Icon: ThreadsIcon
                                    },
                                ]}
                            />
                        </dl>
                    </CardContent>
                </Card>

                <div className='space-y-6'>
                    <Card className='overflow-hidden'>
                        <dl className='flex flex-wrap pb-5'>
                            <div className='flex-auto px-5 pt-5'>
                                <dt className='text-base/7 font-medium text-zinc-950 sm:text-sm/6 dark:text-zinc-500 uppercase'>Balance</dt>
                                <dd className='mt-1 text-2xl/7 font-semibold text-zinc-950 dark:text-white'>{formatMoney(balanceCents)}</dd>
                            </div>
                            {openInvoices.length > 0 ? openInvoices.map(({ orderId, invoice }, index) => (
                                <SummaryRow key={orderId} label={invoice.invoice_number} icon={
                                    <DocumentTextIcon className='size-5 text-zinc-400 dark:text-zinc-500' aria-hidden='true' />} withBorder={index === 0}>
                                    <div className='flex min-w-0 items-center justify-between gap-3'>
                                        <Link href={`/sales/${orderId}`} className='truncate font-medium text-purple-700 hover:text-purple-900 dark:text-purple-300 dark:hover:text-purple-200'>{invoice.invoice_number}</Link>
                                        <span className='shrink-0 font-semibold text-zinc-950 dark:text-white'>{formatMoney(invoice.balance_cents)}</span>
                                    </div>
                                </SummaryRow>
                            )) : (
                                <SummaryRow label='Open invoices' icon={
                                    <DocumentTextIcon className='mt-0.5 size-5 text-zinc-400 dark:text-zinc-500' aria-hidden='true' />} withBorder>
                                    <span className='text-zinc-500 font-medium uppercase dark:text-zinc-400'>No open invoices</span>
                                </SummaryRow>
                            )}
                        </dl>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Primary Contact</CardTitle>
                        </CardHeader>
                        <CardContent className='pt-0'>
                            {primary ? (
                                <div className='rounded-xl bg-zinc-50/80 p-4 dark:bg-zinc-900'>
                                    <div className='min-w-0'>
                                        <div className='flex items-center justify-between gap-3'>
                                            <p className='truncate text-xl/7 font-semibold text-zinc-950 dark:text-white'>{primary.data.name}</p>
                                            <div className='inline-flex max-w-full shrink-0 items-center gap-1.5 rounded-md bg-white px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-600 shadow-xs dark:bg-white/5 dark:text-zinc-400'>
                                                <ChatBubbleLeftRightIcon className='size-4 shrink-0 text-purple-500 dark:text-purple-500/85' aria-hidden='true' />
                                                <span className='truncate'>Prefers {primary.data.preferred_communication}</span>
                                            </div>
                                        </div>
                                        <p className='mt-0.5 text-sm/6 font-medium text-zinc-500 dark:text-zinc-400 uppercase'>{primary.data.title || 'No title'}</p>
                                    </div>
                                    <div className='flex flex-col gap-3 mt-4'>
                                        {primaryEmail ? (
                                            <PrimaryContactMethod
                                                label='Email'
                                                value={primaryEmail}
                                                href={mailtoHref(primaryEmail)}
                                                icon={<EnvelopeIcon className='size-4' aria-hidden='true' />}
                                            />
                                        ) : null}
                                        {primaryPhone ? (
                                            <PrimaryContactMethod
                                                label='Phone'
                                                value={primaryPhone}
                                                href={telHref(primaryPhone)}
                                                icon={<PhoneIcon className='size-4' aria-hidden='true' />}
                                            />
                                        ) : null}
                                        {!primaryEmail && !primaryPhone ? (
                                            <div className='rounded-xl bg-zinc-950/40 p-2.5 text-sm/6 font-semibold uppercase text-center text-zinc-500 dark:text-zinc-400'>No contact details</div>
                                        ) : null}
                                    </div>
                                </div>
                            ) : (
                                <div className='rounded-lg bg-zinc-50 px-4 py-6 text-center dark:bg-white/[0.03]'>
                                    <p className='text-sm/6 font-bold text-zinc-600 dark:text-zinc-400 uppercase'>No contacts yet</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                </div>
            </div>
        </div>
    );
}

function SummaryRow({ label, icon, children, withBorder = false }: {
    label: string;
    icon: React.ReactNode;
    children: React.ReactNode;
    withBorder?: boolean;
}): React.ReactElement {
    return (
        <div className={withBorder ? 'mt-6 flex w-full flex-none gap-x-4 border-t border-zinc-950/5 px-5 pt-5 dark:border-white/10' : 'mt-4 flex w-full flex-none gap-x-4 px-5'}>
            <dt className='flex-none'>
                <span className='sr-only'>{label}</span>
                {icon}
            </dt>
            <dd className='min-w-0 flex-auto wrap-break-word text-sm/6 text-zinc-700 dark:text-zinc-300'>{children}</dd>
        </div>
    );
}

function PrimaryContactMethod({ label, value, icon, href }: {
    label: string;
    value: string;
    icon: React.ReactNode;
    href?: string;
}): React.ReactElement {
    const content = (
        <>
            <div className='mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-zinc-100 text-zinc-500 dark:bg-zinc-950/50 dark:text-zinc-400'>
                {icon}
            </div>
            <div className='min-w-0'>
                <p className='text-xs/5 font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400'>{label}</p>
                <p className='mt-0.5 break-words text-md/6 font-medium text-zinc-950 dark:text-white hover:text-purple-400'>{value}</p>
            </div>
        </>
    );
    const className = 'flex gap-3';

    return href ? <a href={href} className={className}>{content}</a> : <div className={className}>{content}</div>;
}

function mailtoHref(value: string): string | undefined {
    const email = value.trim();
    return email ? `mailto:${email}` : undefined;
}

function telHref(value: string): string | undefined {
    const phone = value.trim().replace(/[^\d+]/g, '');
    return phone ? `tel:${phone}` : undefined;
}

function DetailItem({ label, value, href }: {
    label: string;
    value: string | null | undefined;
    href?: string
}): React.ReactElement | null {
    const displayValue = value?.trim();

    if (!displayValue) {
        return null;
    }

    return (
        <div className='px-5 py-5 sm:grid sm:grid-cols-3 sm:gap-4'>
            <dt className='text-sm/6 font-medium uppercase text-zinc-950 dark:text-white'>{label}</dt>
            <dd className='mt-1 break-words text-base/6 font-medium text-zinc-700 sm:col-span-2 sm:mt-0 dark:text-zinc-300'>
                {href ?
                    <a href={href} target='_blank' rel='noreferrer' className='font-medium text-purple-700 hover:text-purple-900 dark:text-purple-300 dark:hover:text-purple-200'>{displayValue}</a> : displayValue}
            </dd>
        </div>
    );
}

type SocialDetailsGridItem = {
    label: string;
    handle: string | null | undefined;
    href?: string;
    Icon: (props: React.SVGProps<SVGSVGElement>) => React.ReactElement;
};

function SocialDetailsGrid({ items }: { items: SocialDetailsGridItem[] }): React.ReactElement | null {
    const visibleItems = items.flatMap((item) => {
        const handle = item.handle?.trim().replace(/^@+/, '') ?? '';

        return handle ? [{ ...item, displayValue: `@${handle}` }] : [];
    });

    if (visibleItems.length === 0) {
        return null;
    }

    return (
        <div className='px-5 py-5 sm:grid sm:grid-cols-3 sm:gap-4'>
            <dt className='text-sm/6 font-medium text-zinc-950 dark:text-white'>Social profiles</dt>
            <dd className='mt-2 sm:col-span-2 sm:mt-0'>
                <div className='grid gap-4 sm:grid-cols-2'>
                    {visibleItems.map((item) => {
                        const Icon = item.Icon;
                        const content = (
                            <span className='inline-flex min-w-0 items-center gap-2'>
                <Icon className='size-4 shrink-0 text-zinc-500 dark:text-zinc-400' aria-hidden='true' />
                <span className='truncate'>{item.displayValue}</span>
              </span>
                        );

                        return (
                            <div key={item.label} className='break-words text-sm/6 text-zinc-700 dark:text-zinc-300'>
                                {item.href ?
                                    <a href={item.href} target='_blank' rel='noreferrer' aria-label={item.label} className='font-medium text-purple-700 hover:text-purple-900 dark:text-purple-300 dark:hover:text-purple-200'>{content}</a> : content}
                            </div>
                        );
                    })}
                </div>
            </dd>
        </div>
    );
}

function socialProfileUrl(value: string | undefined, baseUrl: string): string {
    const trimmed = value?.trim() ?? '';
    if (!trimmed) {
        return '';
    }

    if (/^https?:\/\//i.test(trimmed)) {
        return trimmed;
    }

    const handle = trimmed.replace(/^@+/, '');
    return handle ? `${baseUrl}${encodeURIComponent(handle)}` : '';
}

function isHttpUrl(value: string | undefined): value is string {
    return typeof value === 'string' && /^https?:\/\//i.test(value);
}
