import { Package } from 'lucide-react';
import { HeaderCard } from '@/components/layout/header-card';
import { ProductCategoryBadge } from '@/components/products/product-category-badge';
import { Badge, type BadgeColor } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { FirestoreRecord, ProductData, ProductStatus } from '@/lib/domain/types';

type ProductHeaderCardProps = {
    product: FirestoreRecord<ProductData>;
    editHref?: string | null;
    strainSativaPercentage?: number | null;
};

export function ProductHeaderCard({ product, editHref = null, strainSativaPercentage = null }: ProductHeaderCardProps): React.ReactElement {
    return (
        <HeaderCard
            title={product.data.name || 'Product'}
            badge={(
                <>
                    <ProductCategoryBadge category={product.data.category} fallback='Product' />
                    <ProductStatusBadge status={product.data.status} />
                </>
            )}
            media={(
                <div className={`flex size-16 items-center justify-center rounded-xl ${strainIconColorClasses(strainSativaPercentage)}`}>
                    <Package className='size-8' aria-hidden='true' />
                </div>
            )}
            actions={editHref ? <Button href={editHref} color='purple'>Edit Product</Button> : null}
        />
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

function strainIconColorClasses(sativaPercentage: number | null | undefined): string {
    if (sativaPercentage === null || sativaPercentage === undefined) {
        return 'bg-purple-500/15 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400';
    }

    if (sativaPercentage > 50) {
        return 'bg-orange-500/15 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400';
    }

    if (sativaPercentage < 50) {
        return 'bg-purple-500/15 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400';
    }

    return 'bg-blue-500/15 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400';
}
