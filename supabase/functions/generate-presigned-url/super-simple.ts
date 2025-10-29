import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  console.log('🚀 Super simple function called');
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('📝 Method:', req.method);
    
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('📝 Reading body...');
    const body = await req.json();
    console.log('📝 Body received:', body);

    // Just return a fake presigned URL for testing
    const fakeUrl = 'https://example.com/fake-presigned-url';
    const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();

    console.log('✅ Returning fake response');
    
    return new Response(JSON.stringify({
      presignedUrl: fakeUrl,
      expiresAt: expiresAt
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Error in super simple function:', error);
    return new Response(JSON.stringify({
      error: 'Super simple function error',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});