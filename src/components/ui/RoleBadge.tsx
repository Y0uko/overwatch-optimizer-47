import { cn } from '@/lib/utils';
import { CharacterRole } from '@/types/database';
import { Shield, Sword, Heart } from 'lucide-react';

interface RoleBadgeProps {
  role: CharacterRole;
  className?: string;
  showIcon?: boolean;
}

const roleStyles: Record<CharacterRole, string> = {
  tank: 'bg-role-tank/20 text-role-tank border-role-tank/30',
  damage: 'bg-role-damage/20 text-role-damage border-role-damage/30',
  support: 'bg-role-support/20 text-role-support border-role-support/30',
};

const roleIcons: Record<CharacterRole, typeof Shield> = {
  tank: Shield,
  damage: Sword,
  support: Heart,
};

export function RoleBadge({ role, className, showIcon = true }: RoleBadgeProps) {
  const Icon = roleIcons[role];
  
  return (
    <span 
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border capitalize',
        roleStyles[role],
        className
      )}
    >
      {showIcon && <Icon className="h-3 w-3" />}
      {role}
    </span>
  );
}
