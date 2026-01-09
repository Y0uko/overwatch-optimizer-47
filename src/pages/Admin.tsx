import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { Item } from '@/types/database';
import { Settings, Search, Save, Loader2, Package, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PerkBadge, PerkType } from '@/components/ui/PerkBadge';
import { Badge } from '@/components/ui/badge';

type PendingChanges = {
  [itemId: string]: Partial<Pick<Item, 'cost' | 'description' | 'has_weapon_lifesteal' | 'has_ability_lifesteal' | 'has_attack_speed' | 'has_max_ammo'>>;
};

export default function Admin() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [pendingChanges, setPendingChanges] = useState<PendingChanges>({});
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

  const updateLocalValue = (itemId: string, field: keyof PendingChanges[string], value: string | number | boolean) => {
    setPendingChanges(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: value
      }
    }));
  };

  const getDisplayValue = <K extends keyof Item>(item: Item, field: K): Item[K] => {
    const pending = pendingChanges[item.id];
    if (pending && field in pending) {
      return pending[field as keyof typeof pending] as Item[K];
    }
    return item[field];
  };

  const hasChanges = Object.keys(pendingChanges).length > 0;
  const changedItemsCount = Object.keys(pendingChanges).length;

  const saveAllChanges = async () => {
    if (!hasChanges) return;
    
    setSaving(true);
    let successCount = 0;
    let errorCount = 0;

    for (const [itemId, changes] of Object.entries(pendingChanges)) {
      const { error } = await supabase
        .from('items')
        .update(changes)
        .eq('id', itemId);

      if (error) {
        errorCount++;
        console.error(`Error updating item ${itemId}:`, error);
      } else {
        successCount++;
        // Update local state
        setItems(prev => prev.map(item => 
          item.id === itemId ? { ...item, ...changes } : item
        ));
      }
    }

    setPendingChanges({});
    setSaving(false);

    if (errorCount > 0) {
      toast({ 
        title: 'Partial save completed', 
        description: `${successCount} items updated, ${errorCount} failed`, 
        variant: 'destructive' 
      });
    } else {
      toast({ 
        title: 'All changes saved', 
        description: `${successCount} items updated successfully` 
      });
    }
  };

  const discardChanges = () => {
    setPendingChanges({});
    toast({ title: 'Changes discarded' });
  };

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    item.special_effect?.toLowerCase().includes(search.toLowerCase())
  );

  const perkColumns: { key: keyof Pick<Item, 'has_weapon_lifesteal' | 'has_ability_lifesteal' | 'has_attack_speed' | 'has_max_ammo'>; perkType: PerkType; label: string }[] = [
    { key: 'has_weapon_lifesteal', perkType: 'weapon-lifesteal', label: 'W.LS' },
    { key: 'has_ability_lifesteal', perkType: 'ability-lifesteal', label: 'A.LS' },
    { key: 'has_attack_speed', perkType: 'attack-speed', label: 'AS' },
    { key: 'has_max_ammo', perkType: 'max-ammo', label: 'Ammo' },
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
            Admin - Item Manager
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Manage item perks, prices, and descriptions. Changes are saved in bulk.
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle>Item Manager</CardTitle>
                <CardDescription>
                  Edit items below, then save all changes at once.
                </CardDescription>
              </div>
              
              {/* Bulk Actions Bar */}
              {hasChanges && (
                <div className="flex items-center gap-2 p-2 bg-primary/10 rounded-lg border border-primary/20">
                  <AlertCircle className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">
                    {changedItemsCount} item{changedItemsCount > 1 ? 's' : ''} modified
                  </span>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={discardChanges}
                    disabled={saving}
                  >
                    Discard
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={saveAllChanges}
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-1" />
                        Save All
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
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
              {perkColumns.map(({ perkType }) => (
                <PerkBadge key={perkType} perk={perkType} />
              ))}
            </div>

            {/* Items Table */}
            <ScrollArea className="h-[600px]">
              <div className="space-y-2">
                {filteredItems.map(item => {
                  const isModified = !!pendingChanges[item.id];
                  
                  return (
                    <div 
                      key={item.id}
                      className={`flex flex-col gap-3 p-3 rounded-lg border transition-colors ${
                        isModified 
                          ? 'bg-primary/5 border-primary/30' 
                          : 'bg-card hover:bg-muted/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Item Image */}
                        <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-muted flex items-center justify-center">
                          {item.image_url ? (
                            <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                          ) : (
                            <Package className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>

                        {/* Item Name & Modified Badge */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm truncate">{item.name}</span>
                            {isModified && (
                              <Badge variant="outline" className="text-[10px] px-1 py-0 border-primary text-primary">
                                Modified
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {item.special_effect || 'No special effect'}
                          </div>
                        </div>

                        {/* Price Input */}
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-muted-foreground">$</span>
                          <Input
                            type="number"
                            value={getDisplayValue(item, 'cost')}
                            onChange={(e) => updateLocalValue(item.id, 'cost', parseInt(e.target.value) || 0)}
                            className="w-20 h-8 text-sm"
                          />
                        </div>

                        {/* Perk Toggles */}
                        <div className="flex items-center gap-3">
                          {perkColumns.map(({ key, label }) => (
                            <label 
                              key={key}
                              className="flex flex-col items-center gap-1 cursor-pointer"
                            >
                              <Checkbox
                                checked={getDisplayValue(item, key)}
                                onCheckedChange={(checked) => updateLocalValue(item.id, key, checked as boolean)}
                              />
                              <span className="text-[10px] text-muted-foreground hidden sm:block">{label}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Description Input */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-16 flex-shrink-0">Desc:</span>
                        <Input
                          value={getDisplayValue(item, 'description') || ''}
                          onChange={(e) => updateLocalValue(item.id, 'description', e.target.value)}
                          placeholder="Item description..."
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                  );
                })}
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