import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Users, Globe } from 'lucide-react';
import { Character } from '@/types/database';

interface HeroRestrictionEditorProps {
  itemId: string;
  characters: Character[];
}

export function HeroRestrictionEditor({ itemId, characters }: HeroRestrictionEditorProps) {
  const [restrictedCharIds, setRestrictedCharIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetchRestrictions();
  }, [itemId]);

  const fetchRestrictions = async () => {
    const { data } = await supabase
      .from('item_character_restrictions')
      .select('character_id')
      .eq('item_id', itemId);

    setRestrictedCharIds(new Set((data || []).map(r => r.character_id)));
    setLoading(false);
  };

  const toggleCharacter = async (characterId: string) => {
    setSaving(true);
    const newSet = new Set(restrictedCharIds);

    if (newSet.has(characterId)) {
      newSet.delete(characterId);
      await supabase
        .from('item_character_restrictions')
        .delete()
        .eq('item_id', itemId)
        .eq('character_id', characterId);
    } else {
      newSet.add(characterId);
      await supabase
        .from('item_character_restrictions')
        .insert({ item_id: itemId, character_id: characterId });
    }

    setRestrictedCharIds(newSet);
    setSaving(false);
  };

  const clearAll = async () => {
    setSaving(true);
    await supabase
      .from('item_character_restrictions')
      .delete()
      .eq('item_id', itemId);
    setRestrictedCharIds(new Set());
    setSaving(false);
  };

  const isGeneral = restrictedCharIds.size === 0;

  if (loading) return <span className="text-xs text-muted-foreground">Loading...</span>;

  return (
    <div className="space-y-1">
      <label className="text-xs text-muted-foreground">Hero Restriction</label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="w-full h-8 justify-start text-sm gap-2"
            disabled={saving}
          >
            {isGeneral ? (
              <>
                <Globe className="h-3.5 w-3.5 text-green-500" />
                <span>All Heroes</span>
              </>
            ) : (
              <>
                <Users className="h-3.5 w-3.5 text-amber-500" />
                <span>{restrictedCharIds.size} hero{restrictedCharIds.size > 1 ? 'es' : ''}</span>
              </>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3" align="start">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Restrict to heroes</span>
              {!isGeneral && (
                <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={clearAll}>
                  Clear all
                </Button>
              )}
            </div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {characters.map(char => (
                <label
                  key={char.id}
                  className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/50 cursor-pointer"
                >
                  <Checkbox
                    checked={restrictedCharIds.has(char.id)}
                    onCheckedChange={() => toggleCharacter(char.id)}
                  />
                  <span className="text-sm">{char.name}</span>
                  <Badge variant="outline" className="ml-auto text-[10px] capitalize">
                    {char.role}
                  </Badge>
                </label>
              ))}
            </div>
            {isGeneral && (
              <p className="text-xs text-muted-foreground">
                No restrictions — available to all heroes.
              </p>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
