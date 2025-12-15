import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const { data: user } = await supabase
      .from('ice_wall_users')
      .select('*')
      .eq('username', 'devian')
      .maybeSingle();

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    const password = 'solitude';
    const isValid = await bcrypt.compare(password, user.password_hash);

    const newHash = await bcrypt.hash(password);
    const newHashValid = await bcrypt.compare(password, newHash);

    return new Response(
      JSON.stringify({
        username: user.username,
        storedHash: user.password_hash,
        testPassword: password,
        isValidWithStoredHash: isValid,
        newHashGenerated: newHash,
        isValidWithNewHash: newHashValid
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