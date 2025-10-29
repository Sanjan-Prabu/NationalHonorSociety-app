import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing environment variables");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
});

Deno.serve(async (req: Request) => {
  // CORS
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  try {
    const { email, password } = await req.json();

    console.log("Login request for:", email);

    if (!email || !password) {
      return new Response(
        JSON.stringify({ success: false, error: "Email and password required" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          }
        }
      );
    }

    // Sign in user
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      console.log("Login failed:", error);
      return new Response(
        JSON.stringify({
          success: false,
          error: error?.message || "Login failed"
        }),
        {
          status: 401,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          }
        }
      );
    }

    // Get user profile and memberships in one query
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select(`
        *,
        memberships!inner (
          org_id,
          role,
          is_active,
          joined_at,
          organizations!inner (
            id,
            slug,
            name
          )
        )
      `)
      .eq("id", data.user.id)
      .eq("memberships.is_active", true)
      .single();

    if (profileError || !profileData) {
      console.log("Profile fetch failed:", profileError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "User profile not found"
        }),
        {
          status: 404,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          }
        }
      );
    }

    console.log("Login successful for:", email);

    return new Response(
      JSON.stringify({
        success: true,
        user: data.user,
        session: data.session,
        profile: profileData
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        }
      }
    );
  } catch (err: any) {
    console.error("Login error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        }
      }
    );
  }
});