import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OVERFAST_API = 'https://overfast-api.tekrop.fr';

interface OverfastHeroListItem {
  key: string;
  name: string;
  portrait: string;
  role: 'tank' | 'damage' | 'support';
  gamemodes: string[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch hero list (single request, no rate limit issues)
    const listRes = await fetch(`${OVERFAST_API}/heroes?locale=en-us`);
    if (!listRes.ok) {
      await listRes.text();
      return new Response(JSON.stringify({ error: 'Failed to fetch hero list' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const allHeroes: OverfastHeroListItem[] = await listRes.json();
    const stadiumHeroes = allHeroes.filter(h => h.gamemodes.includes('stadium'));

    console.log(`Found ${stadiumHeroes.length} stadium heroes`);

    // Get all existing characters
    const { data: existingChars } = await supabase
      .from('characters')
      .select('id, name, role, image_url');

    const existingMap = new Map((existingChars || []).map(c => [c.name, c]));

    const results: { name: string; status: string }[] = [];

    for (const hero of stadiumHeroes) {
      const existing = existingMap.get(hero.name);

      if (existing) {
        // Update role and image from list data (no detail call needed)
        const needsUpdate = existing.role !== hero.role || existing.image_url !== hero.portrait;
        if (needsUpdate) {
          const { error } = await supabase
            .from('characters')
            .update({ role: hero.role, image_url: hero.portrait })
            .eq('id', existing.id);
          results.push({ name: hero.name, status: error ? `update error: ${error.message}` : 'updated' });
        } else {
          results.push({ name: hero.name, status: 'unchanged' });
        }
      } else {
        // New hero — try to get hitpoints from detail endpoint
        let health = 250; // default
        try {
          const detailRes = await fetch(`${OVERFAST_API}/heroes/${hero.key}`);
          if (detailRes.ok) {
            const detail = await detailRes.json();
            health = detail.hitpoints?.total || 250;
          } else {
            await detailRes.text();
            console.log(`Could not fetch detail for ${hero.key}, using default health`);
          }
          // Delay for rate limit
          await new Promise(r => setTimeout(r, 1500));
        } catch {
          console.log(`Detail fetch error for ${hero.key}, using default health`);
        }

        const { error } = await supabase
          .from('characters')
          .insert({
            name: hero.name,
            role: hero.role,
            health,
            base_damage: 10,
            image_url: hero.portrait,
          });
        results.push({ name: hero.name, status: error ? `insert error: ${error.message}` : 'inserted' });
      }
    }

    const inserted = results.filter(r => r.status === 'inserted').length;
    const updated = results.filter(r => r.status === 'updated').length;
    const unchanged = results.filter(r => r.status === 'unchanged').length;
    const errors = results.filter(r => !['inserted', 'updated', 'unchanged'].includes(r.status)).length;

    console.log(`Sync done: ${inserted} new, ${updated} updated, ${unchanged} unchanged, ${errors} errors`);

    return new Response(JSON.stringify({
      success: true,
      summary: { total: stadiumHeroes.length, inserted, updated, unchanged, errors },
      details: results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Sync heroes error:', error instanceof Error ? error.message : 'Unknown');
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
