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
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <div className="mb-4 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2 flex items-center gap-2">
            <Package className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            Item Database
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Browse all {items.length} Stadium items with stats, costs, and special effects.
          </p>
        </div>

        {/* Filters */}
        <Card className="mb-4 sm:mb-6">
          <CardContent className="pt-4 sm:pt-6 p-3 sm:p-6">
            <div className="flex flex-col gap-3 sm:gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-9 sm:h-10"
                />
              </div>

              {/* Category Tabs - Scrollable on mobile */}
              <Tabs value={selectedCategory} onValueChange={(v) => setSelectedCategory(v as ItemCategory | 'all')}>
                <TabsList className="w-full grid grid-cols-5 h-auto">
                  <TabsTrigger value="all" className="gap-0.5 sm:gap-1 px-1 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm">
                    <Package className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">All</span>
                    <span className="text-[10px] sm:text-xs text-muted-foreground hidden md:inline">({categoryCounts.all})</span>
                  </TabsTrigger>
                  <TabsTrigger value="weapon" className="gap-0.5 sm:gap-1 px-1 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm">
                    {categoryIcons.weapon}
                    <span className="hidden sm:inline">Weapon</span>
                    <span className="text-[10px] sm:text-xs text-muted-foreground hidden md:inline">({categoryCounts.weapon})</span>
                  </TabsTrigger>
                  <TabsTrigger value="ability" className="gap-0.5 sm:gap-1 px-1 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm">
                    {categoryIcons.ability}
                    <span className="hidden sm:inline">Ability</span>
                    <span className="text-[10px] sm:text-xs text-muted-foreground hidden md:inline">({categoryCounts.ability})</span>
                  </TabsTrigger>
                  <TabsTrigger value="survival" className="gap-0.5 sm:gap-1 px-1 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm">
                    {categoryIcons.survival}
                    <span className="hidden sm:inline">Survival</span>
                    <span className="text-[10px] sm:text-xs text-muted-foreground hidden md:inline">({categoryCounts.survival})</span>
                  </TabsTrigger>
                  <TabsTrigger value="gadget" className="gap-0.5 sm:gap-1 px-1 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm">
                    {categoryIcons.gadget}
                    <span className="hidden sm:inline">Gadget</span>
                    <span className="text-[10px] sm:text-xs text-muted-foreground hidden md:inline">({categoryCounts.gadget})</span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Rarity & Sort */}
              <div className="flex gap-2 sm:gap-4 flex-wrap">
                <Select value={selectedRarity} onValueChange={(v) => setSelectedRarity(v as ItemRarity | 'all')}>
                  <SelectTrigger className="w-[110px] sm:w-[150px] h-9 sm:h-10 text-xs sm:text-sm">
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
                  <SelectTrigger className="w-[130px] sm:w-[180px] h-9 sm:h-10 text-xs sm:text-sm">
                    <ArrowUpDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
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
                    size="sm"
                    className="h-9 sm:h-10 text-xs sm:text-sm"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory('all');
                      setSelectedRarity('all');
                    }}
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <div className="mb-3 sm:mb-4 text-xs sm:text-sm text-muted-foreground">
          Showing {filteredAndSortedItems.length} of {items.length} items
        </div>

        {filteredAndSortedItems.length === 0 ? (
          <Card>
            <CardContent className="py-8 sm:py-12 text-center text-muted-foreground text-sm sm:text-base">
              No items match your filters. Try adjusting your search criteria.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            {filteredAndSortedItems.map(item => (
              <ItemCard key={item.id} item={item} showStats />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
