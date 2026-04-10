import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
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
import { RoundHistory } from '@/components/RoundHistory';
import { useRoundHistory, RoundEntry } from '@/hooks/useRoundHistory';
import { supabase } from '@/integrations/supabase/client';
import { Character, Item, ItemCategory } from '@/types/database';
import { Calculator, Coins, Zap, Loader2, Sword, Sparkles, Shield, Wrench, Package, Trash2, Plus, RotateCcw, Heart } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/contexts/TranslationContext';

const categoryIcons: Record<ItemCategory | 'all', React.ReactNode> = {
  all: <Package className="h-4 w-4" />,
  weapon: <Sword className="h-4 w-4" />,
  ability: <Sparkles className="h-4 w-4" />,
  survival: <Shield className="h-4 w-4" />,
  gadget: <Wrench className="h-4 w-4" />,
};

type StatPriority = 'ability' | 'damage' | 'survival';

export default function Optimizer() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [restrictions, setRestrictions] = useState<{ item_id: string; character_id: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [budget, setBudget] = useState<number | ''>(3500);
  const [round, setRound] = useState(1);
  const [selectedItems, setSelectedItems] = useState<Item[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<ItemCategory | 'all'>('all');
  const [statPriority, setStatPriority] = useState<StatPriority>('ability');

  const { 
    history: roundHistory, 
    loading: historyLoading, 
    isAuthenticated,
    saveRound: saveRoundToDb,
    clearHistory: clearRoundHistoryDb 
  } = useRoundHistory();

  const { toast } = useToast();

  useEffect(() => {
    async function fetchData() {
      const [{ data: chars }, { data: itms }, { data: restr }] = await Promise.all([
        supabase.from('characters').select('*').order('name'),
        supabase.from('items').select('*').order('cost'),
        supabase.from('item_character_restrictions').select('item_id, character_id'),
      ]);
      setCharacters((chars as Character[]) || []);
      setItems((itms as Item[]) || []);
      setRestrictions(restr || []);
      setLoading(false);
    }
    fetchData();
  }, []);

  // Calculate total cost first, then remaining budget
  const totalCost = selectedItems.reduce((sum, item) => sum + item.cost, 0);
  const effectiveBudget = budget === '' ? 0 : budget;
  const remainingBudget = effectiveBudget - totalCost;

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

  // Parse item special effects AND description for synergy keywords
  // Description is considered but with lower priority than special_effect
  const getItemEffectTags = (item: Item): { tags: string[], bonusValue: number } => {
    const effect = (item.special_effect || '').toLowerCase();
    const description = (item.description || '').toLowerCase();
    const tags: string[] = [];
    let bonusValue = 0;
    
    // Helper to check both effect and description, with different weights
    const checkKeyword = (keywords: string[], tagName: string, effectBonus: number, descBonus: number) => {
      const inEffect = keywords.some(kw => effect.includes(kw));
      const inDesc = keywords.some(kw => description.includes(kw));
      
      if (inEffect || inDesc) {
        tags.push(tagName);
        // Effect gets full bonus, description gets reduced bonus (lower priority)
        bonusValue += inEffect ? effectBonus : descBonus;
      }
    };
    
    // Slow effects - great for AOE damage
    checkKeyword(['slow', 'freeze'], 'slow', 5, 2);
    
    // Damage amplification
    if ((effect.includes('deal') || description.includes('deal')) && 
        (effect.includes('more damage') || effect.includes('bonus damage') || effect.includes('increased damage') ||
         description.includes('more damage') || description.includes('bonus damage') || description.includes('increased damage'))) {
      tags.push('damage-amp');
      bonusValue += effect.includes('damage') ? 8 : 3;
    }
    
    // Airborne synergy
    checkKeyword(['airborne', 'air'], 'airborne', 4, 1.5);
    
    // Healing synergy
    checkKeyword(['heal', 'life', 'restore'], 'healing', 3, 1);
    
    // Ultimate charge
    checkKeyword(['ultimate', 'charge'], 'ultimate', 4, 1.5);
    
    // Ability synergy
    if ((effect.includes('ability') || description.includes('ability')) && 
        (effect.includes('power') || effect.includes('damage') ||
         description.includes('power') || description.includes('damage'))) {
      tags.push('ability-boost');
      bonusValue += effect.includes('ability') ? 5 : 2;
    }
    
    // Cooldown effects
    checkKeyword(['cooldown'], 'cooldown', 3, 1);
    
    // Move speed
    checkKeyword(['move speed', 'speed', 'movement'], 'mobility', 2, 0.8);
    
    // Attack speed
    checkKeyword(['attack speed'], 'attack-speed', 3, 1);
    
    // CC/stun effects
    checkKeyword(['stun', 'knockback', 'hinder', 'root', 'disable'], 'cc', 4, 1.5);
    
    // Shield/survivability from description
    checkKeyword(['shield', 'barrier', 'protect'], 'defensive', 2, 0.8);
    
    // Burst damage from description
    checkKeyword(['burst', 'execute', 'critical', 'crit'], 'burst', 3, 1.2);
    
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
    const utilityValue = (item.cooldown_reduction || 0) * 0.5;
    
    let roleMultiplier = 1;
    if (character.role === 'damage' && (item.damage_bonus || 0) > 0) roleMultiplier = 1.5;
    if (character.role === 'tank' && (item.health_bonus || 0) > 0) roleMultiplier = 1.5;
    if (character.role === 'support' && (item.ability_power || 0) > 0) roleMultiplier = 1.5;
    
    const rarityBonus = { common: 1, rare: 1.1, epic: 1.2, legendary: 1.3 }[item.rarity] || 1;
    
    // Add effect synergy bonus (e.g., Freja + Liquid Nitrogen slow)
    const effectSynergy = calculateEffectSynergy(item, character);
    
    return (damageValue + survivalValue + utilityValue + effectSynergy) * roleMultiplier * rarityBonus;
  };

  // 3D Dynamic Programming for Build Optimization
  // Priority: MAXIMIZE item count first, then maximize target stat (ability/damage/survival)
  // Dimensions: [budget used][item count] with item iteration
  // Subject to: total cost <= budget, item count <= maxItems
  
  // User-selected stat priority is used instead of character role-based
  
  const getItemStatValue = (item: Item, priority: StatPriority): number => {
    switch (priority) {
      case 'ability':
        return (item.ability_power || 0) + 
               (item.cooldown_reduction || 0) * 0.8 + 
               (item.ability_lifesteal || 0) * 0.3;
      case 'damage':
        return (item.damage_bonus || 0) + 
               (item.weapon_lifesteal || 0) * 0.3;
      case 'survival':
        return (item.health_bonus || 0) * 0.1 + 
               (item.shield_bonus || 0) * 0.15 + 
               (item.armor_bonus || 0) * 0.2;
    }
  };

  // Check if adding an item would exceed stat caps for the given priority
  const getCapPenalty = (item: Item, currentItems: Item[], priority: StatPriority): number => {
    if (priority === 'ability') {
      const currentCDR = currentItems.reduce((sum, i) => sum + (i.cooldown_reduction || 0), 0);
      const itemCDR = item.cooldown_reduction || 0;
      if (itemCDR > 0 && currentCDR >= 20) return -100; // Already at cap, penalize heavily
      const overflow = Math.max(0, currentCDR + itemCDR - 20);
      return -overflow * 2; // Penalize wasted CDR
    }
    if (priority === 'damage') {
      return 0;
    }
    return 0;
  };

  // Compute effective stat value respecting caps
  const getItemStatValueCapped = (item: Item, selectedSoFar: Item[], priority: StatPriority): number => {
    const base = getItemStatValue(item, priority);
    const penalty = getCapPenalty(item, selectedSoFar, priority);
    return Math.max(0, base + penalty);
  };
  
  const solve3DDP = (
    items: Item[], 
    capacity: number, 
    maxItems: number,
    priority: StatPriority
  ): Item[] => {
    const n = items.length;
    if (n === 0 || capacity <= 0 || maxItems <= 0) return [];
    
    // Pre-compute stat values and costs
    // Use stat-focused values for optimization
    const statValues = items.map(item => Math.round(getItemStatValue(item, priority) * 100));
    const costs = items.map(item => item.cost);
    
    // Scale budget for efficiency (use increments of 10 for better precision)
    const BUDGET_SCALE = 10;
    const scaledCapacity = Math.floor(capacity / BUDGET_SCALE) + 1;
    const scaledCosts = costs.map(c => Math.ceil(c / BUDGET_SCALE));
    
    // DP table: dp[budget][itemCount] = { statValue, items }
    // Priority: More items > Higher stat value
    type DPCell = {
      statValue: number;
      items: number[]; // indices of selected items
    };
    
    // Initialize DP table
    const dp: DPCell[][] = Array.from({ length: scaledCapacity + 1 }, () =>
      Array.from({ length: maxItems + 1 }, () => ({ statValue: -1, items: [] }))
    );
    
    // Base case: 0 budget, 0 items = 0 value
    dp[0][0] = { statValue: 0, items: [] };
    
    // Fill DP table - iterate through each item
    for (let i = 0; i < n; i++) {
      const itemCost = scaledCosts[i];
      const itemStatValue = statValues[i];
      
      // Skip items that cost more than total budget
      if (itemCost > scaledCapacity) continue;
      
      // Traverse backwards to avoid using same item twice
      for (let b = scaledCapacity; b >= itemCost; b--) {
        for (let k = maxItems; k >= 1; k--) {
          const prevBudget = b - itemCost;
          const prevCount = k - 1;
          
          // Check if previous state is valid
          if (prevBudget >= 0 && dp[prevBudget][prevCount].statValue >= 0) {
            const newStatValue = dp[prevBudget][prevCount].statValue + itemStatValue;
            const newItemCount = k;
            const currentItemCount = dp[b][k].items.length;
            
            // Priority: More items first, then higher stat value
            const shouldUpdate = 
              dp[b][k].statValue < 0 || // No solution yet
              newItemCount > currentItemCount || // More items is better
              (newItemCount === currentItemCount && newStatValue > dp[b][k].statValue); // Same items, better stats
            
            if (shouldUpdate) {
              dp[b][k] = {
                statValue: newStatValue,
                items: [...dp[prevBudget][prevCount].items, i]
              };
            }
          }
        }
      }
    }
    
    // Find the best solution: prioritize MAX ITEM COUNT, then MAX STAT VALUE
    let bestItemCount = 0;
    let bestStatValue = -1;
    let bestItems: number[] = [];
    
    for (let b = 0; b <= scaledCapacity; b++) {
      for (let k = 0; k <= maxItems; k++) {
        if (dp[b][k].statValue < 0) continue;
        
        // Verify actual cost fits in budget (accounting for scaling)
        const actualCost = dp[b][k].items.reduce((sum, idx) => sum + costs[idx], 0);
        if (actualCost > capacity) continue;
        
        const itemCount = dp[b][k].items.length;
        const statValue = dp[b][k].statValue;
        
        // Prioritize: more items > higher stat value
        if (itemCount > bestItemCount || 
            (itemCount === bestItemCount && statValue > bestStatValue)) {
          bestItemCount = itemCount;
          bestStatValue = statValue;
          bestItems = dp[b][k].items;
        }
      }
    }
    
    // Refinement pass: try to fit additional items in remaining budget
    // Prioritize items with the target stat, respecting caps
    if (bestItems.length < maxItems) {
      const selectedSet = new Set(bestItems);
      const currentCost = bestItems.reduce((sum, idx) => sum + costs[idx], 0);
      const remainingBudget = capacity - currentCost;
      const remainingSlots = maxItems - bestItems.length;
      const currentSelectedItems = bestItems.map(idx => items[idx]);
      
      // Find items that fit in remaining budget, scored with cap awareness
      const candidates = items
        .map((item, idx) => ({ 
          idx, 
          statValue: getItemStatValueCapped(item, currentSelectedItems, priority), 
          cost: costs[idx],
          hasTargetStat: getItemStatValue(item, priority) > 0
        }))
        .filter(item => !selectedSet.has(item.idx) && item.cost <= remainingBudget)
        // Sort by: has target stat > stat value
        .sort((a, b) => {
          if (a.hasTargetStat !== b.hasTargetStat) {
            return a.hasTargetStat ? -1 : 1;
          }
          return b.statValue - a.statValue;
        });
      
      let budgetLeft = remainingBudget;
      let slotsLeft = remainingSlots;
      
      // Greedy fill: try to spend as much remaining budget as possible
      while (slotsLeft > 0) {
        const bestCandidate = candidates.find(c => 
          !selectedSet.has(c.idx) && c.cost <= budgetLeft
        );
        if (!bestCandidate) break;
        
        bestItems.push(bestCandidate.idx);
        selectedSet.add(bestCandidate.idx);
        budgetLeft -= bestCandidate.cost;
        slotsLeft--;
      }
    }
    
    // Convert indices back to items, sorted by stat contribution
    return bestItems
      .map(idx => items[idx])
      .sort((a, b) => getItemStatValue(b, priority) - getItemStatValue(a, priority));
  };

  // Filter items to only those available for the selected hero
  const heroFilteredItems = useMemo(() => {
    if (!selectedCharacter) return items;
    return items.filter(item => {
      const itemRestrictions = restrictions.filter(r => r.item_id === item.id);
      // No restrictions = general item, available to all
      if (itemRestrictions.length === 0) return true;
      // Has restrictions = only available if hero is in the list
      return itemRestrictions.some(r => r.character_id === selectedCharacter.id);
    });
  }, [items, restrictions, selectedCharacter]);

  // Get optimal build using 3D Dynamic Programming
  const optimalBuild = useMemo(() => {
    if (!selectedCharacter) return [];
    
    const availableItems = heroFilteredItems.filter(
      item => selectedCategory === 'all' || item.category === selectedCategory
    );
    
    let result = solve3DDP(availableItems, effectiveBudget, 6, statPriority);

    // If user can't afford any epic item, ensure at least one survival item is included
    const cheapestEpic = heroFilteredItems
      .filter(i => i.rarity === 'epic' || i.rarity === 'legendary')
      .sort((a, b) => a.cost - b.cost)[0];
    
    const cantAffordEpic = !cheapestEpic || effectiveBudget < cheapestEpic.cost;
    const hasSurvivalItem = result.some(i => i.category === 'survival');
    
    if (cantAffordEpic && !hasSurvivalItem) {
      const currentCost = result.reduce((sum, i) => sum + i.cost, 0);
      const budgetLeft = effectiveBudget - currentCost;

      // Find the best survival item that fits in remaining budget
      const survivalCandidates = availableItems
        .filter(i => i.category === 'survival' && i.cost <= budgetLeft && !result.some(r => r.id === i.id))
        .sort((a, b) => getItemStatValue(b, 'survival') - getItemStatValue(a, 'survival'));
      
      if (survivalCandidates.length > 0) {
        if (result.length < 6) {
          // Room available, just add it
          result = [...result, survivalCandidates[0]];
        } else {
          // Replace the weakest item only if the swap keeps us within budget
          const weakest = result[result.length - 1];
          const newBudgetLeft = budgetLeft + weakest.cost;
          const candidate = availableItems
            .filter(i => i.category === 'survival' && i.cost <= newBudgetLeft && !result.slice(0, -1).some(r => r.id === i.id))
            .sort((a, b) => getItemStatValue(b, 'survival') - getItemStatValue(a, 'survival'))[0];
          if (candidate) {
            result = [...result.slice(0, -1), candidate];
          }
        }
      }
    }

    return result;
  }, [heroFilteredItems, selectedCharacter, effectiveBudget, selectedCategory, statPriority]);

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
    const scoredItems = heroFilteredItems.map(item => {
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
  }, [heroFilteredItems, selectedCharacter, remainingBudget, selectedCategory, selectedItems]);

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

  // Add round to history with complete budget tracking
  const saveRound = async () => {
    if (!selectedCharacter) return;
    
    const success = await saveRoundToDb({
      round,
      character: selectedCharacter,
      items: [...selectedItems],
      budgetAtStart: effectiveBudget,
      budgetSpent: totalCost,
      budgetRemaining: remainingBudget,
    });
    
    if (success) {
      // Auto-advance to next round with 9000 added to last budget
      const nextRound = Math.min(round + 1, 7);
      setRound(nextRound);
      setBudget(effectiveBudget + 9000); // Add 9000 to last inputted budget
      setSelectedItems([]);
      
      toast({ title: `Round ${round} saved! Starting round ${nextRound}` });
    }
  };

  const loadFromHistory = (entry: RoundEntry) => {
    setSelectedCharacter(entry.character);
    setSelectedItems(entry.items);
    setBudget(entry.budgetAtStart);
    setRound(entry.round);
  };

  const clearRoundHistory = () => {
    clearRoundHistoryDb();
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

        <div className="relative">
          {/* Hero portrait floating on the left */}
          {selectedCharacter?.image_url && (
            <motion.div
              key={selectedCharacter.id}
              initial={{ opacity: 0, x: -60, rotateY: 15 }}
              animate={{ opacity: 1, x: 0, rotateY: 0 }}
              exit={{ opacity: 0, x: -60 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="hidden xl:block fixed left-6 top-1/2 -translate-y-1/2 z-10 pointer-events-none"
              style={{ perspective: '1000px' }}
            >
              <motion.div
                animate={{ rotateY: [0, 6, 0, -6, 0], rotateX: [0, 3, 0, -3, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                className="relative"
                style={{ transformStyle: 'preserve-3d' }}
              >
                <img
                  src={selectedCharacter.image_url}
                  alt={selectedCharacter.name}
                  className="h-[420px] w-auto object-contain opacity-70"
                  style={{ filter: 'drop-shadow(0 0 60px hsl(var(--primary) / 0.25))' }}
                />
                {/* Glow effect behind */}
                <div className="absolute inset-0 -z-10 blur-3xl opacity-20 bg-primary rounded-full scale-75" />
              </motion.div>
            </motion.div>
          )}

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
                          className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl border transition-all duration-200 hover:scale-105 border-white/10 hover:border-role-tank/40 bg-white/[0.04] hover:bg-role-tank/10 hover:shadow-[0_4px_16px_rgba(0,0,0,0.2)]"
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
                          className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl border transition-all duration-200 hover:scale-105 border-white/10 hover:border-role-damage/40 bg-white/[0.04] hover:bg-role-damage/10 hover:shadow-[0_4px_16px_rgba(0,0,0,0.2)]"
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
                          className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl border transition-all duration-200 hover:scale-105 border-white/10 hover:border-role-support/40 bg-white/[0.04] hover:bg-role-support/10 hover:shadow-[0_4px_16px_rgba(0,0,0,0.2)]"
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
                        <RotateCcw className="h-3.5 w-3.5" />
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
                            className={`flex-1 py-1.5 sm:py-2 px-2 sm:px-3 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 ${
                              round === r
                                ? 'bg-primary text-primary-foreground ring-2 ring-primary shadow-[0_0_12px_rgba(var(--primary),0.3)]'
                                : 'bg-white/[0.04] hover:bg-white/[0.08] text-foreground border border-white/10'
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
                          value={budget === '' ? '' : budget}
                          placeholder="0"
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '') {
                              setBudget('');
                            } else {
                              setBudget(parseInt(val) || 0);
                            }
                          }}
                          className="pl-10 h-9 sm:h-10"
                        />
                      </div>
                      
                      {/* Stat Priority Selector */}
                      <div className="mt-2 sm:mt-3">
                        <Label className="text-sm mb-1.5 block">Stat Priority</Label>
                        <div className="flex gap-1">
                          <button
                            onClick={() => setStatPriority('ability')}
                            className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-semibold transition-all duration-200 flex items-center justify-center gap-1 ${
                              statPriority === 'ability'
                                ? 'bg-rarity-epic text-white ring-2 ring-rarity-epic shadow-[0_0_12px_rgba(var(--rarity-epic),0.3)]'
                                : 'bg-white/[0.04] hover:bg-white/[0.08] text-foreground border border-white/10'
                            }`}
                          >
                            <Sparkles className="h-3 w-3" />
                            Ability
                          </button>
                          <button
                            onClick={() => setStatPriority('damage')}
                            className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-semibold transition-all duration-200 flex items-center justify-center gap-1 ${
                              statPriority === 'damage'
                                ? 'bg-role-damage text-white ring-2 ring-role-damage shadow-[0_0_12px_rgba(var(--role-damage),0.3)]'
                                : 'bg-white/[0.04] hover:bg-white/[0.08] text-foreground border border-white/10'
                            }`}
                          >
                            <Sword className="h-3 w-3" />
                            Weapon
                          </button>
                          <button
                            onClick={() => setStatPriority('survival')}
                            className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-semibold transition-all duration-200 flex items-center justify-center gap-1 ${
                              statPriority === 'survival'
                                ? 'bg-role-tank text-white ring-2 ring-role-tank shadow-[0_0_12px_rgba(var(--role-tank),0.3)]'
                                : 'bg-white/[0.04] hover:bg-white/[0.08] text-foreground border border-white/10'
                            }`}
                          >
                            <Shield className="h-3 w-3" />
                            Survival
                          </button>
                        </div>
                      </div>
                      
                      {/* Budget Status */}
                      <div className="mt-2 sm:mt-3 p-2 sm:p-3 rounded-xl bg-white/[0.03] border border-white/[0.08]">
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
                            style={{ width: `${Math.min(100, effectiveBudget > 0 ? (totalCost / effectiveBudget) * 100 : 0)}%` }}
                          />
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 text-center">
                          {selectedItems.length}/6 {t('optimizer.itemsSelected')}
                        </div>
                      </div>
                    </div>

                    {/* Apply Optimal Build Button with Item Icons & Stats Impact */}
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
                              className={cn(
                                "w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden bg-white/[0.04] ring-2",
                                item.rarity === 'common' ? 'ring-rarity-common' :
                                item.rarity === 'rare' ? 'ring-rarity-rare' :
                                item.rarity === 'epic' ? 'ring-rarity-epic' :
                                item.rarity === 'legendary' ? 'ring-rarity-legendary' : 'ring-muted'
                              )}
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

                        {/* Optimal Build Stats Impact */}
                        {selectedCharacter && (() => {
                          const totalDmg = optimalBuild.reduce((s, i) => s + (i.damage_bonus || 0), 0);
                          const totalHP = optimalBuild.reduce((s, i) => s + (i.health_bonus || 0), 0);
                          const totalAP = optimalBuild.reduce((s, i) => s + (i.ability_power || 0), 0);
                          const totalShield = optimalBuild.reduce((s, i) => s + (i.shield_bonus || 0), 0);
                          const totalArmor = optimalBuild.reduce((s, i) => s + (i.armor_bonus || 0), 0);
                          const totalCDR = Math.min(20, optimalBuild.reduce((s, i) => s + (i.cooldown_reduction || 0), 0));
                          const totalWL = optimalBuild.reduce((s, i) => s + (i.weapon_lifesteal || 0), 0);
                          const totalAL = optimalBuild.reduce((s, i) => s + (i.ability_lifesteal || 0), 0);

                          const effDmg = Math.round(selectedCharacter.base_damage * (1 + totalDmg / 100));
                          const effHP = selectedCharacter.health + totalHP;

                          return (
                            <div className="p-2.5 sm:p-3 rounded-xl bg-white/[0.03] border border-white/[0.08] space-y-2">
                              <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider font-semibold text-center">
                                Impact sur {selectedCharacter.name}
                              </div>
                              {/* Primary stats */}
                              <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                                <div className="flex items-center justify-between bg-muted/50 px-2 py-1.5 rounded-lg">
                                  <span className="text-[10px] sm:text-xs flex items-center gap-1"><Sword className="h-3 w-3 text-role-damage" />DMG</span>
                                  <span className="font-mono text-[10px] sm:text-xs font-bold">
                                    {selectedCharacter.base_damage} → <span className="text-role-damage">{effDmg}</span>
                                  </span>
                                </div>
                                <div className="flex items-center justify-between bg-muted/50 px-2 py-1.5 rounded-lg">
                                  <span className="text-[10px] sm:text-xs flex items-center gap-1"><Heart className="h-3 w-3 text-role-support" />HP</span>
                                  <span className="font-mono text-[10px] sm:text-xs font-bold">
                                    {selectedCharacter.health} → <span className="text-role-support">{effHP}</span>
                                  </span>
                                </div>
                              </div>
                              {/* Secondary stats - only show if > 0 */}
                              <div className="flex flex-wrap gap-1 justify-center">
                                {totalAP > 0 && (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-medium bg-rarity-epic/20 text-rarity-epic border border-rarity-epic/30">
                                    <Sparkles className="h-2.5 w-2.5" />+{totalAP}% AP
                                  </span>
                                )}
                                {totalShield > 0 && (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30">
                                    <Shield className="h-2.5 w-2.5" />+{totalShield}% Shield
                                  </span>
                                )}
                                {totalArmor > 0 && (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-medium bg-orange-500/20 text-orange-400 border border-orange-500/30">
                                    +{totalArmor}% Armor
                                  </span>
                                )}
                                {totalCDR > 0 && (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-medium bg-green-500/20 text-green-400 border border-green-500/30">
                                    -{totalCDR}% CDR
                                  </span>
                                )}
                                {totalWL > 0 && (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-medium bg-red-500/20 text-red-400 border border-red-500/30">
                                    +{totalWL}% W.LS
                                  </span>
                                )}
                                {totalAL > 0 && (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-medium bg-purple-500/20 text-purple-400 border border-purple-500/30">
                                    +{totalAL}% A.LS
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Build Calculator */}
                <BuildCalculator character={selectedCharacter} items={selectedItems} onRemoveItem={removeItem} />
                
                {selectedCharacter && (
                  <div className="flex gap-2">
                    <Button onClick={saveRound} className="flex-1 gap-2 h-9 sm:h-10 text-xs sm:text-sm">
                      <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline">Save Round {round}</span>
                      <span className="sm:hidden">Save R{round}</span>
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

            {/* Round History Component */}
            <div className="mt-4 sm:mt-6">
              <RoundHistory 
                history={roundHistory} 
                loading={historyLoading}
                isAuthenticated={isAuthenticated}
                onLoadRound={loadFromHistory} 
                onClearHistory={clearRoundHistory}
              />
            </div>
          </div>
        </div>
        </div>
      </div>
    </Layout>
  );
}
