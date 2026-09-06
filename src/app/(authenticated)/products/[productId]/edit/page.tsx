import { notFound } from 'next/navigation';
import { ProductEditForm } from '@/components/products/product-edit-form';
import { ProductHeaderCard } from '@/components/products/product-header-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { isFeatureEnabled } from '@/lib/auth/permissions';
import { requireSectionEnabled } from '@/lib/auth/session';
import { findBrand, findProduct, findStrain, listBrands, listStrains } from '@/lib/data/sales-settings';
import type { BrandData, FirestoreRecord, ProductData, StrainData } from '@/lib/domain/types';

type ProductEditParams = {
    productId: string;
};

type ProductEditProduct = {
    id: string;
    data: Pick<ProductData, 'name' | 'brand_id' | 'strain_ids' | 'category' | 'status' | 'unit_base_price_cents' | 'case_quantity' | 'sku' | 'upc' | 'notes'>;
};

type ProductEditBrand = {
    id: string;
    name: string;
    archived: boolean;
};

type ProductEditStrain = {
    id: string;
    name: string;
    archived: boolean;
};

export default async function EditProductPage({ params }: {
    params: Promise<ProductEditParams>;
}): Promise<React.ReactElement> {
    const currentUser = await requireSectionEnabled('products');
    const canEditProduct = isFeatureEnabled(currentUser, 'products', 'update_products');
    const canViewPrivateStrains = isFeatureEnabled(currentUser, 'strains', 'view_private_strains');

    if (!canEditProduct) {
        notFound();
    }

    const { productId } = await params;
    const [product, activeBrands, activeStrains] = await Promise.all([
        findProduct(productId),
        listBrands(),
        listStrains(),
    ]);

    if (!product || productIsArchived(product) || (productIsPrivate(product) && !canViewPrivateStrains)) {
        notFound();
    }

    const visibleActiveStrains = canViewPrivateStrains ? activeStrains : activeStrains.filter((strain) => strain.data.status !== 'Hidden');
    const [brands, strains] = await Promise.all([
        includeProductBrand(activeBrands, product),
        includeProductStrains(visibleActiveStrains, product),
    ]);
    if (productHasPrivateStrain(strains) && !canViewPrivateStrains) {
        notFound();
    }
    const productHref = productPath(product.id);

    return (
        <div className='space-y-6'>
            <ProductHeaderCard product={product} />
            <Card>
                <CardHeader>
                    <CardTitle>Product Details</CardTitle>
                </CardHeader>
                <CardContent>
                    <ProductEditForm
                        product={serializeProduct(product)}
                        brands={brands.map(serializeBrand)}
                        strains={strains.map(serializeStrain)}
                        cancelHref={productHref}
                        successHref={productHref}
                    />
                </CardContent>
            </Card>
        </div>
    );
}

function serializeProduct(record: FirestoreRecord<ProductData>): ProductEditProduct {
    return {
        id: record.id,
        data: {
            name: record.data.name,
            brand_id: record.data.brand_id,
            strain_ids: record.data.strain_ids,
            category: record.data.category,
            status: record.data.status,
            unit_base_price_cents: record.data.unit_base_price_cents,
            case_quantity: record.data.case_quantity,
            sku: record.data.sku,
            upc: record.data.upc,
            notes: record.data.notes,
        },
    };
}

function serializeBrand(record: FirestoreRecord<BrandData>): ProductEditBrand {
    return {
        id: record.id,
        name: record.data.name,
        archived: brandIsArchived(record),
    };
}

function serializeStrain(record: FirestoreRecord<StrainData>): ProductEditStrain {
    return {
        id: record.id,
        name: record.data.name,
        archived: strainIsArchived(record),
    };
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

function productHasPrivateStrain(strains: FirestoreRecord<StrainData>[]): boolean {
    return strains.some((strain) => strain.data.status === 'Hidden');
}

async function includeProductBrand(activeBrands: FirestoreRecord<BrandData>[], product: FirestoreRecord<ProductData>): Promise<FirestoreRecord<BrandData>[]> {
    if (activeBrands.some((brand) => brand.id === product.data.brand_id)) {
        return activeBrands;
    }

    const referencedBrand = await findBrand(product.data.brand_id);
    return [
        ...activeBrands,
        ...(referencedBrand ? [referencedBrand] : []),
    ].sort((a, b) => a.data.name.localeCompare(b.data.name));
}

async function includeProductStrains(activeStrains: FirestoreRecord<StrainData>[], product: FirestoreRecord<ProductData>): Promise<FirestoreRecord<StrainData>[]> {
    const activeIds = new Set(activeStrains.map((strain) => strain.id));
    const missingIds = [...new Set(product.data.strain_ids.filter((strainId) => !activeIds.has(strainId)))];
    const referencedStrains = await Promise.all(missingIds.map(findStrain));

    return [
        ...activeStrains,
        ...referencedStrains.filter((strain): strain is FirestoreRecord<StrainData> => strain !== null),
    ].sort((a, b) => a.data.name.localeCompare(b.data.name));
}

