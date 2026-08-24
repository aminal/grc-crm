import { Package } from 'lucide-react';
import { HeaderCard } from '@/components/layout/header-card';
import { ProductCategoryBadge } from '@/components/products/product-category-badge';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/domain/format';
import type { FirestoreRecord, ProductData } from '@/lib/domain/types';

type ProductHeaderCardProps = {
    product: FirestoreRecord<ProductData>;
    brandName: string;
    strainNames: string[];
    editHref?: string | null;
};

export function ProductHeaderCard({ product, brandName, strainNames, editHref = null }: ProductHeaderCardProps): React.ReactElement {
    const strains = strainNames.length > 0 ? strainNames.join(', ') : '—';
    const sku = product.data.sku?.trim() || '—';

    return (
        <HeaderCard
            title={product.data.name || 'Product'}
            badge={<ProductCategoryBadge category={product.data.category} fallback='Product' />}
            media={(
                <div className='flex size-16 items-center justify-center rounded-xl bg-purple-500/15 text-purple-700 dark:bg-purple-400/10 dark:text-purple-300'>
                    <Package className='size-8' aria-hidden='true' />
                </div>
            )}
            meta={[
                { label: 'Brand', value: brandName },
                { label: 'Strain', value: strains, breakAll: true },
                { label: 'SKU', value: sku },
                { label: 'Last Updated', value: formatDate(product.data.updated_at), breakAll: true },
            ]}
            actions={editHref ? <Button href={editHref} color='purple'>Edit Product</Button> : null}
        />
    );
}
