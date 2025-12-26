import { Character } from '@/types/database';
import { Card, CardContent } from '@/components/ui/card';
import { RoleBadge } from '@/components/ui/RoleBadge';
import { Heart, Sword, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CharacterCardProps {
  character: Character;
  selected?: boolean;
  onSelect?: () => void;
}

export function CharacterCard({ character, selected, onSelect }: CharacterCardProps) {
  return (
    <Card 
      className={cn(
        'transition-all cursor-pointer hover:shadow-md',
        selected && 'ring-2 ring-primary shadow-lg'
      )}
      onClick={onSelect}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
            {character.image_url ? (
              <img 
                src={character.image_url} 
                alt={character.name}
                className="h-full w-full object-cover rounded-lg"
              />
            ) : (
              <User className="h-6 w-6 text-muted-foreground" />
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold truncate">{character.name}</h3>
              <RoleBadge role={character.role} />
            </div>
            
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Heart className="h-3.5 w-3.5 text-role-support" />
                {character.health}
              </span>
              <span className="flex items-center gap-1">
                <Sword className="h-3.5 w-3.5 text-role-damage" />
                {character.base_damage}
              </span>
            </div>
          </div>
        </div>
        
        {character.description && (
          <p className="mt-3 text-sm text-muted-foreground line-clamp-2">
            {character.description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
