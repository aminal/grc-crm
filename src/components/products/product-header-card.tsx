import { HeaderCard } from '@/components/layout/header-card';
import { ProductCategoryBadge } from '@/components/products/product-category-badge';
import { Badge, type BadgeColor } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate, formatMoney, formatProductCategory } from '@/lib/domain/format';
import type { FirestoreRecord, ProductData, ProductStatus } from '@/lib/domain/types';

type ProductHeaderCardProps = {
    product: FirestoreRecord<ProductData>;
    editHref?: string | null;
};

export function ProductHeaderCard({ product }: ProductHeaderCardProps): React.ReactElement {
    return (
        <HeaderCard
            title={product.data.name || 'Product'}
            className='dark:bg-zinc-600/15'
            badge={(
                <>
                    <ProductCategoryBadge category={product.data.category} fallback='Product' />
                    <ProductStatusBadge status={product.data.status} />
                </>
            )}
        />
    );
}

export function ProductDetailsCard({ product, brandName, strainNames }: {
    product: FirestoreRecord<ProductData>;
    brandName: string;
    strainNames: string[];
}): React.ReactElement {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Product Details</CardTitle>
            </CardHeader>
            <CardContent>
                <dl className='grid gap-5 sm:grid-cols-2 xl:grid-cols-3'>
                    <DetailItem label='Name' value={product.data.name || '—'} />
                    <DetailItem label='Brand' value={brandName} />
                    <DetailItem label='Strain' value={strainNames.length > 0 ? strainNames.join(', ') : '—'} />
                    <DetailItem label='Category' value={formatProductCategory(product.data.category) || '—'} />
                    <DetailItem label='Status' value={product.data.status} />
                    <DetailItem label='Unit Base Price' value={formatMoney(product.data.unit_base_price_cents)} />
                    <DetailItem label='Case Quantity' value={product.data.case_quantity ? String(product.data.case_quantity) : '—'} />
                    <DetailItem label='SKU' value={product.data.sku || '—'} />
                    <DetailItem label='UPC Code' value={product.data.upc || '—'} />
                    <DetailItem label='Created' value={formatDate(product.data.created_at)} />
                    <DetailItem label='Last Updated' value={formatDate(product.data.updated_at)} />
                </dl>
                {product.data.notes ? (
                    <dl className='mt-6'>
                        <DetailItem label='Notes' value={<span className='whitespace-pre-wrap'>{product.data.notes}</span>} />
                    </dl>
                ) : null}
            </CardContent>
        </Card>
    );
}

function DetailItem({ label, value }: {
    label: string;
    value: React.ReactNode;
}): React.ReactElement {
    return (
        <div>
            <dt className='text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500'>{label}</dt>
            <dd className='mt-1 break-words text-sm/6 font-semibold text-zinc-950 dark:text-white'>{value}</dd>
        </div>
    );
}

function ProductStatusBadge({ status }: { status: ProductStatus }): React.ReactElement {
    const statusColors = {
        Active: 'emerald',
        Hidden: 'purple',
        'Coming Soon': 'sky',
        Sunsetting: 'amber',
        Archived: 'zinc',
    } satisfies Record<ProductStatus, BadgeColor>;

    return <Badge color={statusColors[status]}>{status}</Badge>;
}

