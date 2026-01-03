import { useState } from 'react';
import { Item, ItemCategory } from '@/types/database';
import { Card, CardContent } from '@/components/ui/card';
import { RarityBadge } from '@/components/ui/RarityBadge';
import { Coins, Sword, Heart, Sparkles, Shield, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ItemCardProps {
  item: Item;
  selected?: boolean;
  onSelect?: () => void;
  showStats?: boolean;
  compact?: boolean;
}

const categoryIcons: Record<ItemCategory, React.ReactNode> = {
  weapon: <Sword className="h-5 w-5" />,
  ability: <Sparkles className="h-5 w-5" />,
  survival: <Shield className="h-5 w-5" />,
  gadget: <Wrench className="h-5 w-5" />,
};

const categoryColors: Record<ItemCategory, string> = {
  weapon: 'bg-role-damage/20 text-role-damage',
  ability: 'bg-rarity-epic/20 text-rarity-epic',
  survival: 'bg-role-support/20 text-role-support',
  gadget: 'bg-role-tank/20 text-role-tank',
};

export function ItemCard({ item, selected, onSelect, showStats = true, compact = false }: ItemCardProps) {
  const [imageError, setImageError] = useState(false);
  const showFallback = !item.image_url || imageError;

  return (
    <Card 
      className={cn(
        'transition-all cursor-pointer hover:shadow-md',
        selected && 'ring-2 ring-primary shadow-lg'
      )}
      onClick={onSelect}
    >
      <CardContent className={compact ? 'p-3' : 'p-4'}>
        <div className="flex items-start gap-3 mb-3">
          {/* Item Image or Category Icon */}
          <div className={cn(
            'flex-shrink-0 rounded-lg flex items-center justify-center overflow-hidden',
            compact ? 'w-10 h-10' : 'w-12 h-12',
            showFallback && categoryColors[item.category]
          )}>
            {!showFallback ? (
              <img 
                src={item.image_url!} 
                alt={item.name}
                className="w-full h-full object-cover"
                onError={() => setImageError(true)}
              />
            ) : (
              categoryIcons[item.category]
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className={cn('font-semibold leading-tight', compact ? 'text-xs' : 'text-sm')}>{item.name}</h3>
              <RarityBadge rarity={item.rarity} />
            </div>
            
            <div className={cn('flex items-center gap-1 text-primary font-mono mt-1', compact ? 'text-xs' : 'text-sm')}>
              <Coins className="h-3.5 w-3.5" />
              <span>{item.cost.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {showStats && (
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            {item.damage_bonus && item.damage_bonus > 0 && (
              <span className="flex items-center gap-1 bg-role-damage/10 px-2 py-0.5 rounded">
                <Sword className="h-3 w-3 text-role-damage" />
                +{item.damage_bonus}%
              </span>
            )}
            {item.health_bonus && item.health_bonus > 0 && (
              <span className="flex items-center gap-1 bg-role-support/10 px-2 py-0.5 rounded">
                <Heart className="h-3 w-3 text-role-support" />
                +{item.health_bonus}
              </span>
            )}
            {item.ability_power && item.ability_power > 0 && (
              <span className="flex items-center gap-1 bg-rarity-epic/10 px-2 py-0.5 rounded">
                <Sparkles className="h-3 w-3 text-rarity-epic" />
                +{item.ability_power}%
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
