import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ChevronRight, Plus } from 'lucide-react';
import { ProductDialog } from '@/components/products/product-dialog';
import { ProductDetailsCard, ProductHeaderCard } from '@/components/products/product-header-card';
import { ProductTable, type ProductTableSortKey } from '@/components/products/product-table';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { paginatedTableItems, TablePagination, tablePageFromSearchParam, tableSortDirectionFromSearchParam, tableSortKeyFromSearchParam, tableSortParams, type TableSortDirection } from '@/components/ui/table';
import { TableSearch } from '@/components/ui/table-search';
import { isFeatureEnabled } from '@/lib/auth/permissions';
import { requireSectionEnabled } from '@/lib/auth/session';
import { findBrand, findStrain, listBrands, listProducts, listStrains, } from '@/lib/data/sales-settings';
import { formatProductCategory } from '@/lib/domain/format';
import type { BrandData, FirestoreRecord, ProductData, StrainData } from '@/lib/domain/types';
import { SettingsShell } from '../settings-shell';

const productsHref = '/settings/products';
const productSortKeys = ['name', 'sku', 'brand', 'strain', 'category', 'status'] as const;

type ProductsSearchParams = {
    product?: string | string[];
    edit?: string | string[];
    q?: string | string[];
    page?: string | string[];
    sort?: string | string[];
    dir?: string | string[];
};

type ProductDialogProduct = {
    id: string;
    data: Pick<ProductData, 'name' | 'brand_id' | 'strain_ids' | 'category' | 'status' | 'unit_base_price_cents' | 'case_quantity' | 'sku' | 'upc' | 'notes'>;
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

function serializeProduct(record: FirestoreRecord<ProductData>): ProductDialogProduct {
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

    const brandSearchText = new Map(brands.map((brand) => [brand.id, `${brand.data.name} ${brand.data.acronym}`]));
    const strainNames = new Map(strains.map((strain) => [strain.id, strain.data.name]));

    return products.filter((product) => [
        product.data.name,
        product.data.sku,
        product.data.upc,
        formatProductCategory(product.data.category),
        product.data.status,
        brandSearchText.get(product.data.brand_id),
        ...product.data.strain_ids.map((strainId) => strainNames.get(strainId) ?? strainId),
    ].join(' ').toLowerCase().includes(normalized));
}

function displayBrandName(brand: FirestoreRecord<BrandData> | null): string {
    if (!brand) {
        return 'Unknown Brand';
    }

    return `${brand.data.name}${brandIsArchived(brand) ? ' (archived)' : ''}`;
}

function displayStrainNames(strainIds: string[], strains: FirestoreRecord<StrainData>[]): string[] {
    const strainById = new Map(strains.map((strain) => [strain.id, strain]));

    return strainIds.map((strainId) => {
        const strain = strainById.get(strainId);
        if (!strain) {
            return strainId;
        }

        return `${strain.data.name}${strainIsArchived(strain) ? ' (archived)' : ''}`;
    });
}

export default async function SettingsProductsPage({ searchParams }: {
    searchParams: Promise<ProductsSearchParams>
}): Promise<React.ReactElement> {
    const user = await requireSectionEnabled('products');
    const canCreate = isFeatureEnabled(user, 'products', 'create_products');
    const canEdit = isFeatureEnabled(user, 'products', 'update_products');
    const canViewPrivateStrains = isFeatureEnabled(user, 'strains', 'view_private_strains');

    const params = await searchParams;
    const query = firstSearchParam(params.q).trim();
    const sortKey = tableSortKeyFromSearchParam(params.sort, productSortKeys);
    const sortDirection = sortKey ? tableSortDirectionFromSearchParam(params.dir) : null;
    const sortParams = tableSortParams(sortKey, sortDirection);
    const productParam = firstSearchParam(params.product).trim();
    const selectedProductId = productParam && productParam !== 'new' ? productParam : '';
    const showCreateProductDialog = canCreate && productParam === 'new';

    const [activeBrands, products, activeStrains] = await Promise.all([
        listBrands(),
        listProducts(),
        listStrains(),
    ]);

    const privateStrainIds = new Set(activeStrains.filter((strain) => strain.data.status === 'Hidden').map((strain) => strain.id));
    const visibleProducts = canViewPrivateStrains ? products : products.filter((product) => product.data.status !== 'Hidden' && !product.data.strain_ids.some((strainId) => privateStrainIds.has(strainId)));
    const selectedProduct = selectedProductId ? visibleProducts.find((product) => product.id === selectedProductId) ?? null : null;

    if (selectedProductId && !selectedProduct) {
        notFound();
    }

    const visibleStrains = canViewPrivateStrains ? activeStrains : activeStrains.filter((strain) => strain.data.status !== 'Hidden');
    const brands = await includeReferencedBrands(activeBrands, visibleProducts);
    const strains = await includeReferencedStrains(visibleStrains, visibleProducts);
    const filteredProducts = filterProducts(visibleProducts, brands, strains, query);
    const sortedProducts = sortProducts(filteredProducts, sortKey, sortDirection, brands, strains);
    const currentPage = tablePageFromSearchParam(params.page, sortedProducts.length);
    const paginatedProducts = paginatedTableItems(sortedProducts, currentPage);
    const paginationHref = hrefWithQuery(productsHref, query, sortParams);
    const pageParams: Record<string, string> = currentPage > 1 ? { ...sortParams, page: String(currentPage) } : sortParams;
    const filteredHref = hrefWithQuery(productsHref, query, pageParams);
    const createProductHref = hrefWithQuery(productsHref, query, { ...pageParams, product: 'new' });
    const selectedProductHref = selectedProduct ? hrefWithQuery(productsHref, query, { ...pageParams, product: selectedProduct.id }) : filteredHref;
    const editProductHref = selectedProduct && canEdit ? hrefWithQuery(productsHref, query, { ...pageParams, product: selectedProduct.id, edit: '1' }) : null;
    const selectedProductBrand = selectedProduct ? brands.find((brand) => brand.id === selectedProduct.data.brand_id) ?? null : null;
    const selectedProductStrains = selectedProduct ? displayStrainNames(selectedProduct.data.strain_ids, strains) : [];
    const showEditProductDialog = selectedProduct !== null && firstSearchParam(params.edit) !== '';
    const serializedBrands = brands.map(serializeBrand);
    const serializedStrains = strains.map(serializeStrain);

    if (showEditProductDialog && !canEdit) {
        redirect(selectedProductHref);
    }

    return (
        <SettingsShell current='products'>
            <div className='space-y-8'>
                {selectedProduct ? (
                    <section className='space-y-6' aria-labelledby='selected-product-heading'>
                        <div className='flex flex-wrap items-center gap-2'>
                            <h2 className='text-2xl/7 font-medium text-zinc-700 uppercase dark:text-white'>
                                <Link href={filteredHref}>Products</Link>
                            </h2>
                            <ChevronRight data-slot='icon' aria-hidden='true' className='size-8' />
                            <h2 id='selected-product-heading' className='text-2xl/7 font-medium text-zinc-700 uppercase dark:text-white'>
                                View Product
                            </h2>
                            <div className='flex flex-1 items-center justify-end'>
                                <Button href={editProductHref || undefined} color='purple' className='uppercase text-md!'>Edit Product</Button>
                            </div>
                        </div>
                        <ProductHeaderCard product={selectedProduct} />
                        <ProductDetailsCard product={selectedProduct} brandName={displayBrandName(selectedProductBrand)} strainNames={selectedProductStrains} />
                    </section>
                ) : (
                    <div className='space-y-6'>
                        <div className='flex flex-wrap items-center justify-between gap-4'>
                            <h2 className='text-2xl/7 -mt-0.5 font-medium text-zinc-700 uppercase dark:text-white'>
                                Products
                            </h2>
                            {canCreate ? (
                                <Button color='purple' href={createProductHref} className='uppercase text-md!'>
                                    <Plus data-slot='icon' aria-hidden='true' />
                                    Add Product
                                </Button>
                            ) : null}
                        </div>
                        <TableSearch query={query} placeholder='Filter products by name, SKU, UPC, brand, strain, category, or status' preservedParams={sortParams} />
                        {query && filteredProducts.length === 0 ? <EmptyState title='No products found' /> : (
                            <>
                                <ProductTable products={paginatedProducts} brands={brands} strains={strains} query={query} sortKey={sortKey} sortDirection={sortDirection} baseHref={productsHref} rowParams={pageParams} />
                                <TablePagination baseHref={paginationHref} currentPage={currentPage} totalItems={sortedProducts.length} />
                            </>
                        )}
                    </div>
                )}
            </div>
            {showCreateProductDialog ?
                <ProductDialog mode='create' brands={serializedBrands} strains={serializedStrains} closeHref={filteredHref} /> : null}
            {selectedProduct && showEditProductDialog ?
                <ProductDialog mode='edit' product={serializeProduct(selectedProduct)} brands={serializedBrands} strains={serializedStrains} closeHref={selectedProductHref} /> : null}
        </SettingsShell>
    );
}

function sortProducts(products: FirestoreRecord<ProductData>[], sortKey: ProductTableSortKey | null, sortDirection: TableSortDirection | null, brands: FirestoreRecord<BrandData>[], strains: FirestoreRecord<StrainData>[]): FirestoreRecord<ProductData>[] {
    if (!sortKey || !sortDirection) {
        return products;
    }

    const direction = sortDirection === 'asc' ? 1 : -1;
    const brandLabels = new Map(brands.map((brand) => [brand.id, brand.data.acronym || brand.data.name]));
    const strainNames = new Map(strains.map((strain) => [strain.id, strain.data.name]));
    return [...products].sort((a, b) => compareStrings(productSortValue(a, sortKey, brandLabels, strainNames), productSortValue(b, sortKey, brandLabels, strainNames)) * direction);
}

function productSortValue(product: FirestoreRecord<ProductData>, sortKey: ProductTableSortKey, brandLabels: Map<string, string>, strainNames: Map<string, string>): string {
    switch (sortKey) {
        case 'name':
            return product.data.name;
        case 'sku':
            return product.data.sku ?? '';
        case 'brand':
            return brandLabels.get(product.data.brand_id) ?? '';
        case 'strain':
            return product.data.strain_ids.map((strainId) => strainNames.get(strainId) ?? strainId).join(', ');
        case 'category':
            return formatProductCategory(product.data.category);
        case 'status':
            return product.data.status;
    }
}

function compareStrings(a: string | null | undefined, b: string | null | undefined): number {
    return (a ?? '').localeCompare(b ?? '', undefined, { numeric: true, sensitivity: 'base' });
}
