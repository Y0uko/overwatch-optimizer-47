import { cn } from '@/lib/utils';
import { Droplet, Zap, Package, Shield, Clock, Target } from 'lucide-react';
import { Item } from '@/types/database';

export type PerkType = 'weapon-lifesteal' | 'ability-lifesteal' | 'shield' | 'armor' | 'cooldown';

interface PerkBadgeProps {
  perk: PerkType;
  value?: number;
  className?: string;
}

const perkConfig: Record<PerkType, { icon: React.ReactNode; label: string; color: string }> = {
  'weapon-lifesteal': {
    icon: <Droplet className="h-2.5 w-2.5 sm:h-3 sm:w-3" />,
    label: 'W.Lifesteal',
    color: 'bg-red-500/20 text-red-400 border-red-500/30',
  },
  'ability-lifesteal': {
    icon: <Droplet className="h-2.5 w-2.5 sm:h-3 sm:w-3" />,
    label: 'A.Lifesteal',
    color: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  },
  'shield': {
    icon: <Shield className="h-2.5 w-2.5 sm:h-3 sm:w-3" />,
    label: 'Shield',
    color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  },
  'armor': {
    icon: <Target className="h-2.5 w-2.5 sm:h-3 sm:w-3" />,
    label: 'Armor',
    color: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  },
  'cooldown': {
    icon: <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3" />,
    label: 'CDR',
    color: 'bg-green-500/20 text-green-400 border-green-500/30',
  },
};

export function PerkBadge({ perk, value, className }: PerkBadgeProps) {
  const config = perkConfig[perk];
  
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 px-1 sm:px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-medium border',
        config.color,
        className
      )}
      title={config.label}
    >
      {config.icon}
      <span className="hidden sm:inline">{config.label}</span>
      {value !== undefined && value > 0 && (
        <span className="ml-0.5">{value}%</span>
      )}
    </span>
  );
}

export interface ItemWithPerks {
  weapon_lifesteal?: number | null;
  ability_lifesteal?: number | null;
  attack_speed?: number | null;
  max_ammo?: number | null;
  shield_bonus?: number | null;
  armor_bonus?: number | null;
  cooldown_reduction?: number | null;
  // Legacy boolean fields support
  has_weapon_lifesteal?: boolean;
  has_ability_lifesteal?: boolean;
  has_attack_speed?: boolean;
  has_max_ammo?: boolean;
}

export function getItemPerks(item: ItemWithPerks): { perk: PerkType; value: number }[] {
  const perks: { perk: PerkType; value: number }[] = [];
  
  // Support both new percentage fields and legacy boolean fields
  const wls = item.weapon_lifesteal ?? (item.has_weapon_lifesteal ? 10 : 0);
  const als = item.ability_lifesteal ?? (item.has_ability_lifesteal ? 10 : 0);
  
  if (wls && wls > 0) perks.push({ perk: 'weapon-lifesteal', value: wls });
  if (als && als > 0) perks.push({ perk: 'ability-lifesteal', value: als });
  if (item.shield_bonus && item.shield_bonus > 0) perks.push({ perk: 'shield', value: item.shield_bonus });
  if (item.armor_bonus && item.armor_bonus > 0) perks.push({ perk: 'armor', value: item.armor_bonus });
  if (item.cooldown_reduction && item.cooldown_reduction > 0) perks.push({ perk: 'cooldown', value: item.cooldown_reduction });
  
  return perks;
}
