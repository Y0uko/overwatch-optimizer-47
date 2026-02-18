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

interface OverfastHeroDetail {
  name: string;
  description: string;
  portrait: string;
  role: 'tank' | 'damage' | 'support';
  hitpoints: {
    health: number;
    armor: number;
    shields: number;
    total: number;
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Fetch hero list — only stadium heroes
    const listRes = await fetch(`${OVERFAST_API}/heroes?locale=en-us`);
    if (!listRes.ok) {
      const text = await listRes.text();
      console.error('Failed to fetch hero list:', listRes.status, text);
      return new Response(JSON.stringify({ error: 'Failed to fetch hero list' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const allHeroes: OverfastHeroListItem[] = await listRes.json();
    const stadiumHeroes = allHeroes.filter(h => h.gamemodes.includes('stadium'));

    console.log(`Found ${stadiumHeroes.length} stadium heroes out of ${allHeroes.length} total`);

    // 2. Fetch details for each hero (with rate-limit-friendly delay)
    const results: { name: string; status: string }[] = [];

    for (const hero of stadiumHeroes) {
      try {
        // Fetch with retry on 429
        let detailRes: Response | null = null;
        for (let attempt = 0; attempt < 3; attempt++) {
          detailRes = await fetch(`${OVERFAST_API}/heroes/${hero.key}`);
          if (detailRes.status === 429) {
            await detailRes.text();
            const wait = (attempt + 1) * 5000; // 5s, 10s, 15s
            console.log(`Rate limited on ${hero.key}, waiting ${wait}ms (attempt ${attempt + 1})`);
            await new Promise(r => setTimeout(r, wait));
            continue;
          }
          break;
        }

        if (!detailRes || !detailRes.ok) {
          if (detailRes) await detailRes.text();
          results.push({ name: hero.name, status: `detail fetch failed: ${detailRes?.status || 'no response'}` });
          continue;
        }

        const detail: OverfastHeroDetail = await detailRes.json();

        // Map role
        const roleMap: Record<string, string> = {
          tank: 'tank',
          damage: 'damage',
          support: 'support',
        };

        const characterData = {
          name: detail.name,
          role: roleMap[detail.role] || 'damage',
          health: detail.hitpoints.total,
          base_damage: 10, // API doesn't provide base weapon damage, keep existing or default
          image_url: detail.portrait,
          description: null as string | null,
        };

        // Check if hero already exists
        const { data: existing } = await supabase
          .from('characters')
          .select('id, base_damage')
          .eq('name', detail.name)
          .maybeSingle();

        if (existing) {
          // Update but preserve base_damage (manually set)
          const { error } = await supabase
            .from('characters')
            .update({
              role: characterData.role,
              health: characterData.health,
              image_url: characterData.image_url,
            })
            .eq('id', existing.id);

          results.push({ name: detail.name, status: error ? `update error: ${error.message}` : 'updated' });
        } else {
          // Insert new hero
          const { error } = await supabase
            .from('characters')
            .insert(characterData);

          results.push({ name: detail.name, status: error ? `insert error: ${error.message}` : 'inserted' });
        }

        // Delay to respect OverFast shared rate limits
        await new Promise(r => setTimeout(r, 2000));
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        results.push({ name: hero.name, status: `error: ${msg}` });
      }
    }

    const inserted = results.filter(r => r.status === 'inserted').length;
    const updated = results.filter(r => r.status === 'updated').length;
    const errors = results.filter(r => r.status !== 'inserted' && r.status !== 'updated').length;

    console.log(`Sync complete: ${inserted} inserted, ${updated} updated, ${errors} errors`);

    return new Response(JSON.stringify({
      success: true,
      summary: { total: stadiumHeroes.length, inserted, updated, errors },
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
