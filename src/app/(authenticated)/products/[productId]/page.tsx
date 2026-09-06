import { notFound } from 'next/navigation';
import { ProductDetailsCard, ProductHeaderCard } from '@/components/products/product-header-card';
import { isFeatureEnabled } from '@/lib/auth/permissions';
import { requireSectionEnabled } from '@/lib/auth/session';
import { findBrand, findProduct, findStrain } from '@/lib/data/sales-settings';
import type { BrandData, FirestoreRecord, ProductData, StrainData } from '@/lib/domain/types';

type ProductDetailParams = {
    productId: string;
};

export default async function ProductDetailPage({ params }: {
    params: Promise<ProductDetailParams>;
}): Promise<React.ReactElement> {
    const currentUser = await requireSectionEnabled('products');
    const canViewPrivateStrains = isFeatureEnabled(currentUser, 'strains', 'view_private_strains');
    const { productId } = await params;
    const product = await findProduct(productId);

    if (!product || productIsArchived(product) || (productIsPrivate(product) && !canViewPrivateStrains)) {
        notFound();
    }

    const [brand, strains] = await Promise.all([
        findBrand(product.data.brand_id),
        Promise.all(product.data.strain_ids.map(findStrain)),
    ]);
    if (productHasPrivateStrain(strains) && !canViewPrivateStrains) {
        notFound();
    }

    const productHref = productPath(product.id);
    const canEditProduct = isFeatureEnabled(currentUser, 'products', 'update_products');
    const brandName = displayBrandName(brand);
    const strainNames = displayStrainNames(product.data.strain_ids, strains);

    return (
        <div className='space-y-6'>
            <ProductHeaderCard product={product} editHref={canEditProduct ? `${productHref}/edit` : null} />
            <ProductDetailsCard product={product} brandName={brandName} strainNames={strainNames} />
        </div>
    );
}

function productPath(productId: string): string {
    return `/products/${encodeURIComponent(productId)}`;
}

function productIsArchived(product: FirestoreRecord<ProductData>): boolean {
    return product.data.status === 'Archived' || (product.data.archived_at !== null && product.data.archived_at !== undefined);
}

function productIsPrivate(product: FirestoreRecord<ProductData>): boolean {
    return product.data.status === 'Hidden';
}

function brandIsArchived(brand: FirestoreRecord<BrandData>): boolean {
    return brand.data.archived_at !== null && brand.data.archived_at !== undefined;
}

function strainIsArchived(strain: FirestoreRecord<StrainData>): boolean {
    const archived = strain.data.archived_at ?? strain.data.deleted_at;
    return strain.data.status === 'Archived' || (archived !== null && archived !== undefined);
}

function productHasPrivateStrain(strains: (FirestoreRecord<StrainData> | null)[]): boolean {
    return strains.some((strain) => strain?.data.status === 'Hidden');
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
