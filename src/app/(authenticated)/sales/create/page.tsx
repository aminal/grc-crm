import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Field, Select } from '@/components/ui/field';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { DeliveryDateField } from '@/components/sales/delivery-date-field';
import { PackagePicker } from '@/components/sales/package-picker';
import { OrderTermsField } from '@/components/sales/order-terms-field';
import { requireNonGuest } from '@/lib/auth/session';
import { listCompanies } from '@/lib/data/crm';
import { listPackages } from '@/lib/data/inventory';
import { listUsers } from '@/lib/data/profiles';
import { listProducts } from '@/lib/data/sales-settings';
import { companyUrlSegment } from '@/lib/domain/company-slug';
import { createOrderAction } from '../actions';

type CreateOrderSearchParams = {
    company_id?: string | string[];
    company_slug?: string | string[];
};

export default async function CreateOrderPage({ searchParams }: {
    searchParams: Promise<CreateOrderSearchParams>
}): Promise<React.ReactElement> {
    const user = await requireNonGuest();
    const params = await searchParams;
    const [companies, packages, users, products] = await Promise.all([listCompanies(), listPackages(false), listUsers(), listProducts()]);
    const companyId = firstSearchParam(params.company_id);
    const companySlug = firstSearchParam(params.company_slug);
    const selectedCompanyId = companyId || companies.find((company) => companyUrlSegment(company) === companySlug)?.id || '';
    const companyOptions = companies.map((company) => {
        const location = [company.data.address.city, company.data.address.state].filter(Boolean).join(', ');
        const description = [company.data.license_number, location].filter(Boolean).join(' · ');

        return {
            value: company.id,
            label: company.data.company_name,
            description,
            searchText: [company.data.company_name, company.data.license_number, company.data.facility_type, location].filter(Boolean).join(' '),
        };
    });
    const userOptions = users.map((profile) => ({
        value: profile.id,
        label: profile.data.display_name?.trim() || profile.data.email?.trim() || profile.id,
    }));
    if (!userOptions.some((option) => option.value === user.uid)) {
        userOptions.unshift({ value: user.uid, label: user.name || user.email });
    }
    const availablePackages = packages.filter((packageRecord) => packageRecord.data.package_status === 'available');
    const productPrices = new Map(products.map((product) => [product.id, product.data.unit_base_price_cents]));
    const initialPackagePrices = Object.fromEntries(
        availablePackages.flatMap((packageRecord) => {
            const productPriceCents = packageRecord.data.product_id ? productPrices.get(packageRecord.data.product_id) : undefined;
            const priceCents = productPriceCents ? Math.round(productPriceCents * Number(packageRecord.data.quantity ?? 0)) : 0;
            return priceCents ? [[packageRecord.data.package_tag, (priceCents / 100).toFixed(2)]] : [];
        }),
    );
    const packageRows = availablePackages.map((packageRecord) => ({
        package_tag: packageRecord.data.package_tag,
        item: packageRecord.data.item,
        strain: packageRecord.data.strain,
        category: packageRecord.data.category,
        source_packages: packageRecord.data.source_packages || packageRecord.data.original_source_package_label,
        quantity: Number(packageRecord.data.quantity ?? 0),
        unit_of_measure: packageRecord.data.unit_of_measure,
        expiration_date: packageRecord.data.expiration_date || null,
        unit_base_price_cents: packageRecord.data.product_id ? (productPrices.get(packageRecord.data.product_id) ?? 0) : 0,
    }));

    return (
        <div>
            <PageHeader
                title='Create Order'
                description='Reserve active METRC packages for a company and freeze their snapshots onto a pending order.'
            />

            <form action={createOrderAction} className='space-y-6'>
                <Card>
                    <CardContent className='grid gap-4 sm:grid-cols-2 xl:grid-cols-3'>
                        <Field label='Company'>
                            <SearchableSelect
                                key={selectedCompanyId}
                                name='company_id'
                                options={companyOptions}
                                defaultValue={selectedCompanyId}
                                placeholder='Search companies'
                                emptyMessage='No companies matched your search.'
                                maxResults={4}
                                required
                                footerAction={{ href: '/companies?newCompany=1', label: '+ Add New Company' }}
                            />
                        </Field>
                        <Field label='Salesperson'>
                            <Select name='salesperson_user_id' defaultValue={user.uid} required>
                                <option value='' disabled>Choose a salesperson</option>
                                {userOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                            </Select>
                        </Field>
                        <OrderTermsField />
                        <DeliveryDateField />
                    </CardContent>
                </Card>

                <Card>
                    {packageRows.length > 0 ? <PackagePicker packages={packageRows} initialPrices={initialPackagePrices} title='Packages' /> :
                        <>
                            <CardHeader>
                                <CardTitle>Packages</CardTitle>
                            </CardHeader>
                            <CardContent className='space-y-4'>
                                <p className='rounded-lg border border-dashed border-zinc-950/10 p-8 text-center text-sm text-zinc-600'>No
                                    available packages. Upload METRC inventory or release reserved packages.</p>
                            </CardContent>
                        </>}
                </Card>

                <div className='flex justify-end'>
                    <Button type='submit' color='purple'>Create Order</Button>
                </div>
            </form>
        </div>
    );
}

function firstSearchParam(value: string | string[] | undefined): string {
    return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
}
