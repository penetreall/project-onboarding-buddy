import { createClient } from 'jsr:@supabase/supabase-js@2';
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const password = 'solitude';
    const hash = await bcrypt.hash(password);
    
    const { error } = await supabase
      .from('ice_wall_users')
      .update({ password_hash: hash })
      .eq('username', 'devian');

    if (error) throw error;

    const isValid = await bcrypt.compare(password, hash);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Password updated with Deno bcrypt',
        hash: hash.substring(0, 20),
        testValid: isValid
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});