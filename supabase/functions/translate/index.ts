import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const deeplApiKey = Deno.env.get('DEEPL_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Size limits to prevent resource exhaustion
const MAX_TEXTS = 100;
const MAX_TEXT_LENGTH = 5000;

// Rate limiting configuration
const RATE_LIMIT_MAX_REQUESTS = 50; // Max requests per window
const RATE_LIMIT_WINDOW_MINUTES = 60; // 1 hour window

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authentication check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create Supabase client with user's auth
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify the JWT token
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = claimsData.claims.sub as string;
    
    // Rate limiting check using service role client
    const supabaseService = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: rateLimitAllowed, error: rateLimitError } = await supabaseService.rpc(
      'check_rate_limit',
      {
        _user_id: userId,
        _endpoint: 'translate',
        _max_requests: RATE_LIMIT_MAX_REQUESTS,
        _window_minutes: RATE_LIMIT_WINDOW_MINUTES
      }
    );

    if (rateLimitError) {
      // Log error but don't expose details to client
      console.error('Rate limit check failed:', { status: 'error' });
      // Continue without rate limiting if check fails (fail-open for availability)
    } else if (rateLimitAllowed === false) {
      // Get remaining time until window resets
      const retryAfterSeconds = RATE_LIMIT_WINDOW_MINUTES * 60;
      return new Response(JSON.stringify({ 
        error: 'Rate limit exceeded. Please try again later.',
        retryAfter: retryAfterSeconds
      }), {
        status: 429,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Retry-After': retryAfterSeconds.toString()
        },
      });
    }

    const { texts, targetLang } = await req.json();

    if (!texts || !Array.isArray(texts) || texts.length === 0) {
      return new Response(JSON.stringify({ error: 'No texts provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Size limit validation: array length
    if (texts.length > MAX_TEXTS) {
      return new Response(JSON.stringify({ error: `Too many texts. Maximum ${MAX_TEXTS} allowed.` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Size limit validation: text length
    if (texts.some((text: string) => typeof text !== 'string' || text.length > MAX_TEXT_LENGTH)) {
      return new Response(JSON.stringify({ error: `Text too long or invalid. Maximum ${MAX_TEXT_LENGTH} characters per text.` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!targetLang) {
      return new Response(JSON.stringify({ error: 'No target language provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // English is the source, no translation needed
    if (targetLang === 'EN') {
      return new Response(JSON.stringify({ translations: texts.map((text: string) => ({ text })) }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const response = await fetch('https://api-free.deepl.com/v2/translate', {
      method: 'POST',
      headers: {
        'Authorization': `DeepL-Auth-Key ${deeplApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: texts,
        target_lang: targetLang,
        source_lang: 'EN',
      }),
    });

    if (!response.ok) {
      // Consume response body but don't log sensitive details
      await response.text();
      console.error('DeepL API error:', { status: response.status, statusText: response.statusText });
      return new Response(JSON.stringify({ error: 'Translation failed' }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();

    return new Response(JSON.stringify({ translations: data.translations }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    // Log minimal error info without exposing internal details
    console.error('Error in translate function:', { 
      type: error instanceof Error ? error.name : 'Unknown',
      message: 'Internal error occurred'
    });
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
