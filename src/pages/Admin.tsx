import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { Item } from '@/types/database';
import { Settings, Search, Save, Loader2, Droplet, Zap, Package, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PerkBadge, PerkType } from '@/components/ui/PerkBadge';

export default function Admin() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    async function fetchItems() {
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .order('name');
      
      if (error) {
        toast({ title: 'Error loading items', description: error.message, variant: 'destructive' });
      } else {
        setItems((data as Item[]) || []);
      }
      setLoading(false);
    }
    fetchItems();
  }, [toast]);

  const updatePerk = async (itemId: string, perk: keyof Pick<Item, 'has_weapon_lifesteal' | 'has_ability_lifesteal' | 'has_attack_speed' | 'has_max_ammo'>, value: boolean) => {
    setSaving(itemId);
    
    const { error } = await supabase
      .from('items')
      .update({ [perk]: value })
      .eq('id', itemId);

    if (error) {
      toast({ title: 'Error updating perk', description: error.message, variant: 'destructive' });
    } else {
      setItems(prev => prev.map(item => 
        item.id === itemId ? { ...item, [perk]: value } : item
      ));
      toast({ title: 'Perk updated', description: `${perk.replace('has_', '').replace(/_/g, ' ')} ${value ? 'enabled' : 'disabled'}` });
    }
    
    setSaving(null);
  };

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    item.special_effect?.toLowerCase().includes(search.toLowerCase())
  );

  const perkColumns: { key: keyof Pick<Item, 'has_weapon_lifesteal' | 'has_ability_lifesteal' | 'has_attack_speed' | 'has_max_ammo'>; perkType: PerkType; label: string }[] = [
    { key: 'has_weapon_lifesteal', perkType: 'weapon-lifesteal', label: 'W.Lifesteal' },
    { key: 'has_ability_lifesteal', perkType: 'ability-lifesteal', label: 'A.Lifesteal' },
    { key: 'has_attack_speed', perkType: 'attack-speed', label: 'Atk Speed' },
    { key: 'has_max_ammo', perkType: 'max-ammo', label: 'Max Ammo' },
  ];

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <div className="mb-4 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2 flex items-center gap-2">
            <Settings className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            Admin - Item Perks
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Manage item perks for easy patch note updates.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Item Perk Manager</CardTitle>
            <CardDescription>
              Toggle perks for each item. Changes are saved immediately.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search items..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Perk Legend */}
            <div className="flex flex-wrap gap-2 p-3 bg-muted/50 rounded-lg">
              {perkColumns.map(({ perkType, label }) => (
                <PerkBadge key={perkType} perk={perkType} />
              ))}
            </div>

            {/* Items Table */}
            <ScrollArea className="h-[600px]">
              <div className="space-y-2">
                {filteredItems.map(item => (
                  <div 
                    key={item.id}
                    className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    {/* Item Image */}
                    <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-muted flex items-center justify-center">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <Package className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>

                    {/* Item Info */}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{item.name}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {item.special_effect || 'No special effect'}
                      </div>
                    </div>

                    {/* Perk Toggles */}
                    <div className="flex items-center gap-4">
                      {perkColumns.map(({ key, perkType, label }) => (
                        <label 
                          key={key}
                          className="flex flex-col items-center gap-1 cursor-pointer"
                        >
                          <Checkbox
                            checked={item[key]}
                            onCheckedChange={(checked) => updatePerk(item.id, key, checked as boolean)}
                            disabled={saving === item.id}
                          />
                          <span className="text-[10px] text-muted-foreground hidden sm:block">{label}</span>
                        </label>
                      ))}
                    </div>

                    {/* Saving Indicator */}
                    {saving === item.id && (
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="text-sm text-muted-foreground text-center">
              Showing {filteredItems.length} of {items.length} items
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
