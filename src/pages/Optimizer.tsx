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

  // Character ability tags based on descriptions
  const getCharacterTags = (character: Character): string[] => {
    const tags: string[] = [];
    const desc = (character.description || '').toLowerCase();
    const name = character.name.toLowerCase();
    
    // AOE damage dealers
    if (['freja', 'pharah', 'junkrat', 'sigma', 'doomfist', 'reinhardt'].includes(name)) {
      tags.push('aoe');
    }
    // Slow/CC synergy characters
    if (['mei', 'ana', 'brigitte', 'sigma', 'reinhardt', 'hazard'].includes(name)) {
      tags.push('cc');
    }
    // High mobility characters
    if (['tracer', 'genji', 'lucio', 'd.va', 'winston', 'kiriko'].includes(name)) {
      tags.push('mobility');
    }
    // Healers
    if (['ana', 'mercy', 'moira', 'lucio', 'kiriko', 'zenyatta', 'brigitte', 'juno'].includes(name)) {
      tags.push('healer');
    }
    // Ability-focused
    if (['moira', 'sigma', 'doomfist', 'genji', 'tracer', 'freja'].includes(name)) {
      tags.push('ability-focused');
    }
    // Weapon-focused
    if (['cassidy', 'ashe', 'soldier: 76', 'sojourn', 'reaper'].includes(name)) {
      tags.push('weapon-focused');
    }
    // Airborne/flying
    if (['pharah', 'd.va', 'mercy', 'juno'].includes(name)) {
      tags.push('airborne');
    }
    
    return tags;
  };

  // Parse item special effects for synergy keywords
  const getItemEffectTags = (item: Item): { tags: string[], bonusValue: number } => {
    const effect = (item.special_effect || '').toLowerCase();
    const tags: string[] = [];
    let bonusValue = 0;
    
    // Slow effects - great for AOE damage
    if (effect.includes('slow') || effect.includes('freeze')) {
      tags.push('slow');
      bonusValue += 5;
    }
    // Damage amplification
    if (effect.includes('deal') && (effect.includes('more damage') || effect.includes('bonus damage') || effect.includes('increased damage'))) {
      tags.push('damage-amp');
      bonusValue += 8;
    }
    // Airborne synergy
    if (effect.includes('airborne') || effect.includes('air')) {
      tags.push('airborne');
      bonusValue += 4;
    }
    // Healing synergy
    if (effect.includes('heal') || effect.includes('life')) {
      tags.push('healing');
      bonusValue += 3;
    }
    // Ultimate charge
    if (effect.includes('ultimate') || effect.includes('charge')) {
      tags.push('ultimate');
      bonusValue += 4;
    }
    // Ability synergy
    if (effect.includes('ability') && (effect.includes('power') || effect.includes('damage'))) {
      tags.push('ability-boost');
      bonusValue += 5;
    }
    // Cooldown effects
    if (effect.includes('cooldown')) {
      tags.push('cooldown');
      bonusValue += 3;
    }
    // Move speed
    if (effect.includes('move speed') || effect.includes('speed')) {
      tags.push('mobility');
      bonusValue += 2;
    }
    // Attack speed
    if (effect.includes('attack speed')) {
      tags.push('attack-speed');
      bonusValue += 3;
    }
    // CC/stun effects
    if (effect.includes('stun') || effect.includes('knockback') || effect.includes('hinder')) {
      tags.push('cc');
      bonusValue += 4;
    }
    
    return { tags, bonusValue };
  };

  // Calculate synergy between item effect and character
  const calculateEffectSynergy = (item: Item, character: Character): number => {
    const charTags = getCharacterTags(character);
    const { tags: itemTags, bonusValue } = getItemEffectTags(item);
    
    let synergy = 0;
    
    // AOE + Slow synergy (e.g., Freja + Liquid Nitrogen)
    if (charTags.includes('aoe') && itemTags.includes('slow')) {
      synergy += 15; // High synergy - slow keeps enemies in AOE longer
    }
    
    // CC characters benefit from slow/CC items
    if (charTags.includes('cc') && (itemTags.includes('slow') || itemTags.includes('cc'))) {
      synergy += 8;
    }
    
    // Mobility characters benefit from speed items
    if (charTags.includes('mobility') && itemTags.includes('mobility')) {
      synergy += 10;
    }
    
    // Healers benefit from healing items
    if (charTags.includes('healer') && itemTags.includes('healing')) {
      synergy += 12;
    }
    
    // Ability-focused characters benefit from ability items
    if (charTags.includes('ability-focused') && (itemTags.includes('ability-boost') || itemTags.includes('cooldown'))) {
      synergy += 10;
    }
    
    // Weapon-focused characters benefit from attack speed and damage amp
    if (charTags.includes('weapon-focused') && (itemTags.includes('attack-speed') || itemTags.includes('damage-amp'))) {
      synergy += 10;
    }
    
    // Airborne characters benefit from airborne items
    if (charTags.includes('airborne') && itemTags.includes('airborne')) {
      synergy += 15;
    }
    
    // Ultimate charge is universally good but better for ability-focused
    if (itemTags.includes('ultimate') && charTags.includes('ability-focused')) {
      synergy += 8;
    }
    
    return synergy + bonusValue;
  };

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

  // Calculate item value for knapsack (includes effect synergy with character)
  const getItemValue = (item: Item, character: Character) => {
    const damageValue = (item.damage_bonus || 0) + (item.ability_power || 0) * 0.8;
    const survivalValue = (item.health_bonus || 0) * 0.1 + (item.shield_bonus || 0) * 0.15 + (item.armor_bonus || 0) * 0.2;
    const utilityValue = (item.cooldown_reduction || 0) * 0.5 + (item.attack_speed || 0) * 0.3;
    
    let roleMultiplier = 1;
    if (character.role === 'damage' && (item.damage_bonus || 0) > 0) roleMultiplier = 1.5;
    if (character.role === 'tank' && (item.health_bonus || 0) > 0) roleMultiplier = 1.5;
    if (character.role === 'support' && (item.ability_power || 0) > 0) roleMultiplier = 1.5;
    
    const rarityBonus = { common: 1, rare: 1.1, epic: 1.2, legendary: 1.3 }[item.rarity] || 1;
    
    // Add effect synergy bonus (e.g., Freja + Liquid Nitrogen slow)
    const effectSynergy = calculateEffectSynergy(item, character);
    
    return (damageValue + survivalValue + utilityValue + effectSynergy) * roleMultiplier * rarityBonus;
  };

  // Integer Linear Programming (ILP) using Branch-and-Bound
  // Maximize: Σ(value[i] * x[i]) where x[i] ∈ {0,1}
  // Subject to: Σ(cost[i] * x[i]) <= budget
  //             Σ(x[i]) <= maxItems
  
  interface ILPNode {
    fixed: Map<number, boolean>; // index -> 0 or 1
    upperBound: number;
    solution: number[];
    value: number;
  }

  const solveILP = (
    items: Item[], 
    capacity: number, 
    maxItems: number,
    character: Character
  ): Item[] => {
    const n = items.length;
    if (n === 0 || capacity <= 0) return [];
    
    // ILP Parameters - Tuned for tighter solutions
    const MIP_GAP = 0.001; // 0.1% gap (very tight optimality tolerance)
    const HEURISTIC_FREQUENCY = 3; // Run heuristics every 3 nodes
    const MAX_ITERATIONS = 15000; // Increased iteration limit
    const PROBING_DEPTH = 3; // Depth for probing heuristic
    
    // Pre-compute values for all items
    const values = items.map(item => getItemValue(item, character));
    const costs = items.map(item => item.cost);
    
    // Efficiency ratio for greedy heuristics
    const efficiencyRatio = items.map((_, idx) => 
      costs[idx] > 0 ? values[idx] / costs[idx] : Infinity
    );
    
    // Solve LP relaxation (fractional knapsack) to get upper bound
    const solveLPRelaxation = (fixed: Map<number, boolean>): { upperBound: number; solution: number[] } => {
      const solution = new Array(n).fill(0);
      let remainingCapacity = capacity;
      let remainingSlots = maxItems;
      let totalValue = 0;
      
      // Apply fixed variables
      for (const [idx, val] of fixed) {
        solution[idx] = val ? 1 : 0;
        if (val) {
          remainingCapacity -= costs[idx];
          remainingSlots -= 1;
          totalValue += values[idx];
        }
      }
      
      if (remainingCapacity < 0 || remainingSlots < 0) {
        return { upperBound: -Infinity, solution };
      }
      
      // Sort unfixed items by value-to-weight ratio (efficiency)
      const unfixedItems = items
        .map((_, idx) => idx)
        .filter(idx => !fixed.has(idx))
        .map(idx => ({ idx, ratio: efficiencyRatio[idx] }))
        .sort((a, b) => b.ratio - a.ratio);
      
      for (const { idx } of unfixedItems) {
        if (remainingSlots <= 0) break;
        
        if (costs[idx] <= remainingCapacity) {
          solution[idx] = 1;
          remainingCapacity -= costs[idx];
          remainingSlots -= 1;
          totalValue += values[idx];
        } else if (remainingCapacity > 0) {
          // Fractional relaxation (for upper bound only)
          const fraction = remainingCapacity / costs[idx];
          solution[idx] = fraction;
          totalValue += values[idx] * fraction;
          remainingCapacity = 0;
        }
      }
      
      return { upperBound: totalValue, solution };
    };
    
    // Greedy heuristic to find feasible solutions quickly
    const greedyHeuristic = (fixed: Map<number, boolean>, strategy: 'efficiency' | 'value' | 'hybrid'): { value: number; solution: number[] } => {
      const solution = new Array(n).fill(0);
      let remainingCapacity = capacity;
      let remainingSlots = maxItems;
      let totalValue = 0;
      
      // Apply fixed variables
      for (const [idx, val] of fixed) {
        solution[idx] = val ? 1 : 0;
        if (val) {
          remainingCapacity -= costs[idx];
          remainingSlots -= 1;
          totalValue += values[idx];
        }
      }
      
      if (remainingCapacity < 0 || remainingSlots < 0) {
        return { value: -Infinity, solution };
      }
      
      // Get unfixed items and sort by strategy
      let unfixedItems = items
        .map((_, idx) => idx)
        .filter(idx => !fixed.has(idx) && costs[idx] <= remainingCapacity);
      
      if (strategy === 'efficiency') {
        unfixedItems.sort((a, b) => efficiencyRatio[b] - efficiencyRatio[a]);
      } else if (strategy === 'value') {
        unfixedItems.sort((a, b) => values[b] - values[a]);
      } else {
        // Hybrid: weighted combination
        unfixedItems.sort((a, b) => 
          (values[b] * 0.6 + efficiencyRatio[b] * 100 * 0.4) - 
          (values[a] * 0.6 + efficiencyRatio[a] * 100 * 0.4)
        );
      }
      
      for (const idx of unfixedItems) {
        if (remainingSlots <= 0) break;
        if (costs[idx] <= remainingCapacity) {
          solution[idx] = 1;
          remainingCapacity -= costs[idx];
          remainingSlots -= 1;
          totalValue += values[idx];
        }
      }
      
      return { value: totalValue, solution };
    };
    
    // Probing heuristic - try fixing promising variables
    const probingHeuristic = (fixed: Map<number, boolean>, bestValue: number): { value: number; solution: number[] } | null => {
      const unfixedItems = items
        .map((_, idx) => idx)
        .filter(idx => !fixed.has(idx))
        .sort((a, b) => efficiencyRatio[b] - efficiencyRatio[a])
        .slice(0, PROBING_DEPTH);
      
      let bestProbe = { value: bestValue, solution: new Array(n).fill(0) };
      
      for (const probeIdx of unfixedItems) {
        const probeFixed = new Map(fixed);
        probeFixed.set(probeIdx, true);
        
        const result = greedyHeuristic(probeFixed, 'hybrid');
        if (result.value > bestProbe.value) {
          bestProbe = result;
        }
      }
      
      return bestProbe.value > bestValue ? bestProbe : null;
    };
    
    // RINS-like heuristic (Relaxation Induced Neighborhood Search)
    const rinsHeuristic = (lpSolution: number[], bestSolution: number[], fixed: Map<number, boolean>): { value: number; solution: number[] } | null => {
      const newFixed = new Map(fixed);
      
      // Fix variables where LP and incumbent agree
      for (let i = 0; i < n; i++) {
        if (fixed.has(i)) continue;
        if (lpSolution[i] >= 0.99 && bestSolution[i] === 1) {
          newFixed.set(i, true);
        } else if (lpSolution[i] <= 0.01 && bestSolution[i] === 0) {
          newFixed.set(i, false);
        }
      }
      
      if (newFixed.size <= fixed.size + 2) return null;
      
      return greedyHeuristic(newFixed, 'efficiency');
    };
    
    // Branch-and-Bound algorithm with enhanced heuristics
    let bestValue = -Infinity;
    let bestSolution: number[] = new Array(n).fill(0);
    
    // Initial greedy solutions (run multiple strategies)
    const strategies: ('efficiency' | 'value' | 'hybrid')[] = ['efficiency', 'value', 'hybrid'];
    for (const strategy of strategies) {
      const greedyResult = greedyHeuristic(new Map(), strategy);
      if (greedyResult.value > bestValue) {
        bestValue = greedyResult.value;
        bestSolution = greedyResult.solution;
      }
    }
    
    // Priority queue (max-heap by upper bound)
    const queue: ILPNode[] = [];
    
    // Initial node
    const initialRelax = solveLPRelaxation(new Map());
    queue.push({
      fixed: new Map(),
      upperBound: initialRelax.upperBound,
      solution: initialRelax.solution,
      value: 0
    });
    
    let iterations = 0;
    let heuristicCounter = 0;
    
    while (queue.length > 0 && iterations < MAX_ITERATIONS) {
      iterations++;
      heuristicCounter++;
      
      // Get node with highest upper bound
      queue.sort((a, b) => b.upperBound - a.upperBound);
      const node = queue.shift()!;
      
      // Check MIP gap - terminate if gap is within tolerance
      if (bestValue > 0 && (node.upperBound - bestValue) / bestValue <= MIP_GAP) {
        break; // Gap is tight enough
      }
      
      // Prune if upper bound is worse than best found
      if (node.upperBound <= bestValue) continue;
      
      // Run heuristics frequently
      if (heuristicCounter >= HEURISTIC_FREQUENCY) {
        heuristicCounter = 0;
        
        // Greedy heuristic from current node
        const greedyResult = greedyHeuristic(node.fixed, 'hybrid');
        if (greedyResult.value > bestValue) {
          bestValue = greedyResult.value;
          bestSolution = greedyResult.solution;
        }
        
        // Probing heuristic
        const probeResult = probingHeuristic(node.fixed, bestValue);
        if (probeResult && probeResult.value > bestValue) {
          bestValue = probeResult.value;
          bestSolution = probeResult.solution;
        }
        
        // RINS heuristic when we have an incumbent
        if (bestValue > 0) {
          const rinsResult = rinsHeuristic(node.solution, bestSolution, node.fixed);
          if (rinsResult && rinsResult.value > bestValue) {
            bestValue = rinsResult.value;
            bestSolution = rinsResult.solution;
          }
        }
      }
      
      // Check if solution is integral
      let fractionalIdx = -1;
      let maxFraction = 0;
      for (let i = 0; i < n; i++) {
        if (!node.fixed.has(i) && node.solution[i] > 0.001 && node.solution[i] < 0.999) {
          // Most fractional branching - choose variable closest to 0.5
          const fractionality = Math.abs(node.solution[i] - 0.5);
          if (fractionalIdx === -1 || fractionality < maxFraction) {
            fractionalIdx = i;
            maxFraction = fractionality;
          }
        }
      }
      
      if (fractionalIdx === -1) {
        // All integer solution - check if it's the best
        const intValue = node.solution.reduce((sum, x, i) => sum + (x >= 0.99 ? values[i] : 0), 0);
        const intCost = node.solution.reduce((sum, x, i) => sum + (x >= 0.99 ? costs[i] : 0), 0);
        const intCount = node.solution.filter(x => x >= 0.99).length;
        
        if (intCost <= capacity && intCount <= maxItems && intValue > bestValue) {
          bestValue = intValue;
          bestSolution = node.solution.map(x => x >= 0.99 ? 1 : 0);
        }
        continue;
      }
      
      // Strong branching: evaluate both branches before adding
      const leftFixed = new Map(node.fixed);
      leftFixed.set(fractionalIdx, false);
      const leftRelax = solveLPRelaxation(leftFixed);
      
      const rightFixed = new Map(node.fixed);
      rightFixed.set(fractionalIdx, true);
      const rightRelax = solveLPRelaxation(rightFixed);
      
      // Add nodes in order of upper bound (best first)
      const candidates = [
        { fixed: leftFixed, relax: leftRelax },
        { fixed: rightFixed, relax: rightRelax }
      ].filter(c => c.relax.upperBound > bestValue)
       .sort((a, b) => b.relax.upperBound - a.relax.upperBound);
      
      for (const candidate of candidates) {
        queue.push({
          fixed: candidate.fixed,
          upperBound: candidate.relax.upperBound,
          solution: candidate.relax.solution,
          value: 0
        });
      }
    }
    
    // Convert solution to items
    return items.filter((_, idx) => bestSolution[idx] === 1);
  };

  // Get optimal build using 0/1 Knapsack
  const optimalBuild = useMemo(() => {
    if (!selectedCharacter) return [];
    
    const availableItems = items.filter(
      item => selectedCategory === 'all' || item.category === selectedCategory
    );
    
    return solveILP(availableItems, budget, 6, selectedCharacter);
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
      const value = getItemValue(item, selectedCharacter);
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
