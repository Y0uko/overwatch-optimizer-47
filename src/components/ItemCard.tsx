import { useState } from 'react';
import { Item, ItemCategory } from '@/types/database';
import { Card, CardContent } from '@/components/ui/card';
import { RarityBadge } from '@/components/ui/RarityBadge';
import { PerkBadge, getItemPerks } from '@/components/ui/PerkBadge';
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
  const perks = getItemPerks(item.special_effect);

  return (
    <Card 
      className={cn(
        'transition-all cursor-pointer hover:shadow-md',
        selected && 'ring-2 ring-primary shadow-lg'
      )}
      onClick={onSelect}
    >
      <CardContent className={compact ? 'p-2 sm:p-3' : 'p-3 sm:p-4'}>
        <div className="flex items-start gap-2 sm:gap-3 mb-2 sm:mb-3">
          {/* Item Image or Category Icon */}
          <div className={cn(
            'flex-shrink-0 rounded-lg flex items-center justify-center overflow-hidden',
            compact ? 'w-8 h-8 sm:w-10 sm:h-10' : 'w-10 h-10 sm:w-12 sm:h-12',
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
            <div className="flex items-start justify-between gap-1 sm:gap-2">
              <h3 className={cn('font-semibold leading-tight', compact ? 'text-xs' : 'text-xs sm:text-sm')}>{item.name}</h3>
              <RarityBadge rarity={item.rarity} />
            </div>
            
            <div className={cn('flex items-center gap-1 text-primary font-mono mt-0.5 sm:mt-1', compact ? 'text-xs' : 'text-xs sm:text-sm')}>
              <Coins className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              <span>{item.cost.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Perk Badges */}
        {perks.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-1.5 sm:mb-2">
            {perks.map((perk) => (
              <PerkBadge key={perk} perk={perk} />
            ))}
          </div>
        )}

        {showStats && (
          <div className="flex flex-wrap gap-1 sm:gap-2 text-[10px] sm:text-xs text-muted-foreground">
            {item.damage_bonus && item.damage_bonus > 0 && (
              <span className="flex items-center gap-0.5 sm:gap-1 bg-role-damage/10 px-1.5 sm:px-2 py-0.5 rounded">
                <Sword className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-role-damage" />
                +{item.damage_bonus}%
              </span>
            )}
            {item.health_bonus && item.health_bonus > 0 && (
              <span className="flex items-center gap-0.5 sm:gap-1 bg-role-support/10 px-1.5 sm:px-2 py-0.5 rounded">
                <Heart className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-role-support" />
                +{item.health_bonus}
              </span>
            )}
            {item.ability_power && item.ability_power > 0 && (
              <span className="flex items-center gap-0.5 sm:gap-1 bg-rarity-epic/10 px-1.5 sm:px-2 py-0.5 rounded">
                <Sparkles className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-rarity-epic" />
                +{item.ability_power}%
              </span>
            )}
          </div>
        )}

        {item.special_effect && (
          <p className="mt-1.5 sm:mt-2 text-[10px] sm:text-xs text-muted-foreground italic line-clamp-2">
            {item.special_effect}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
