import { useState, useEffect, useMemo } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ItemCard } from '@/components/ItemCard';
import { CharacterCard } from '@/components/CharacterCard';
import { BuildCalculator } from '@/components/BuildCalculator';
import { supabase } from '@/integrations/supabase/client';
import { Character, Item, ItemCategory } from '@/types/database';
import { Calculator, Coins, Zap, History, Clock, Loader2, Sword, Sparkles, Shield, Wrench, Package, X, Trash2, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const categoryIcons: Record<ItemCategory | 'all', React.ReactNode> = {
  all: <Package className="h-4 w-4" />,
  weapon: <Sword className="h-4 w-4" />,
  ability: <Sparkles className="h-4 w-4" />,
  survival: <Shield className="h-4 w-4" />,
  gadget: <Wrench className="h-4 w-4" />,
};

export default function Optimizer() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [budget, setBudget] = useState(3500);
  const [round, setRound] = useState(1);
  const [selectedItems, setSelectedItems] = useState<Item[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<ItemCategory | 'all'>('all');
  const [optimizationHistory, setOptimizationHistory] = useState<Array<{
    character: Character;
    items: Item[];
    totalCost: number;
    timestamp: Date;
  }>>([]);

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

  // Calculate total cost first, then remaining budget
  const totalCost = selectedItems.reduce((sum, item) => sum + item.cost, 0);
  const remainingBudget = budget - totalCost;

  // Get optimal build - best combination of items within budget
  const optimalBuild = useMemo(() => {
    if (!selectedCharacter) return [];
    
    // Score items by efficiency for the character's role
    const scoredItems = items
      .filter(item => selectedCategory === 'all' || item.category === selectedCategory)
      .map(item => {
        const totalStats = (item.damage_bonus || 0) + (item.health_bonus || 0) + (item.ability_power || 0);
        const efficiency = item.cost > 0 ? totalStats / item.cost : 0;
        const rarityBonus = { common: 0, rare: 1, epic: 2, legendary: 3 }[item.rarity] || 0;
        
        let roleBonus = 0;
        if (selectedCharacter.role === 'damage' && (item.damage_bonus || 0) > 0) roleBonus = 3;
        if (selectedCharacter.role === 'tank' && (item.health_bonus || 0) > 0) roleBonus = 3;
        if (selectedCharacter.role === 'support' && (item.ability_power || 0) > 0) roleBonus = 3;

        return {
          ...item,
          score: efficiency * 100 + rarityBonus * 0.5 + roleBonus + totalStats * 0.1,
        };
      })
      .sort((a, b) => b.score - a.score);

    // Greedy algorithm to find best combination within budget
    const selected: typeof scoredItems = [];
    let spent = 0;
    
    for (const item of scoredItems) {
      if (spent + item.cost <= budget && selected.length < 6) {
        selected.push(item);
        spent += item.cost;
      }
    }
    
    return selected;
  }, [items, selectedCharacter, budget, selectedCategory]);

  const recommendedItems = useMemo(() => {
    if (!selectedCharacter) return [];
    
    // Calculate efficiency score (stats per cost)
    const scoredItems = items.map(item => {
      const totalStats = (item.damage_bonus || 0) + (item.health_bonus || 0) + (item.ability_power || 0);
      const efficiency = item.cost > 0 ? totalStats / item.cost : 0;
      const rarityBonus = { common: 0, rare: 1, epic: 2 }[item.rarity] || 0;
      
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

    // Filter by REMAINING budget (dynamic), category, and sort by score
    // Also exclude already selected items
    const selectedIds = new Set(selectedItems.map(i => i.id));
    return scoredItems
      .filter(item => !selectedIds.has(item.id))
      .filter(item => item.cost <= remainingBudget)
      .filter(item => selectedCategory === 'all' || item.category === selectedCategory)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12);
  }, [items, selectedCharacter, remainingBudget, selectedCategory, selectedItems]);

  const toggleItem = (item: Item) => {
    if (selectedItems.find(i => i.id === item.id)) {
      setSelectedItems(selectedItems.filter(i => i.id !== item.id));
    } else {
      // Check if we can afford and haven't hit item limit
      if (selectedItems.length >= 6) {
        toast({ title: 'Maximum 6 items', description: 'Remove an item to add a new one', variant: 'destructive' });
        return;
      }
      if (item.cost > remainingBudget) {
        toast({ title: 'Not enough budget', description: `Need ${item.cost - remainingBudget} more credits`, variant: 'destructive' });
        return;
      }
      setSelectedItems([...selectedItems, item]);
    }
  };

  const removeItem = (itemId: string) => {
    setSelectedItems(selectedItems.filter(i => i.id !== itemId));
  };

  const clearBuild = () => {
    setSelectedItems([]);
    toast({ title: 'Build cleared' });
  };

  // totalCost already calculated above

  // Add to history when items are selected
  const addToHistory = () => {
    if (!selectedCharacter || selectedItems.length === 0) return;
    
    const newEntry = {
      character: selectedCharacter,
      items: [...selectedItems],
      totalCost,
      timestamp: new Date(),
    };
    
    setOptimizationHistory(prev => [newEntry, ...prev.slice(0, 9)]); // Keep last 10
    toast({ title: 'Added to history!' });
  };

  const loadFromHistory = (entry: typeof optimizationHistory[0]) => {
    setSelectedCharacter(entry.character);
    setSelectedItems(entry.items);
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
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <div className="mb-4 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2 flex items-center gap-2">
            <Calculator className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            Item Optimizer
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Select your hero, set your budget, and get optimal item recommendations.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Left: Configuration */}
          <div className="space-y-4 sm:space-y-6">
            {/* Character Selection - shown when no character selected */}
            {!selectedCharacter ? (
              <Card>
                <CardHeader className="pb-2 sm:pb-4">
                  <CardTitle className="text-base sm:text-lg">Select Character</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-6">
                  {/* Tanks */}
                  <div className="space-y-1.5 sm:space-y-2">
                    <div className="text-xs font-semibold text-role-tank uppercase tracking-wider">Tank</div>
                    <div className="flex flex-wrap gap-1.5 sm:gap-2">
                      {characters.filter(c => c.role === 'tank').map(char => (
                        <button
                          key={char.id}
                          onClick={() => setSelectedCharacter(char)}
                          className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border transition-all hover:scale-105 border-border hover:border-role-tank/50 bg-muted/50"
                        >
                          {char.image_url && (
                            <img 
                              src={char.image_url} 
                              alt={char.name}
                              className="w-6 h-6 sm:w-8 sm:h-8 rounded-full object-cover"
                            />
                          )}
                          <span className="text-xs sm:text-sm font-medium">{char.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Damage */}
                  <div className="space-y-1.5 sm:space-y-2">
                    <div className="text-xs font-semibold text-role-damage uppercase tracking-wider">Damage</div>
                    <div className="flex flex-wrap gap-1.5 sm:gap-2">
                      {characters.filter(c => c.role === 'damage').map(char => (
                        <button
                          key={char.id}
                          onClick={() => setSelectedCharacter(char)}
                          className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border transition-all hover:scale-105 border-border hover:border-role-damage/50 bg-muted/50"
                        >
                          {char.image_url && (
                            <img 
                              src={char.image_url} 
                              alt={char.name}
                              className="w-6 h-6 sm:w-8 sm:h-8 rounded-full object-cover"
                            />
                          )}
                          <span className="text-xs sm:text-sm font-medium">{char.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Support */}
                  <div className="space-y-1.5 sm:space-y-2">
                    <div className="text-xs font-semibold text-role-support uppercase tracking-wider">Support</div>
                    <div className="flex flex-wrap gap-1.5 sm:gap-2">
                      {characters.filter(c => c.role === 'support').map(char => (
                        <button
                          key={char.id}
                          onClick={() => setSelectedCharacter(char)}
                          className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border transition-all hover:scale-105 border-border hover:border-role-support/50 bg-muted/50"
                        >
                          {char.image_url && (
                            <img 
                              src={char.image_url} 
                              alt={char.name}
                              className="w-6 h-6 sm:w-8 sm:h-8 rounded-full object-cover"
                            />
                          )}
                          <span className="text-xs sm:text-sm font-medium">{char.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Selected Character with Change Button */}
                <Card>
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-center gap-3">
                      {selectedCharacter.image_url && (
                        <img 
                          src={selectedCharacter.image_url} 
                          alt={selectedCharacter.name}
                          className="w-12 h-12 sm:w-16 sm:h-16 rounded-full object-cover ring-2 ring-primary"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-lg sm:text-xl">{selectedCharacter.name}</h3>
                        <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                          <span className={`capitalize ${
                            selectedCharacter.role === 'damage' ? 'text-role-damage' :
                            selectedCharacter.role === 'tank' ? 'text-role-tank' : 'text-role-support'
                          }`}>
                            {selectedCharacter.role}
                          </span>
                          <span>•</span>
                          <span>HP: {selectedCharacter.health}</span>
                          <span>•</span>
                          <span>DMG: {selectedCharacter.base_damage}</span>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedCharacter(null);
                          setSelectedItems([]);
                        }}
                        className="gap-1.5"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Change</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Budget & Round Configuration */}
                <Card>
                  <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-4">
                    <div className="space-y-1.5 sm:space-y-2">
                      <Label className="text-sm">Current Round</Label>
                      <div className="flex gap-0.5 sm:gap-1">
                        {[1, 2, 3, 4, 5, 6, 7].map(r => (
                          <button
                            key={r}
                            onClick={() => setRound(r)}
                            className={`flex-1 py-1.5 sm:py-2 px-2 sm:px-3 rounded-lg font-bold text-xs sm:text-sm transition-all ${
                              round === r
                                ? 'bg-primary text-primary-foreground ring-2 ring-primary'
                                : 'bg-muted hover:bg-muted/80 text-foreground'
                            }`}
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5 sm:space-y-2">
                      <Label htmlFor="budget" className="text-sm">Budget (Credits)</Label>
                      <div className="relative">
                        <Coins className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="budget"
                          type="number"
                          min={0}
                          step={500}
                          value={budget}
                          onChange={(e) => setBudget(parseInt(e.target.value) || 0)}
                          className="pl-10 h-9 sm:h-10"
                        />
                      </div>
                      
                      {/* Budget Status */}
                      <div className="mt-2 sm:mt-3 p-2 sm:p-3 rounded-lg bg-muted/50 border">
                        <div className="flex justify-between text-xs sm:text-sm mb-1.5 sm:mb-2">
                          <span className="text-muted-foreground">Spent</span>
                          <span className="font-mono font-medium">{totalCost.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-xs sm:text-sm mb-1.5 sm:mb-2">
                          <span className="text-muted-foreground">Remaining</span>
                          <span className={`font-mono font-medium ${remainingBudget < 0 ? 'text-destructive' : 'text-primary'}`}>
                            {remainingBudget.toLocaleString()}
                          </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-1.5 sm:h-2 overflow-hidden">
                          <div 
                            className={`h-full transition-all ${remainingBudget < 0 ? 'bg-destructive' : 'bg-primary'}`}
                            style={{ width: `${Math.min(100, (totalCost / budget) * 100)}%` }}
                          />
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 text-center">
                          {selectedItems.length}/6 items selected
                        </div>
                      </div>
                    </div>

                    {/* Apply Optimal Build Button with Item Icons */}
                    {optimalBuild.length > 0 && (
                      <div className="space-y-2">
                        <Button 
                          onClick={() => setSelectedItems(optimalBuild)}
                          variant="secondary"
                          className="w-full gap-2 h-9 sm:h-10 text-xs sm:text-sm"
                        >
                          <Zap className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          <span className="hidden sm:inline">Apply Optimal Build ({optimalBuild.reduce((sum, i) => sum + i.cost, 0).toLocaleString()} credits)</span>
                          <span className="sm:hidden">Optimal ({optimalBuild.reduce((sum, i) => sum + i.cost, 0).toLocaleString()})</span>
                        </Button>
                        {/* Optimal Build Item Icons */}
                        <div className="flex flex-wrap gap-1.5 justify-center">
                          {optimalBuild.map(item => (
                            <div 
                              key={item.id}
                              className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg overflow-hidden bg-muted border border-border"
                              title={item.name}
                            >
                              {item.image_url ? (
                                <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  {categoryIcons[item.category]}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Build Calculator */}
                <BuildCalculator character={selectedCharacter} items={selectedItems} onRemoveItem={removeItem} />
                
                {selectedItems.length > 0 && (
                  <div className="flex gap-2">
                    <Button onClick={addToHistory} className="flex-1 gap-2 h-9 sm:h-10 text-xs sm:text-sm">
                      <History className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline">Save to History</span>
                      <span className="sm:hidden">Save</span>
                    </Button>
                    <Button onClick={clearBuild} variant="outline" size="icon" className="h-9 w-9 sm:h-10 sm:w-10">
                      <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Right: Recommendations */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="pb-2 sm:pb-4">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <Zap className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  Recommended Items
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  {selectedCharacter 
                    ? remainingBudget > 0 
                      ? `Affordable items for ${selectedCharacter.name} (${remainingBudget.toLocaleString()} credits left)`
                      : `No budget remaining - remove items to see more options`
                    : 'Select a character to see recommendations'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-6">
                {/* Category Filter Tabs */}
                <Tabs value={selectedCategory} onValueChange={(v) => setSelectedCategory(v as ItemCategory | 'all')}>
                  <TabsList className="w-full grid grid-cols-5">
                    <TabsTrigger value="all" className="gap-1">
                      {categoryIcons.all}
                      <span className="hidden sm:inline">All</span>
                    </TabsTrigger>
                    <TabsTrigger value="weapon" className="gap-1">
                      {categoryIcons.weapon}
                      <span className="hidden sm:inline">Weapon</span>
                    </TabsTrigger>
                    <TabsTrigger value="ability" className="gap-1">
                      {categoryIcons.ability}
                      <span className="hidden sm:inline">Ability</span>
                    </TabsTrigger>
                    <TabsTrigger value="survival" className="gap-1">
                      {categoryIcons.survival}
                      <span className="hidden sm:inline">Survival</span>
                    </TabsTrigger>
                    <TabsTrigger value="gadget" className="gap-1">
                      {categoryIcons.gadget}
                      <span className="hidden sm:inline">Gadget</span>
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                {!selectedCharacter ? (
                  <div className="text-center py-12 text-muted-foreground">
                    Choose a character to get started
                  </div>
                ) : recommendedItems.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    No items available within your budget{selectedCategory !== 'all' ? ` in ${selectedCategory} category` : ''}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
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

            {/* Optimization History */}
            <Card className="mt-4 sm:mt-6">
              <CardHeader className="pb-2 sm:pb-4">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  Optimization History
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Your recent optimizations (session only)
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-6">
                {optimizationHistory.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No optimizations yet. Select items and add to history.
                  </div>
                ) : (
                  <ScrollArea className="h-[200px]">
                    <div className="space-y-3">
                      {optimizationHistory.map((entry, index) => (
                        <button
                          key={index}
                          onClick={() => loadFromHistory(entry)}
                          className="w-full p-3 rounded-lg border border-border bg-muted/50 hover:bg-muted transition-all text-left"
                        >
                          <div className="flex items-center gap-3">
                            {entry.character.image_url && (
                              <img 
                                src={entry.character.image_url} 
                                alt={entry.character.name}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">{entry.character.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {entry.items.length} items • {entry.totalCost} credits
                              </div>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {entry.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
