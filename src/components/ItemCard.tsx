import { Item } from '@/types/database';
import { Card, CardContent } from '@/components/ui/card';
import { RarityBadge } from '@/components/ui/RarityBadge';
import { Coins, Sword, Heart, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ItemCardProps {
  item: Item;
  selected?: boolean;
  onSelect?: () => void;
  showStats?: boolean;
}

export function ItemCard({ item, selected, onSelect, showStats = true }: ItemCardProps) {
  return (
    <Card 
      className={cn(
        'transition-all cursor-pointer hover:shadow-md',
        selected && 'ring-2 ring-primary shadow-lg'
      )}
      onClick={onSelect}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-sm leading-tight">{item.name}</h3>
          <RarityBadge rarity={item.rarity} />
        </div>
        
        <div className="flex items-center gap-1 text-primary font-mono text-sm mb-2">
          <Coins className="h-3.5 w-3.5" />
          <span>{item.cost}</span>
        </div>

        {showStats && (
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            {item.damage_bonus && item.damage_bonus > 0 && (
              <span className="flex items-center gap-1">
                <Sword className="h-3 w-3 text-role-damage" />
                +{item.damage_bonus}
              </span>
            )}
            {item.health_bonus && item.health_bonus > 0 && (
              <span className="flex items-center gap-1">
                <Heart className="h-3 w-3 text-role-support" />
                +{item.health_bonus}
              </span>
            )}
            {item.ability_power && item.ability_power > 0 && (
              <span className="flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-rarity-epic" />
                +{item.ability_power}
              </span>
            )}
          </div>
        )}

        {item.special_effect && (
          <p className="mt-2 text-xs text-muted-foreground italic line-clamp-2">
            {item.special_effect}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
