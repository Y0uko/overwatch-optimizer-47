import { useState, useEffect, useMemo } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ItemCard } from '@/components/ItemCard';
import { supabase } from '@/integrations/supabase/client';
import { Item, ItemCategory, ItemRarity } from '@/types/database';
import { Search, Loader2, Package, Sword, Sparkles, Shield, Wrench, ArrowUpDown } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const categoryIcons: Record<ItemCategory, React.ReactNode> = {
  weapon: <Sword className="h-4 w-4" />,
  ability: <Sparkles className="h-4 w-4" />,
  survival: <Shield className="h-4 w-4" />,
  gadget: <Wrench className="h-4 w-4" />,
};

type SortOption = 'name' | 'cost-asc' | 'cost-desc' | 'rarity';

export default function Items() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ItemCategory | 'all'>('all');
  const [selectedRarity, setSelectedRarity] = useState<ItemRarity | 'all'>('all');
  const [sortBy, setSortBy] = useState<SortOption>('name');

  useEffect(() => {
    async function fetchItems() {
      const { data } = await supabase.from('items').select('*').order('name');
      setItems((data as Item[]) || []);
      setLoading(false);
    }
    fetchItems();
  }, []);

  const filteredAndSortedItems = useMemo(() => {
    let result = items;

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        item =>
          item.name.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query) ||
          item.special_effect?.toLowerCase().includes(query)
      );
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      result = result.filter(item => item.category === selectedCategory);
    }

    // Filter by rarity
    if (selectedRarity !== 'all') {
      result = result.filter(item => item.rarity === selectedRarity);
    }

    // Sort
    const rarityOrder: Record<ItemRarity, number> = { common: 0, rare: 1, epic: 2 };
    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'cost-asc':
          return a.cost - b.cost;
        case 'cost-desc':
          return b.cost - a.cost;
        case 'rarity':
          return rarityOrder[b.rarity] - rarityOrder[a.rarity];
        default:
          return 0;
      }
    });

    return result;
  }, [items, searchQuery, selectedCategory, selectedRarity, sortBy]);

  const categoryCounts = useMemo(() => {
    return {
      all: items.length,
      weapon: items.filter(i => i.category === 'weapon').length,
      ability: items.filter(i => i.category === 'ability').length,
      survival: items.filter(i => i.category === 'survival').length,
      gadget: items.filter(i => i.category === 'gadget').length,
    };
  }, [items]);

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
            <Package className="h-8 w-8 text-primary" />
            Item Database
          </h1>
          <p className="text-muted-foreground">
            Browse all {items.length} Stadium items with stats, costs, and special effects.
          </p>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search items by name, description, or effect..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Category Tabs */}
              <Tabs value={selectedCategory} onValueChange={(v) => setSelectedCategory(v as ItemCategory | 'all')}>
                <TabsList className="w-full grid grid-cols-5">
                  <TabsTrigger value="all" className="gap-1">
                    <Package className="h-4 w-4" />
                    <span className="hidden sm:inline">All</span>
                    <span className="text-xs text-muted-foreground">({categoryCounts.all})</span>
                  </TabsTrigger>
                  <TabsTrigger value="weapon" className="gap-1">
                    {categoryIcons.weapon}
                    <span className="hidden sm:inline">Weapon</span>
                    <span className="text-xs text-muted-foreground">({categoryCounts.weapon})</span>
                  </TabsTrigger>
                  <TabsTrigger value="ability" className="gap-1">
                    {categoryIcons.ability}
                    <span className="hidden sm:inline">Ability</span>
                    <span className="text-xs text-muted-foreground">({categoryCounts.ability})</span>
                  </TabsTrigger>
                  <TabsTrigger value="survival" className="gap-1">
                    {categoryIcons.survival}
                    <span className="hidden sm:inline">Survival</span>
                    <span className="text-xs text-muted-foreground">({categoryCounts.survival})</span>
                  </TabsTrigger>
                  <TabsTrigger value="gadget" className="gap-1">
                    {categoryIcons.gadget}
                    <span className="hidden sm:inline">Gadget</span>
                    <span className="text-xs text-muted-foreground">({categoryCounts.gadget})</span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Rarity & Sort */}
              <div className="flex gap-4 flex-wrap">
                <Select value={selectedRarity} onValueChange={(v) => setSelectedRarity(v as ItemRarity | 'all')}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Rarity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Rarities</SelectItem>
                    <SelectItem value="common">Common</SelectItem>
                    <SelectItem value="rare">Rare</SelectItem>
                    <SelectItem value="epic">Epic</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                  <SelectTrigger className="w-[180px]">
                    <ArrowUpDown className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Name (A-Z)</SelectItem>
                    <SelectItem value="cost-asc">Cost (Low to High)</SelectItem>
                    <SelectItem value="cost-desc">Cost (High to Low)</SelectItem>
                    <SelectItem value="rarity">Rarity (Best first)</SelectItem>
                  </SelectContent>
                </Select>

                {(searchQuery || selectedCategory !== 'all' || selectedRarity !== 'all') && (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory('all');
                      setSelectedRarity('all');
                    }}
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <div className="mb-4 text-sm text-muted-foreground">
          Showing {filteredAndSortedItems.length} of {items.length} items
        </div>

        {filteredAndSortedItems.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No items match your filters. Try adjusting your search criteria.
            </CardContent>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredAndSortedItems.map(item => (
              <ItemCard key={item.id} item={item} showStats />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
