import { useState, useEffect, useMemo } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ItemCard } from '@/components/ItemCard';
import { CharacterCard } from '@/components/CharacterCard';
import { supabase } from '@/integrations/supabase/client';
import { Character, Item } from '@/types/database';
import { Calculator, Coins, Zap, Save, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export default function Optimizer() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [budget, setBudget] = useState(500);
  const [round, setRound] = useState(1);
  const [selectedItems, setSelectedItems] = useState<Item[]>([]);
  const [buildName, setBuildName] = useState('');
  const [savingBuild, setSavingBuild] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    async function fetchData() {
      const [{ data: chars }, { data: itms }] = await Promise.all([
        supabase.from('characters').select('*').order('name'),
        supabase.from('items').select('*').order('cost'),
      ]);
      setCharacters((chars as Character[]) || []);
      setItems((itms as Item[]) || []);
      setLoading(false);
    }
    fetchData();
  }, []);

  const recommendedItems = useMemo(() => {
    if (!selectedCharacter) return [];
    
    // Calculate efficiency score (stats per cost)
    const scoredItems = items.map(item => {
      const totalStats = (item.damage_bonus || 0) + (item.health_bonus || 0) + (item.ability_power || 0);
      const efficiency = totalStats / item.cost;
      const rarityBonus = { common: 0, rare: 1, epic: 2, legendary: 3 }[item.rarity] || 0;
      
      // Bonus for role-appropriate items
      let roleBonus = 0;
      if (selectedCharacter.role === 'damage' && (item.damage_bonus || 0) > 0) roleBonus = 2;
      if (selectedCharacter.role === 'tank' && (item.health_bonus || 0) > 0) roleBonus = 2;
      if (selectedCharacter.role === 'support' && (item.ability_power || 0) > 0) roleBonus = 2;

      return {
        ...item,
        score: efficiency + rarityBonus * 0.1 + roleBonus,
      };
    });

    // Filter by budget and sort by score
    return scoredItems
      .filter(item => item.cost <= budget)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12);
  }, [items, selectedCharacter, budget]);

  const toggleItem = (item: Item) => {
    if (selectedItems.find(i => i.id === item.id)) {
      setSelectedItems(selectedItems.filter(i => i.id !== item.id));
    } else {
      setSelectedItems([...selectedItems, item]);
    }
  };

  const totalCost = selectedItems.reduce((sum, item) => sum + item.cost, 0);
  const totalDamage = selectedItems.reduce((sum, item) => sum + (item.damage_bonus || 0), 0);
  const totalHealth = selectedItems.reduce((sum, item) => sum + (item.health_bonus || 0), 0);
  const totalAbility = selectedItems.reduce((sum, item) => sum + (item.ability_power || 0), 0);

  const saveBuild = async () => {
    if (!user || !selectedCharacter || selectedItems.length === 0) return;
    
    setSavingBuild(true);
    try {
      // Create the build
      const { data: build, error: buildError } = await supabase
        .from('user_builds')
        .insert({
          user_id: user.id,
          character_id: selectedCharacter.id,
          name: buildName || `${selectedCharacter.name} Build`,
        })
        .select()
        .single();

      if (buildError) throw buildError;

      // Add items to build
      const buildItems = selectedItems.map((item, index) => ({
        build_id: build.id,
        item_id: item.id,
        slot_order: index,
      }));

      const { error: itemsError } = await supabase
        .from('build_items')
        .insert(buildItems);

      if (itemsError) throw itemsError;

      toast({ title: 'Build saved successfully!' });
      setBuildName('');
      setDialogOpen(false);
    } catch (error: any) {
      toast({
        title: 'Failed to save build',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSavingBuild(false);
    }
  };

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
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <Calculator className="h-8 w-8 text-primary" />
            Item Optimizer
          </h1>
          <p className="text-muted-foreground">
            Select your hero, set your budget, and get optimal item recommendations.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left: Configuration */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Select Character</Label>
                  <Select 
                    value={selectedCharacter?.id || ''} 
                    onValueChange={(v) => setSelectedCharacter(characters.find(c => c.id === v) || null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a hero..." />
                    </SelectTrigger>
                    <SelectContent>
                      {characters.map(char => (
                        <SelectItem key={char.id} value={char.id}>
                          {char.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="round">Current Round</Label>
                  <Input
                    id="round"
                    type="number"
                    min={1}
                    max={20}
                    value={round}
                    onChange={(e) => setRound(parseInt(e.target.value) || 1)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="budget">Budget (Credits)</Label>
                  <div className="relative">
                    <Coins className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="budget"
                      type="number"
                      min={0}
                      step={50}
                      value={budget}
                      onChange={(e) => setBudget(parseInt(e.target.value) || 0)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {selectedCharacter && (
              <CharacterCard character={selectedCharacter} />
            )}

            {/* Selected Items Summary */}
            {selectedItems.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Selected Items</CardTitle>
                  <CardDescription>
                    {selectedItems.length} items • {totalCost} credits
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div className="text-center p-2 bg-muted rounded-lg">
                      <div className="font-mono font-bold text-role-damage">+{totalDamage}</div>
                      <div className="text-xs text-muted-foreground">Damage</div>
                    </div>
                    <div className="text-center p-2 bg-muted rounded-lg">
                      <div className="font-mono font-bold text-role-support">+{totalHealth}</div>
                      <div className="text-xs text-muted-foreground">Health</div>
                    </div>
                    <div className="text-center p-2 bg-muted rounded-lg">
                      <div className="font-mono font-bold text-rarity-epic">+{totalAbility}</div>
                      <div className="text-xs text-muted-foreground">Ability</div>
                    </div>
                  </div>

                  {user && selectedCharacter && (
                    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                      <DialogTrigger asChild>
                        <Button className="w-full gap-2">
                          <Save className="h-4 w-4" />
                          Save Build
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Save Build</DialogTitle>
                          <DialogDescription>
                            Give your build a name to save it for later.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="buildName">Build Name</Label>
                            <Input
                              id="buildName"
                              value={buildName}
                              onChange={(e) => setBuildName(e.target.value)}
                              placeholder={`${selectedCharacter.name} Build`}
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button onClick={saveBuild} disabled={savingBuild}>
                            {savingBuild && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right: Recommendations */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  Recommended Items
                </CardTitle>
                <CardDescription>
                  {selectedCharacter 
                    ? `Best items for ${selectedCharacter.name} within ${budget} credits`
                    : 'Select a character to see recommendations'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!selectedCharacter ? (
                  <div className="text-center py-12 text-muted-foreground">
                    Choose a character to get started
                  </div>
                ) : recommendedItems.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    No items available within your budget
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {recommendedItems.map(item => (
                      <ItemCard
                        key={item.id}
                        item={item}
                        selected={selectedItems.some(i => i.id === item.id)}
                        onSelect={() => toggleItem(item)}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
