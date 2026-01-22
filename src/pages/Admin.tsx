import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { Item, ItemCategory, ItemRarity } from '@/types/database';
import { Settings, Search, Save, Loader2, Package, AlertCircle, ChevronDown, ChevronUp, ShieldX } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PerkBadge, PerkType } from '@/components/ui/PerkBadge';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type PendingChanges = {
  [itemId: string]: Partial<Item>;
};

// Define stat fields with their display configuration
// Uses new percentage-based column names from the database
const statFields: { key: keyof Item; label: string; perkType?: PerkType }[] = [
  { key: 'weapon_lifesteal', label: 'W.Lifesteal %', perkType: 'weapon-lifesteal' },
  { key: 'ability_lifesteal', label: 'A.Lifesteal %', perkType: 'ability-lifesteal' },
  { key: 'attack_speed', label: 'Atk Speed %', perkType: 'attack-speed' },
  { key: 'max_ammo', label: 'Max Ammo %', perkType: 'max-ammo' },
  { key: 'shield_bonus', label: 'Shield %', perkType: 'shield' },
  { key: 'armor_bonus', label: 'Armor %', perkType: 'armor' },
  { key: 'cooldown_reduction', label: 'CDR %', perkType: 'cooldown' },
];

export default function Admin() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [pendingChanges, setPendingChanges] = useState<PendingChanges>({});
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Check if user is admin
  useEffect(() => {
    async function checkAdminRole() {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setIsAdmin(false);
        return;
      }

      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      setIsAdmin(!!roles);
    }
    checkAdminRole();
  }, []);

  useEffect(() => {
    async function fetchItems() {
      if (isAdmin === false) return;
      
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
    
    if (isAdmin === true) {
      fetchItems();
    } else if (isAdmin === false) {
      setLoading(false);
    }
  }, [toast, isAdmin]);

  const updateLocalValue = (itemId: string, field: keyof Item, value: string | number | boolean | null) => {
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

  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
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

  const categories: ItemCategory[] = ['weapon', 'ability', 'survival', 'gadget'];
  const rarities: ItemRarity[] = ['common', 'rare', 'epic', 'legendary'];

  if (loading || isAdmin === null) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  if (!isAdmin) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 flex flex-col items-center justify-center gap-4">
          <ShieldX className="h-16 w-16 text-destructive" />
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground text-center">
            You don't have permission to access the admin panel.
          </p>
          <Button onClick={() => navigate('/')}>
            Go Home
          </Button>
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
            Manage all item properties. Click an item to expand and edit all fields.
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
              {statFields.filter(s => s.perkType).map(({ perkType }) => (
                <PerkBadge key={perkType} perk={perkType!} />
              ))}
            </div>

            {/* Items Table */}
            <ScrollArea className="h-[600px]">
              <div className="space-y-2">
                {filteredItems.map(item => {
                  const isModified = !!pendingChanges[item.id];
                  const isExpanded = expandedItems.has(item.id);
                  
                  return (
                    <div 
                      key={item.id}
                      className={`flex flex-col gap-3 p-3 rounded-lg border transition-colors ${
                        isModified 
                          ? 'bg-primary/5 border-primary/30' 
                          : 'bg-card hover:bg-muted/50'
                      }`}
                    >
                      {/* Main Row */}
                      <div className="flex items-center gap-3">
                        {/* Expand Button */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 flex-shrink-0"
                          onClick={() => toggleExpanded(item.id)}
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>

                        {/* Item Image */}
                        <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-muted flex items-center justify-center">
                          {getDisplayValue(item, 'image_url') ? (
                            <img src={getDisplayValue(item, 'image_url') || ''} alt={item.name} className="w-full h-full object-cover" />
                          ) : (
                            <Package className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>

                        {/* Item Name Input */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Input
                              value={getDisplayValue(item, 'name')}
                              onChange={(e) => updateLocalValue(item.id, 'name', e.target.value)}
                              className="h-8 text-sm font-medium"
                              placeholder="Item name"
                            />
                            {isModified && (
                              <Badge variant="outline" className="text-[10px] px-1 py-0 border-primary text-primary flex-shrink-0">
                                Modified
                              </Badge>
                            )}
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
                      </div>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <div className="ml-11 space-y-3 pt-2 border-t border-border/50">
                          {/* Category & Rarity */}
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-xs text-muted-foreground">Category</label>
                              <Select
                                value={getDisplayValue(item, 'category')}
                                onValueChange={(value) => updateLocalValue(item.id, 'category', value as ItemCategory)}
                              >
                                <SelectTrigger className="h-8 text-sm">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {categories.map(cat => (
                                    <SelectItem key={cat} value={cat} className="capitalize">
                                      {cat}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs text-muted-foreground">Rarity</label>
                              <Select
                                value={getDisplayValue(item, 'rarity')}
                                onValueChange={(value) => updateLocalValue(item.id, 'rarity', value as ItemRarity)}
                              >
                                <SelectTrigger className="h-8 text-sm">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {rarities.map(rar => (
                                    <SelectItem key={rar} value={rar} className="capitalize">
                                      {rar}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          {/* Core Stats */}
                          <div className="grid grid-cols-3 gap-3">
                            <div className="space-y-1">
                              <label className="text-xs text-muted-foreground">Damage Bonus %</label>
                              <Input
                                type="number"
                                value={getDisplayValue(item, 'damage_bonus') ?? 0}
                                onChange={(e) => updateLocalValue(item.id, 'damage_bonus', parseInt(e.target.value) || 0)}
                                className="h-8 text-sm"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs text-muted-foreground">Health Bonus</label>
                              <Input
                                type="number"
                                value={getDisplayValue(item, 'health_bonus') ?? 0}
                                onChange={(e) => updateLocalValue(item.id, 'health_bonus', parseInt(e.target.value) || 0)}
                                className="h-8 text-sm"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs text-muted-foreground">Ability Power %</label>
                              <Input
                                type="number"
                                value={getDisplayValue(item, 'ability_power') ?? 0}
                                onChange={(e) => updateLocalValue(item.id, 'ability_power', parseInt(e.target.value) || 0)}
                                className="h-8 text-sm"
                              />
                            </div>
                          </div>

                          {/* Percentage-based Stats */}
                          <div className="grid grid-cols-4 gap-3">
                            {statFields.map(({ key, label, perkType }) => (
                              <div key={key} className="space-y-1">
                                <label className="text-xs text-muted-foreground flex items-center gap-1">
                                  {perkType && <PerkBadge perk={perkType} className="scale-75 origin-left" />}
                                  <span className="hidden sm:inline">{label}</span>
                                </label>
                                <Input
                                  type="number"
                                  value={(getDisplayValue(item, key) as number | null) ?? 0}
                                  onChange={(e) => updateLocalValue(item.id, key, parseInt(e.target.value) || 0)}
                                  className="h-8 text-sm"
                                  min={0}
                                  max={100}
                                />
                              </div>
                            ))}
                          </div>

                          {/* Image URL */}
                          <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">Image URL</label>
                            <Input
                              value={getDisplayValue(item, 'image_url') || ''}
                              onChange={(e) => updateLocalValue(item.id, 'image_url', e.target.value || null)}
                              placeholder="https://example.com/image.png"
                              className="h-8 text-sm"
                            />
                          </div>

                          {/* Description */}
                          <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">Description</label>
                            <Input
                              value={getDisplayValue(item, 'description') || ''}
                              onChange={(e) => updateLocalValue(item.id, 'description', e.target.value)}
                              placeholder="Item description..."
                              className="h-8 text-sm"
                            />
                          </div>

                          {/* Special Effect */}
                          <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">Special Effect</label>
                            <Input
                              value={getDisplayValue(item, 'special_effect') || ''}
                              onChange={(e) => updateLocalValue(item.id, 'special_effect', e.target.value)}
                              placeholder="Special effect description..."
                              className="h-8 text-sm"
                            />
                          </div>
                        </div>
                      )}
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
