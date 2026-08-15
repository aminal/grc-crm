import Link from 'next/link';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { ProductDialog } from '@/components/products/product-dialog';
import { ProductTable } from '@/components/products/product-table';
import { buttonClasses } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { TableSearch } from '@/components/ui/table-search';
import { canManageRestrictedResources, requireNonGuest } from '@/lib/auth/session';
import { findBrand, findProduct, findStrain, listBrands, listProducts, listStrains, } from '@/lib/data/sales-settings';
import type { BrandData, FirestoreRecord, ProductData, StrainData } from '@/lib/domain/types';

const productsHref = '/products';

type ProductsSearchParams = {
    product?: string | string[];
    q?: string | string[];
};

type ProductDialogProduct = {
    id: string;
    data: Pick<ProductData, 'name' | 'brand_id' | 'strain_ids' | 'category' | 'unit_base_price_cents' | 'case_quantity' | 'sku' | 'upc' | 'notes'>;
};

type ProductDialogBrand = {
    id: string;
    name: string;
    archived: boolean;
};

type ProductDialogStrain = {
    id: string;
    name: string;
    archived: boolean;
};

function serializeProduct(record: FirestoreRecord<ProductData>): ProductDialogProduct {
    return {
        id: record.id,
        data: {
            name: record.data.name,
            brand_id: record.data.brand_id,
            strain_ids: record.data.strain_ids,
            category: record.data.category,
            unit_base_price_cents: record.data.unit_base_price_cents,
            case_quantity: record.data.case_quantity,
            sku: record.data.sku,
            upc: record.data.upc,
            notes: record.data.notes,
        },
    };
}

function brandIsArchived(brand: FirestoreRecord<BrandData>): boolean {
    return brand.data.archived_at !== null && brand.data.archived_at !== undefined;
}

function serializeBrand(record: FirestoreRecord<BrandData>): ProductDialogBrand {
    return {
        id: record.id,
        name: record.data.name,
        archived: brandIsArchived(record),
    };
}

function productIsArchived(product: FirestoreRecord<ProductData>): boolean {
    return product.data.archived_at !== null && product.data.archived_at !== undefined;
}

function strainIsArchived(strain: FirestoreRecord<StrainData>): boolean {
    const archived = strain.data.archived_at ?? strain.data.deleted_at;
    return archived !== null && archived !== undefined;
}

function serializeStrain(record: FirestoreRecord<StrainData>): ProductDialogStrain {
    return {
        id: record.id,
        name: record.data.name,
        archived: strainIsArchived(record),
    };
}

function brandIdsFromProducts(products: FirestoreRecord<ProductData>[]): string[] {
    return [...new Set(products.map((product) => product.data.brand_id))].filter(Boolean);
}

function strainIdsFromProducts(products: FirestoreRecord<ProductData>[]): string[] {
    return [...new Set(products.flatMap((product) => product.data.strain_ids))].filter(Boolean);
}

async function includeReferencedBrands(activeBrands: FirestoreRecord<BrandData>[], products: FirestoreRecord<ProductData>[]): Promise<FirestoreRecord<BrandData>[]> {
    const activeIds = new Set(activeBrands.map((brand) => brand.id));
    const missingIds = brandIdsFromProducts(products).filter((brandId) => !activeIds.has(brandId));
    const referencedBrands = await Promise.all(missingIds.map(findBrand));

    return [
        ...activeBrands,
        ...referencedBrands.filter((brand): brand is FirestoreRecord<BrandData> => brand !== null),
    ].sort((a, b) => a.data.name.localeCompare(b.data.name));
}

async function includeReferencedStrains(activeStrains: FirestoreRecord<StrainData>[], products: FirestoreRecord<ProductData>[]): Promise<FirestoreRecord<StrainData>[]> {
    const activeIds = new Set(activeStrains.map((strain) => strain.id));
    const missingIds = strainIdsFromProducts(products).filter((strainId) => !activeIds.has(strainId));
    const referencedStrains = await Promise.all(missingIds.map(findStrain));

    return [
        ...activeStrains,
        ...referencedStrains.filter((strain): strain is FirestoreRecord<StrainData> => strain !== null),
    ].sort((a, b) => a.data.name.localeCompare(b.data.name));
}

function firstSearchParam(value: string | string[] | undefined): string {
    return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
}

function hrefWithQuery(baseHref: string, query: string, params: Record<string, string> = {}): string {
    const searchParams = new URLSearchParams();
    if (query) {
        searchParams.set('q', query);
    }

    Object.entries(params).forEach(([key, value]) => {
        if (value) {
            searchParams.set(key, value);
        }
    });

    const search = searchParams.toString();
    return search ? `${baseHref}?${search}` : baseHref;
}

function filterProducts(
    products: FirestoreRecord<ProductData>[],
    brands: FirestoreRecord<BrandData>[],
    strains: FirestoreRecord<StrainData>[],
    query: string,
): FirestoreRecord<ProductData>[] {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
        return products;
    }

    const brandNames = new Map(brands.map((brand) => [brand.id, brand.data.name]));
    const strainNames = new Map(strains.map((strain) => [strain.id, strain.data.name]));

    return products.filter((product) => [
        product.data.name,
        product.data.sku,
        product.data.upc,
        product.data.category,
        brandNames.get(product.data.brand_id),
        ...product.data.strain_ids.map((strainId) => strainNames.get(strainId) ?? strainId),
    ].join(' ').toLowerCase().includes(normalized));
}

export default async function ProductsPage({ searchParams }: {
    searchParams: Promise<ProductsSearchParams>
}): Promise<React.ReactElement> {
    const user = await requireNonGuest();
    const canManage = canManageRestrictedResources(user);

    const params = await searchParams;
    const query = firstSearchParam(params.q).trim();
    const productParam = firstSearchParam(params.product).trim();
    const showCreateProductDialog = canManage && productParam === 'new';
    const showEditProductDialog = canManage && productParam !== '' && productParam !== 'new';

    let activeBrands: FirestoreRecord<BrandData>[] = [];
    let products: FirestoreRecord<ProductData>[] = [];
    let activeStrains: FirestoreRecord<StrainData>[] = [];
    let selectedProduct: FirestoreRecord<ProductData> | null = null;

    if (showEditProductDialog) {
        [activeBrands, products, activeStrains, selectedProduct] = await Promise.all([
            listBrands(),
            listProducts(),
            listStrains(),
            findProduct(productParam),
        ]);
    } else {
        [activeBrands, products, activeStrains] = await Promise.all([
            listBrands(),
            listProducts(),
            listStrains(),
        ]);
    }

    if (selectedProduct && productIsArchived(selectedProduct)) {
        selectedProduct = null;
    }

    const brands = await includeReferencedBrands(activeBrands, products);
    const strains = await includeReferencedStrains(activeStrains, products);
    const filteredProducts = filterProducts(products, brands, strains, query);
    const filteredHref = hrefWithQuery(productsHref, query);
    const createProductHref = hrefWithQuery(productsHref, query, { product: 'new' });
    const serializedBrands = brands.map(serializeBrand);
    const serializedStrains = strains.map(serializeStrain);
    const serializedProduct = selectedProduct ? serializeProduct(selectedProduct) : null;

    return (
        <div>
            <PageHeader
                title='Products'
                actions={canManage ? (
                    <Link href={createProductHref} className={buttonClasses()}>
                        <Plus data-slot='icon' aria-hidden='true' />
                        Add Product
                    </Link>
                ) : null}
            />
            <div className='space-y-6'>
                <TableSearch query={query} placeholder='Filter products by name, SKU, UPC, brand, strain, or category' />
                {query && filteredProducts.length === 0 ? <EmptyState title='No products found' /> :
                    <ProductTable products={filteredProducts} brands={brands} strains={strains} selectedProductId={selectedProduct?.id} hrefBase={filteredHref} canManage={canManage} />}
            </div>
            {showCreateProductDialog ?
                <ProductDialog mode='create' brands={serializedBrands} strains={serializedStrains} closeHref={filteredHref} /> : null}
            {showEditProductDialog && serializedProduct ?
                <ProductDialog mode='edit' product={serializedProduct} brands={serializedBrands} strains={serializedStrains} closeHref={filteredHref} /> : null}
        </div>
    );
}
