import { cn } from '@/lib/utils';
import { ItemRarity } from '@/types/database';

interface RarityBadgeProps {
  rarity: ItemRarity;
  className?: string;
}

const rarityStyles: Record<ItemRarity, string> = {
  common: 'bg-rarity-common/20 text-rarity-common border-rarity-common/30',
  rare: 'bg-rarity-rare/20 text-rarity-rare border-rarity-rare/30',
  epic: 'bg-rarity-epic/20 text-rarity-epic border-rarity-epic/30',
};

export function RarityBadge({ rarity, className }: RarityBadgeProps) {
  return (
    <span 
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border capitalize',
        rarityStyles[rarity],
        className
      )}
    >
      {rarity}
    </span>
  );
}
