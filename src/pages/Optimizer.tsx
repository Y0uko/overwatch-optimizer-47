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
import { useTranslation } from '@/contexts/TranslationContext';

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

  // Calculate synergy bonus for an item based on current build stats
  const calculateSynergyBonus = (item: Item, currentStats: { 
    totalCDR: number; 
    totalAbilityPower: number;
    totalAttackSpeed: number;
    totalLifesteal: number;
  }) => {
    let synergyBonus = 0;
    
    // Ability Power + Cooldown Reduction synergy (capped at 20% CDR)
    const itemCDR = item.cooldown_reduction || 0;
    const itemAP = item.ability_power || 0;
    
    if (itemAP > 0 && currentStats.totalCDR > 0 && currentStats.totalCDR <= 20) {
      synergyBonus += itemAP * (currentStats.totalCDR / 20) * 0.5;
    }
    
    if (itemCDR > 0 && currentStats.totalAbilityPower > 0) {
      const effectiveCDR = Math.min(itemCDR, 20 - currentStats.totalCDR);
      if (effectiveCDR > 0) {
        synergyBonus += effectiveCDR * (currentStats.totalAbilityPower / 50) * 0.3;
      }
    }
    
    // Attack Speed + Weapon Lifesteal synergy
    const itemAS = item.attack_speed || 0;
    const itemWL = item.weapon_lifesteal || 0;
    
    if (itemAS > 0 && currentStats.totalLifesteal > 0) {
      synergyBonus += itemAS * (currentStats.totalLifesteal / 30) * 0.3;
    }
    if (itemWL > 0 && currentStats.totalAttackSpeed > 0) {
      synergyBonus += itemWL * (currentStats.totalAttackSpeed / 40) * 0.3;
    }
    
    return synergyBonus;
  };

  // Calculate item value for knapsack
  const getItemValue = (item: Item, role: string) => {
    const damageValue = (item.damage_bonus || 0) + (item.ability_power || 0) * 0.8;
    const survivalValue = (item.health_bonus || 0) * 0.1 + (item.shield_bonus || 0) * 0.15 + (item.armor_bonus || 0) * 0.2;
    const utilityValue = (item.cooldown_reduction || 0) * 0.5 + (item.attack_speed || 0) * 0.3;
    
    let roleMultiplier = 1;
    if (role === 'damage' && (item.damage_bonus || 0) > 0) roleMultiplier = 1.5;
    if (role === 'tank' && (item.health_bonus || 0) > 0) roleMultiplier = 1.5;
    if (role === 'support' && (item.ability_power || 0) > 0) roleMultiplier = 1.5;
    
    const rarityBonus = { common: 1, rare: 1.1, epic: 1.2, legendary: 1.3 }[item.rarity] || 1;
    
    return (damageValue + survivalValue + utilityValue) * roleMultiplier * rarityBonus;
  };

  // 0/1 Knapsack with max 6 items constraint
  const solveKnapsack = (
    items: Item[], 
    capacity: number, 
    maxItems: number,
    role: string
  ): Item[] => {
    const n = items.length;
    if (n === 0 || capacity <= 0) return [];
    
    // dp[i][w][k] = max value using first i items, weight w, k items selected
    // Optimize: use 2D array [weight][itemCount] and iterate items
    const dp: number[][] = Array.from({ length: capacity + 1 }, () => 
      Array(maxItems + 1).fill(0)
    );
    const keep: boolean[][][] = Array.from({ length: n }, () =>
      Array.from({ length: capacity + 1 }, () => Array(maxItems + 1).fill(false))
    );
    
    for (let i = 0; i < n; i++) {
      const item = items[i];
      const weight = item.cost;
      const value = getItemValue(item, role);
      
      // Iterate backwards to avoid using same item twice
      for (let w = capacity; w >= weight; w--) {
        for (let k = maxItems; k >= 1; k--) {
          const withItem = dp[w - weight][k - 1] + value;
          if (withItem > dp[w][k]) {
            dp[w][k] = withItem;
            keep[i][w][k] = true;
          }
        }
      }
    }
    
    // Find best (w, k) combination
    let bestW = 0, bestK = 0, bestVal = 0;
    for (let w = 0; w <= capacity; w++) {
      for (let k = 0; k <= maxItems; k++) {
        if (dp[w][k] > bestVal) {
          bestVal = dp[w][k];
          bestW = w;
          bestK = k;
        }
      }
    }
    
    // Backtrack to find selected items
    const selected: Item[] = [];
    let w = bestW, k = bestK;
    for (let i = n - 1; i >= 0 && k > 0; i--) {
      if (keep[i][w][k]) {
        selected.push(items[i]);
        w -= items[i].cost;
        k--;
      }
    }
    
    return selected.reverse();
  };

  // Get optimal build using 0/1 Knapsack
  const optimalBuild = useMemo(() => {
    if (!selectedCharacter) return [];
    
    const availableItems = items.filter(
      item => selectedCategory === 'all' || item.category === selectedCategory
    );
    
    return solveKnapsack(availableItems, budget, 6, selectedCharacter.role);
  }, [items, selectedCharacter, budget, selectedCategory]);

  const recommendedItems = useMemo(() => {
    if (!selectedCharacter) return [];
    
    // Current build stats for synergy calculation
    const currentStats = {
      totalCDR: Math.min(20, selectedItems.reduce((sum, i) => sum + (i.cooldown_reduction || 0), 0)),
      totalAbilityPower: selectedItems.reduce((sum, i) => sum + (i.ability_power || 0), 0),
      totalAttackSpeed: selectedItems.reduce((sum, i) => sum + (i.attack_speed || 0), 0),
      totalLifesteal: selectedItems.reduce((sum, i) => sum + (i.weapon_lifesteal || 0) + (i.ability_lifesteal || 0), 0),
    };
    
    // Score items by profitability and synergy with current build
    const scoredItems = items.map(item => {
      const value = getItemValue(item, selectedCharacter.role);
      const profitability = item.cost > 0 ? (value / item.cost) * 1000 : 0;
      const synergyBonus = calculateSynergyBonus(item, currentStats);

      return {
        ...item,
        score: profitability + synergyBonus * 2,
        profitability,
        synergyBonus,
      };
    });

    const selectedIds = new Set(selectedItems.map(i => i.id));
    return scoredItems
      .filter(item => !selectedIds.has(item.id))
      .filter(item => item.cost <= remainingBudget)
      .filter(item => selectedCategory === 'all' || item.category === selectedCategory)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12);
  }, [items, selectedCharacter, remainingBudget, selectedCategory, selectedItems]);

  const { t } = useTranslation();

  const toggleItem = (item: Item) => {
    if (selectedItems.find(i => i.id === item.id)) {
      setSelectedItems(selectedItems.filter(i => i.id !== item.id));
    } else {
      // Check if we can afford and haven't hit item limit
      if (selectedItems.length >= 6) {
        toast({ title: t('optimizer.maxItems'), description: t('optimizer.removeItemToAdd'), variant: 'destructive' });
        return;
      }
      if (item.cost > remainingBudget) {
        toast({ title: t('optimizer.notEnoughBudget'), description: `${t('optimizer.needMore')} ${item.cost - remainingBudget} ${t('optimizer.moreCredits')}`, variant: 'destructive' });
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
    toast({ title: t('optimizer.buildCleared') });
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
    toast({ title: t('optimizer.addedToHistory') });
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
            {t('optimizer.title')}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            {t('optimizer.subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Left: Configuration */}
          <div className="space-y-4 sm:space-y-6">
            {/* Character Selection - shown when no character selected */}
            {!selectedCharacter ? (
              <Card>
                <CardHeader className="pb-2 sm:pb-4">
                  <CardTitle className="text-base sm:text-lg">{t('optimizer.selectCharacter')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-6">
                  {/* Tanks */}
                  <div className="space-y-1.5 sm:space-y-2">
                    <div className="text-xs font-semibold text-role-tank uppercase tracking-wider">{t('optimizer.tank')}</div>
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
                    <div className="text-xs font-semibold text-role-damage uppercase tracking-wider">{t('optimizer.damage')}</div>
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
                    <div className="text-xs font-semibold text-role-support uppercase tracking-wider">{t('optimizer.support')}</div>
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
                        <span className="hidden sm:inline">{t('optimizer.changeHero')}</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Budget & Round Configuration */}
                <Card>
                  <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-4">
                    <div className="space-y-1.5 sm:space-y-2">
                      <Label className="text-sm">{t('optimizer.currentRound')}</Label>
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
                      <Label htmlFor="budget" className="text-sm">{t('optimizer.budget')}</Label>
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
                          <span className="text-muted-foreground">{t('optimizer.spent')}</span>
                          <span className="font-mono font-medium">{totalCost.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-xs sm:text-sm mb-1.5 sm:mb-2">
                          <span className="text-muted-foreground">{t('optimizer.remaining')}</span>
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
                          {selectedItems.length}/6 {t('optimizer.itemsSelected')}
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
                          <span className="hidden sm:inline">{t('optimizer.applyOptimalBuild')} ({optimalBuild.reduce((sum, i) => sum + i.cost, 0).toLocaleString()} {t('optimizer.credits')})</span>
                          <span className="sm:hidden">{t('optimizer.optimal')} ({optimalBuild.reduce((sum, i) => sum + i.cost, 0).toLocaleString()})</span>
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
                      <span className="hidden sm:inline">{t('optimizer.saveToHistory')}</span>
                      <span className="sm:hidden">{t('optimizer.save')}</span>
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
                  {t('optimizer.recommendedItems')}
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  {selectedCharacter 
                    ? remainingBudget > 0 
                      ? `${t('optimizer.affordableItems')} ${selectedCharacter.name} (${remainingBudget.toLocaleString()} ${t('optimizer.creditsLeft')})`
                      : t('optimizer.noBudgetRemaining')
                    : t('optimizer.selectCharacterToSee')
                  }
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-6">
                {/* Category Filter Tabs */}
                <Tabs value={selectedCategory} onValueChange={(v) => setSelectedCategory(v as ItemCategory | 'all')}>
                  <TabsList className="w-full grid grid-cols-5">
                    <TabsTrigger value="all" className="gap-1">
                      {categoryIcons.all}
                      <span className="hidden sm:inline">{t('items.all')}</span>
                    </TabsTrigger>
                    <TabsTrigger value="weapon" className="gap-1">
                      {categoryIcons.weapon}
                      <span className="hidden sm:inline">{t('items.weapon')}</span>
                    </TabsTrigger>
                    <TabsTrigger value="ability" className="gap-1">
                      {categoryIcons.ability}
                      <span className="hidden sm:inline">{t('items.ability')}</span>
                    </TabsTrigger>
                    <TabsTrigger value="survival" className="gap-1">
                      {categoryIcons.survival}
                      <span className="hidden sm:inline">{t('items.survival')}</span>
                    </TabsTrigger>
                    <TabsTrigger value="gadget" className="gap-1">
                      {categoryIcons.gadget}
                      <span className="hidden sm:inline">{t('items.gadget')}</span>
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                {!selectedCharacter ? (
                  <div className="text-center py-12 text-muted-foreground">
                    {t('optimizer.chooseCharacter')}
                  </div>
                ) : recommendedItems.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    {t('optimizer.noItemsAvailable')}{selectedCategory !== 'all' ? ` ${t('optimizer.inCategory')} ${selectedCategory} ${t('optimizer.category')}` : ''}
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
                  {t('optimizer.optimizationHistory')}
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  {t('optimizer.recentOptimizations')}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-6">
                {optimizationHistory.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {t('optimizer.noOptimizationsYet')}
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
                                {entry.items.length} {t('optimizer.items')} • {entry.totalCost} {t('optimizer.credits')}
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
