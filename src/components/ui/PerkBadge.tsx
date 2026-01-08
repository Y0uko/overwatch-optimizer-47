import { cn } from '@/lib/utils';
import { Droplet, Zap, Package } from 'lucide-react';

export type PerkType = 'weapon-lifesteal' | 'ability-lifesteal' | 'attack-speed' | 'max-ammo';

interface PerkBadgeProps {
  perk: PerkType;
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
  'attack-speed': {
    icon: <Zap className="h-2.5 w-2.5 sm:h-3 sm:w-3" />,
    label: 'Atk Speed',
    color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  },
  'max-ammo': {
    icon: <Package className="h-2.5 w-2.5 sm:h-3 sm:w-3" />,
    label: 'Max Ammo',
    color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  },
};

export function PerkBadge({ perk, className }: PerkBadgeProps) {
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
    </span>
  );
}

export interface ItemPerks {
  has_weapon_lifesteal?: boolean;
  has_ability_lifesteal?: boolean;
  has_attack_speed?: boolean;
  has_max_ammo?: boolean;
}

export function getItemPerks(item: ItemPerks): PerkType[] {
  const perks: PerkType[] = [];
  
  if (item.has_weapon_lifesteal) perks.push('weapon-lifesteal');
  if (item.has_ability_lifesteal) perks.push('ability-lifesteal');
  if (item.has_attack_speed) perks.push('attack-speed');
  if (item.has_max_ammo) perks.push('max-ammo');
  
  return perks;
}
