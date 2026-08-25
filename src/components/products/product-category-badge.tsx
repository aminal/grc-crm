import { Badge, type BadgeColor } from '@/components/ui/badge';
import { formatProductCategory } from '@/lib/domain/format';

const categoryColors: Record<string, BadgeColor> = {
    flower: 'purple',
    'pre-roll': 'orange',
    'raw pre-rolls': 'violet',
    'infused pre-rolls': 'fuchsia',
    'premium bud pre-roll': 'indigo',
    concentrate: 'amber',
    'concentrate (bulk)': 'orange',
    'concentrate (each)': 'orange',
    'concentrate (weight)': 'orange',
    extract: 'yellow',
    'shake/trim': 'lime',
    'immature plants': 'green',
    seeds: 'teal',
    infused: 'pink',
    'infused (bulk)': 'rose',
    'infused (each)': 'rose',
    'infused (edible)': 'pink',
    'infused (non-edible)': 'pink',
    'infused liquid': 'cyan',
    topical: 'sky',
    tincture: 'blue',
    'vape cartridge': 'zinc',
};

export function ProductCategoryBadge({ category, fallback = '—' }: {
    category: string | null | undefined;
    fallback?: string;
}): React.ReactElement {
    const label = formatProductCategory(category) || fallback;
    const color = categoryColors[label.toLowerCase()] ?? 'zinc';

    return <Badge color={color}>{label}</Badge>;
}
