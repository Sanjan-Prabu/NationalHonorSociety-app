import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey); 

serve(async (req: Request) => {
  try {
    const { code, user_id } = await req.json();

    if (!code || !user_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing code or user_id' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if code exists and is unused
    const { data: codeData, error: codeError } = await supabase
      .from('verification_codes')
      .select('*')
      .eq('code', code)
      .is('used_by', null)
      .single();

    if (codeError || !codeData) {
      return new Response(
        JSON.stringify({ success: false, message: 'Invalid or already used verification code' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Mark code as used
    await supabase.from('verification_codes').update({
      used_by: user_id,
      used_at: new Date().toISOString()
    }).eq('code', code);

    // Mark profile as verified
    await supabase.from('profiles').update({
      is_verified: true
    }).eq('id', user_id);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
