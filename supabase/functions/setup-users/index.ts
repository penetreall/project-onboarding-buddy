import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const devianHash = await bcrypt.hash("solitude");
    const adminHash = await bcrypt.hash("admin123");

    await supabase
      .from("ice_wall_users")
      .update({ password_hash: devianHash })
      .eq("username", "devian");

    await supabase
      .from("ice_wall_users")
      .upsert({
        username: "admin",
        password_hash: adminHash,
        is_admin: true,
      }, {
        onConflict: "username"
      });

    const testDevian = await bcrypt.compare("solitude", devianHash);
    const testAdmin = await bcrypt.compare("admin123", adminHash);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Users updated successfully",
        tests: {
          devian: testDevian,
          admin: testAdmin
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});