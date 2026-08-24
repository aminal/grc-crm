import { notFound } from 'next/navigation';
import { ProductHeaderCard } from '@/components/products/product-header-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { isFeatureEnabled } from '@/lib/auth/permissions';
import { requireSectionEnabled } from '@/lib/auth/session';
import { findBrand, findProduct, findStrain } from '@/lib/data/sales-settings';
import { formatDate, formatMoney, formatProductCategory } from '@/lib/domain/format';
import type { BrandData, FirestoreRecord, ProductData, StrainData } from '@/lib/domain/types';

type ProductDetailParams = {
    productId: string;
};

export default async function ProductDetailPage({ params }: {
    params: Promise<ProductDetailParams>;
}): Promise<React.ReactElement> {
    const currentUser = await requireSectionEnabled('products');
    const { productId } = await params;
    const product = await findProduct(productId);

    if (!product || productIsArchived(product)) {
        notFound();
    }

    const [brand, strains] = await Promise.all([
        findBrand(product.data.brand_id),
        Promise.all(product.data.strain_ids.map(findStrain)),
    ]);
    const productHref = productPath(product.id);
    const canEditProduct = isFeatureEnabled(currentUser, 'products', 'update_products');
    const brandName = displayBrandName(brand);
    const strainNames = displayStrainNames(product.data.strain_ids, strains);

    return (
        <div className='space-y-6'>
            <ProductHeaderCard product={product} brandName={brandName} strainNames={strainNames} editHref={canEditProduct ? `${productHref}/edit` : null} />
            <ProductDetailsCard product={product} brandName={brandName} strainNames={strainNames} />
        </div>
    );
}

function ProductDetailsCard({ product, brandName, strainNames }: {
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

function productPath(productId: string): string {
    return `/products/${encodeURIComponent(productId)}`;
}

function productIsArchived(product: FirestoreRecord<ProductData>): boolean {
    return product.data.archived_at !== null && product.data.archived_at !== undefined;
}

function brandIsArchived(brand: FirestoreRecord<BrandData>): boolean {
    return brand.data.archived_at !== null && brand.data.archived_at !== undefined;
}

function strainIsArchived(strain: FirestoreRecord<StrainData>): boolean {
    const archived = strain.data.archived_at ?? strain.data.deleted_at;
    return archived !== null && archived !== undefined;
}

function displayBrandName(brand: FirestoreRecord<BrandData> | null): string {
    if (!brand) {
        return 'Unknown Brand';
    }

    return `${brand.data.name}${brandIsArchived(brand) ? ' (archived)' : ''}`;
}

function displayStrainNames(strainIds: string[], strains: (FirestoreRecord<StrainData> | null)[]): string[] {
    return strainIds.map((strainId, index) => {
        const strain = strains[index];
        if (!strain) {
            return strainId;
        }

        return `${strain.data.name}${strainIsArchived(strain) ? ' (archived)' : ''}`;
    });
}
