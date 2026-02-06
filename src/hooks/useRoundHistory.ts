import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Character, Item } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

export interface RoundEntry {
  id?: string;
  round: number;
  character: Character;
  items: Item[];
  budgetAtStart: number;
  budgetSpent: number;
  budgetRemaining: number;
  timestamp: Date;
}

interface DbRoundHistory {
  id: string;
  user_id: string;
  round_number: number;
  character_id: string;
  budget_at_start: number;
  budget_spent: number;
  budget_remaining: number;
  created_at: string;
  characters: Character;
  round_history_items: { item_id: string; items: Item }[];
}

export function useRoundHistory() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [history, setHistory] = useState<RoundEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch history from database
  const fetchHistory = useCallback(async () => {
    if (!user) {
      setHistory([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('round_history')
        .select(`
          id,
          round_number,
          character_id,
          budget_at_start,
          budget_spent,
          budget_remaining,
          created_at,
          characters (*),
          round_history_items (
            item_id,
            items (*)
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(30);

      if (error) throw error;

      const entries: RoundEntry[] = (data as unknown as DbRoundHistory[]).map((row) => ({
        id: row.id,
        round: row.round_number,
        character: row.characters,
        items: row.round_history_items.map((rhi) => rhi.items),
        budgetAtStart: row.budget_at_start,
        budgetSpent: row.budget_spent,
        budgetRemaining: row.budget_remaining,
        timestamp: new Date(row.created_at),
      }));

      setHistory(entries);
    } catch (error) {
      console.error('Error fetching round history:', error);
      toast({
        title: 'Failed to load history',
        description: 'Could not load your round history',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  // Load history when user changes
  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Save a new round entry
  const saveRound = useCallback(
    async (entry: Omit<RoundEntry, 'id' | 'timestamp'>): Promise<boolean> => {
      if (!user) {
        toast({
          title: 'Sign in required',
          description: 'Please sign in to save your round history',
          variant: 'destructive',
        });
        return false;
      }

      try {
        // Insert the round history entry
        const { data: roundData, error: roundError } = await supabase
          .from('round_history')
          .insert({
            user_id: user.id,
            round_number: entry.round,
            character_id: entry.character.id,
            budget_at_start: entry.budgetAtStart,
            budget_spent: entry.budgetSpent,
            budget_remaining: entry.budgetRemaining,
          })
          .select('id')
          .single();

        if (roundError) throw roundError;

        // Insert the items for this round
        if (entry.items.length > 0) {
          const itemInserts = entry.items.map((item) => ({
            round_history_id: roundData.id,
            item_id: item.id,
          }));

          const { error: itemsError } = await supabase
            .from('round_history_items')
            .insert(itemInserts);

          if (itemsError) throw itemsError;
        }

        // Update local state optimistically
        const newEntry: RoundEntry = {
          id: roundData.id,
          ...entry,
          timestamp: new Date(),
        };

        setHistory((prev) => [newEntry, ...prev.slice(0, 29)]);

        return true;
      } catch (error) {
        console.error('Error saving round:', error);
        toast({
          title: 'Failed to save round',
          description: 'Could not save your round to history',
          variant: 'destructive',
        });
        return false;
      }
    },
    [user, toast]
  );

  // Clear all history for the user
  const clearHistory = useCallback(async (): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('round_history')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      setHistory([]);
      toast({ title: 'History cleared' });
      return true;
    } catch (error) {
      console.error('Error clearing history:', error);
      toast({
        title: 'Failed to clear history',
        description: 'Could not clear your round history',
        variant: 'destructive',
      });
      return false;
    }
  }, [user, toast]);

  // Delete a specific round entry
  const deleteRound = useCallback(
    async (roundId: string): Promise<boolean> => {
      if (!user) return false;

      try {
        const { error } = await supabase
          .from('round_history')
          .delete()
          .eq('id', roundId)
          .eq('user_id', user.id);

        if (error) throw error;

        setHistory((prev) => prev.filter((entry) => entry.id !== roundId));
        return true;
      } catch (error) {
        console.error('Error deleting round:', error);
        toast({
          title: 'Failed to delete round',
          description: 'Could not delete the round entry',
          variant: 'destructive',
        });
        return false;
      }
    },
    [user, toast]
  );

  return {
    history,
    loading,
    isAuthenticated: !!user,
    saveRound,
    clearHistory,
    deleteRound,
    refetch: fetchHistory,
  };
}
