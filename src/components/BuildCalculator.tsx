import { useMemo } from 'react';
import { Item, Character, ItemCategory } from '@/types/database';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Sword, Heart, Sparkles, Coins, TrendingUp, Zap, Shield, Target, Clock, Wind, X, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const categoryIcons: Record<ItemCategory, React.ReactNode> = {
  weapon: <Sword className="h-4 w-4 text-muted-foreground" />,
  ability: <Sparkles className="h-4 w-4 text-muted-foreground" />,
  survival: <Shield className="h-4 w-4 text-muted-foreground" />,
  gadget: <Wrench className="h-4 w-4 text-muted-foreground" />,
};

interface BuildCalculatorProps {
  character: Character | null;
  items: Item[];
  onRemoveItem?: (itemId: string) => void;
}

interface Synergy {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  count: number;
  maxCount: number;
  bonus: string;
}

// Define synergy categories based on special effects
const SYNERGY_PATTERNS = {
  airborne: {
    pattern: /airborne|air control/i,
    name: 'Aerial Dominance',
    description: 'Bonus damage while in the air',
    icon: <Wind className="h-4 w-4" />,
    color: 'text-sky-400',
    bgColor: 'bg-sky-400/10',
  },
  lifesteal: {
    pattern: /damage dealt to health|damage to health/i,
    name: 'Lifesteal',
    description: 'Convert damage to health',
    icon: <Heart className="h-4 w-4" />,
    color: 'text-rose-400',
    bgColor: 'bg-rose-400/10',
  },
  shieldBreaker: {
    pattern: /shields|barriers/i,
    name: 'Shield Breaker',
    description: 'Bonus damage to shields',
    icon: <Shield className="h-4 w-4" />,
    color: 'text-amber-400',
    bgColor: 'bg-amber-400/10',
  },
  cooldownReduction: {
    pattern: /cooldown|ability cooldowns/i,
    name: 'Cooldown Master',
    description: 'Reduced ability cooldowns',
    icon: <Clock className="h-4 w-4" />,
    color: 'text-violet-400',
    bgColor: 'bg-violet-400/10',
  },
  ammoCapacity: {
    pattern: /ammo capacity/i,
    name: 'Extended Mag',
    description: 'Increased ammo capacity',
    icon: <Target className="h-4 w-4" />,
    color: 'text-orange-400',
    bgColor: 'bg-orange-400/10',
  },
  fireRate: {
    pattern: /fire rate|reload/i,
    name: 'Quick Trigger',
    description: 'Faster fire rate & reload',
    icon: <Zap className="h-4 w-4" />,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-400/10',
  },
  executeBonus: {
    pattern: /below.*health|low health/i,
    name: 'Executioner',
    description: 'Bonus damage to low HP enemies',
    icon: <Sword className="h-4 w-4" />,
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
  },
  shieldGen: {
    pattern: /damage dealt to shields|damage to shields/i,
    name: 'Shield Generator',
    description: 'Convert damage to shields',
    icon: <Shield className="h-4 w-4" />,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-400/10',
  },
};

export function BuildCalculator({ character, items, onRemoveItem }: BuildCalculatorProps) {
  const stats = useMemo(() => {
    const totalCost = items.reduce((sum, item) => sum + item.cost, 0);
    const totalDamage = items.reduce((sum, item) => sum + (item.damage_bonus || 0), 0);
    const totalHealth = items.reduce((sum, item) => sum + (item.health_bonus || 0), 0);
    const totalAbility = items.reduce((sum, item) => sum + (item.ability_power || 0), 0);
    
    // Calculate effective stats with character base
    const baseDamage = character?.base_damage || 100;
    const baseHealth = character?.health || 200;
    
    const effectiveDamage = Math.round(baseDamage * (1 + totalDamage / 100));
    const effectiveHealth = baseHealth + totalHealth;
    
    // Efficiency: total stats per 1000 credits
    const efficiency = totalCost > 0 
      ? ((totalDamage + totalHealth / 10 + totalAbility) / totalCost * 1000).toFixed(1)
      : '0';

    return {
      totalCost,
      totalDamage,
      totalHealth,
      totalAbility,
      effectiveDamage,
      effectiveHealth,
      efficiency,
    };
  }, [items, character]);

  const synergies = useMemo(() => {
    const synergyCounts: Record<string, { items: Item[], count: number }> = {};
    
    // Count items matching each synergy pattern
    for (const [key, pattern] of Object.entries(SYNERGY_PATTERNS)) {
      const matchingItems = items.filter(
        item => item.special_effect && pattern.pattern.test(item.special_effect)
      );
      if (matchingItems.length > 0) {
        synergyCounts[key] = { items: matchingItems, count: matchingItems.length };
      }
    }

    // Convert to synergy objects with bonus calculations
    const activeSynergies: Synergy[] = [];
    for (const [key, data] of Object.entries(synergyCounts)) {
      const pattern = SYNERGY_PATTERNS[key as keyof typeof SYNERGY_PATTERNS];
      let bonus = '';
      
      // Calculate synergy bonus based on count
      if (data.count >= 3) {
        bonus = 'MAX SYNERGY!';
      } else if (data.count === 2) {
        bonus = '+15% effect';
      } else {
        bonus = 'Active';
      }

      activeSynergies.push({
        id: key,
        name: pattern.name,
        description: pattern.description,
        icon: pattern.icon,
        color: pattern.color,
        count: data.count,
        maxCount: 3,
        bonus,
      });
    }

    return activeSynergies.sort((a, b) => b.count - a.count);
  }, [items]);

  const roleBonus = useMemo(() => {
    if (!character) return null;
    
    const roleStats = {
      damage: { stat: stats.totalDamage, label: 'Damage Bonus', optimal: stats.totalDamage > 50 },
      tank: { stat: stats.totalHealth, label: 'Health Bonus', optimal: stats.totalHealth > 100 },
      support: { stat: stats.totalAbility, label: 'Ability Power', optimal: stats.totalAbility > 30 },
    };

    return roleStats[character.role];
  }, [character, stats]);

  if (items.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center text-muted-foreground">
          <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>Select items to see build stats</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Main Stats Card */}
      <Card>
        <CardHeader className="pb-2 p-3 sm:p-6 sm:pb-2">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            Build Stats
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-6">
          {/* Cost & Efficiency */}
          <div className="flex items-center justify-between pb-2 sm:pb-3 border-b">
            <div className="flex items-center gap-2">
              <Coins className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
              <span className="text-xs sm:text-sm text-muted-foreground">Total Cost</span>
            </div>
            <span className="font-mono font-bold text-base sm:text-lg">{stats.totalCost.toLocaleString()}</span>
          </div>

          {/* Stat Breakdown */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <div className={cn(
              'text-center p-2 sm:p-3 rounded-lg',
              character?.role === 'damage' ? 'bg-role-damage/20 ring-1 ring-role-damage' : 'bg-muted'
            )}>
              <Sword className="h-4 w-4 sm:h-5 sm:w-5 mx-auto mb-0.5 sm:mb-1 text-role-damage" />
              <div className="font-mono font-bold text-sm sm:text-lg text-role-damage">+{stats.totalDamage}%</div>
              <div className="text-[10px] sm:text-xs text-muted-foreground">Damage</div>
            </div>
            <div className={cn(
              'text-center p-2 sm:p-3 rounded-lg',
              character?.role === 'tank' ? 'bg-role-tank/20 ring-1 ring-role-tank' : 'bg-muted'
            )}>
              <Heart className="h-4 w-4 sm:h-5 sm:w-5 mx-auto mb-0.5 sm:mb-1 text-role-support" />
              <div className="font-mono font-bold text-sm sm:text-lg text-role-support">+{stats.totalHealth}</div>
              <div className="text-[10px] sm:text-xs text-muted-foreground">Health</div>
            </div>
            <div className={cn(
              'text-center p-2 sm:p-3 rounded-lg',
              character?.role === 'support' ? 'bg-rarity-epic/20 ring-1 ring-rarity-epic' : 'bg-muted'
            )}>
              <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 mx-auto mb-0.5 sm:mb-1 text-rarity-epic" />
              <div className="font-mono font-bold text-sm sm:text-lg text-rarity-epic">+{stats.totalAbility}%</div>
              <div className="text-[10px] sm:text-xs text-muted-foreground">Ability</div>
            </div>
          </div>

          {/* Effective Stats with Character */}
          {character && (
            <div className="pt-2 sm:pt-3 border-t space-y-1.5 sm:space-y-2">
              <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                Effective Stats for {character.name}
              </div>
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <div className="flex items-center justify-between bg-muted/50 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg">
                  <span className="text-xs sm:text-sm">Damage</span>
                  <span className="font-mono font-bold text-xs sm:text-sm">
                    {character.base_damage} → <span className="text-role-damage">{stats.effectiveDamage}</span>
                  </span>
                </div>
                <div className="flex items-center justify-between bg-muted/50 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg">
                  <span className="text-xs sm:text-sm">Health</span>
                  <span className="font-mono font-bold text-xs sm:text-sm">
                    {character.health} → <span className="text-role-support">{stats.effectiveHealth}</span>
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Efficiency Score */}
          <div className="pt-2 sm:pt-3 border-t">
            <div className="flex items-center justify-between mb-1.5 sm:mb-2">
              <span className="text-xs sm:text-sm text-muted-foreground">Build Efficiency</span>
              <span className="font-mono text-xs sm:text-sm font-bold">{stats.efficiency} pts/1k</span>
            </div>
            <Progress 
              value={Math.min(parseFloat(stats.efficiency) * 5, 100)} 
              className="h-1.5 sm:h-2"
            />
          </div>
        </CardContent>
      </Card>

      {/* Synergies Card */}
      {synergies.length > 0 && (
        <Card>
          <CardHeader className="pb-2 p-3 sm:p-6 sm:pb-2">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Zap className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              Active Synergies
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 sm:space-y-3 p-3 sm:p-6">
            {synergies.map((synergy) => (
              <div 
                key={synergy.id}
                className={cn(
                  'flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg border',
                  synergy.count >= 3 
                    ? 'bg-gradient-to-r from-primary/20 to-transparent border-primary' 
                    : 'bg-muted/50 border-border'
                )}
              >
                <div className={cn('p-1.5 sm:p-2 rounded-lg', SYNERGY_PATTERNS[synergy.id as keyof typeof SYNERGY_PATTERNS].bgColor)}>
                  <span className={synergy.color}>{synergy.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <span className="font-semibold text-xs sm:text-sm truncate">{synergy.name}</span>
                    <Badge 
                      variant={synergy.count >= 3 ? 'default' : 'secondary'}
                      className="text-[10px] sm:text-xs flex-shrink-0"
                    >
                      {synergy.count}/{synergy.maxCount}
                    </Badge>
                  </div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{synergy.description}</p>
                </div>
                <span className={cn(
                  'text-[10px] sm:text-xs font-semibold flex-shrink-0',
                  synergy.count >= 3 ? 'text-primary' : 'text-muted-foreground'
                )}>
                  {synergy.bonus}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Role Optimization Tip */}
      {roleBonus && !roleBonus.optimal && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardContent className="py-2 sm:py-3 px-3 sm:px-6">
            <p className="text-xs sm:text-sm text-amber-400">
              💡 <strong>Tip:</strong> Your {character?.role} hero benefits more from {roleBonus.label}.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Item List */}
      <Card>
        <CardHeader className="pb-2 p-3 sm:p-6 sm:pb-2">
          <CardTitle className="text-xs sm:text-sm text-muted-foreground">
            Selected Items ({items.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          <div className="space-y-1.5 sm:space-y-2">
            {items.map((item) => (
              <div 
                key={item.id}
                className="flex items-center gap-2 sm:gap-3 p-1.5 sm:p-2 rounded-xl bg-white/[0.03] border border-white/[0.06] group hover:bg-white/[0.06] transition-all duration-200"
              >
                {onRemoveItem && (
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="h-6 w-6 sm:h-7 sm:w-7 flex-shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={() => onRemoveItem(item.id)}
                  >
                    <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </Button>
                )}
                {/* Item Icon */}
                <div className={cn(
                  "w-8 h-8 sm:w-10 sm:h-10 rounded-lg overflow-hidden flex-shrink-0 border",
                  item.rarity === 'legendary' ? 'border-rarity-legendary/50 bg-rarity-legendary/10' :
                  item.rarity === 'epic' ? 'border-rarity-epic/50 bg-rarity-epic/10' :
                  item.rarity === 'rare' ? 'border-rarity-rare/50 bg-rarity-rare/10' :
                  'border-border bg-muted'
                )}>
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      {categoryIcons[item.category]}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={cn(
                    "font-medium text-xs sm:text-sm truncate",
                    item.rarity === 'legendary' ? 'text-rarity-legendary' :
                    item.rarity === 'epic' ? 'text-rarity-epic' :
                    item.rarity === 'rare' ? 'text-rarity-rare' : ''
                  )}>{item.name}</div>
                  {item.special_effect && (
                    <p className="text-[10px] sm:text-xs text-muted-foreground truncate hidden sm:block">{item.special_effect}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs text-muted-foreground flex-shrink-0">
                  {item.damage_bonus && item.damage_bonus > 0 && (
                    <span className="flex items-center gap-0.5 text-role-damage">
                      <Sword className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                      +{item.damage_bonus}%
                    </span>
                  )}
                  {item.health_bonus && item.health_bonus > 0 && (
                    <span className="flex items-center gap-0.5 text-role-support">
                      <Heart className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                      +{item.health_bonus}
                    </span>
                  )}
                  {item.ability_power && item.ability_power > 0 && (
                    <span className="flex items-center gap-0.5 text-rarity-epic">
                      <Sparkles className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                      +{item.ability_power}%
                    </span>
                  )}
                  <span className="font-mono">{item.cost.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
