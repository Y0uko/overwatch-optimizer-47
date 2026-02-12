import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { CharacterCard } from '@/components/CharacterCard';
import { RoleBadge } from '@/components/ui/RoleBadge';
import { supabase } from '@/integrations/supabase/client';
import { Character, CharacterRole } from '@/types/database';
import { Users, Search, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export default function Characters() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<CharacterRole | 'all'>('all');

  useEffect(() => {
    async function fetchCharacters() {
      const { data } = await supabase
        .from('characters')
        .select('*')
        .order('name');
      setCharacters((data as Character[]) || []);
      setLoading(false);
    }
    fetchCharacters();
  }, []);

  const filteredCharacters = characters.filter(char => {
    const matchesSearch = char.name.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'all' || char.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const roles: (CharacterRole | 'all')[] = ['all', 'tank', 'damage', 'support'];

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
        <motion.div className="mb-8" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <Users className="h-8 w-8 text-primary" />
            Characters
          </h1>
          <p className="text-muted-foreground">
            Browse all Overwatch Stadium characters and their stats.
          </p>
        </motion.div>

        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search characters..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <div className="flex gap-2">
                {roles.map(role => (
                  <Button
                    key={role}
                    variant={roleFilter === role ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setRoleFilter(role)}
                    className={cn(
                      'capitalize',
                      roleFilter === role && role !== 'all' && 'text-primary-foreground'
                    )}
                  >
                    {role === 'all' ? 'All' : role}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {filteredCharacters.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              {characters.length === 0 
                ? 'No characters available yet. Data will be added soon!'
                : 'No characters match your search.'}
            </CardContent>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCharacters.map(character => (
              <CharacterCard key={character.id} character={character} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
