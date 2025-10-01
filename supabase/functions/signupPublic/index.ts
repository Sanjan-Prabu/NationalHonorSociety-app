import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Supabase automatically provides these environment variables in Edge Functions
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

// Debug environment variables
console.log("Env check:", {
  supabaseUrl: supabaseUrl ? "SET" : "MISSING",
  supabaseServiceKey: supabaseServiceKey ? "SET" : "MISSING",
  supabaseUrlValue: supabaseUrl,
  serviceKeyFirst10Chars: supabaseServiceKey ? supabaseServiceKey.substring(0, 10) : "MISSING",
  serviceKeyLength: supabaseServiceKey?.length || 0,
});

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing environment variables");
  throw new Error("Missing environment variables");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { 
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
});

serve(async (req: Request) => {
  console.log(`Received ${req.method} request to signupPublic`);
  
  // Allow CORS preflight & simple client usage
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  // Debug: Log all environment variables
  console.log("=== DEBUG START ===");
  console.log("All env vars:", Object.keys(Deno.env.toObject()));
  console.log("SUPABASE_URL:", Deno.env.get("SUPABASE_URL"));
  console.log("SUPABASE_SERVICE_ROLE_KEY:", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ? "SET" : "MISSING");
  console.log("=== DEBUG END ===");

  try {
    const { 
      email, 
      password, 
      first_name, 
      last_name, 
      organization, 
      code,
      phone_number = null,
      student_id = null,
      grade = null,

    } = await req.json();

    console.log("Received signup request for:", { email, first_name, last_name, organization });

    if (!email || !password || !first_name || !last_name || !organization || !code) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields" }),
        { 
          status: 400, 
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          } 
        }
      );
    }

const orgId = organization.trim().toLowerCase();

   
    // 🔹 1. Verify code before creating user
    // 🔹 1. Verify code exists (allow multiple users to share the same code)
    console.log("Checking verification code:", code);
    const { data: codeData, error: codeError } = await supabase
      .from("verification_codes")
      .select("*")
      .eq("code", code)
      .maybeSingle(); // allows 0 or 1 without error

    if (codeError || !codeData) {
      console.log("Code verification failed:", codeError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid verification code",
        }),
        { 
          status: 400, 
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          } 
        }
      );
    }

console.log("Code verified successfully");

    console.log("Code verified successfully");

    // 🔹 2. Create auth user with service role
    console.log("Creating auth user...");
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (userError || !user) {
      console.log("User creation failed:", userError);
      return new Response(
        JSON.stringify({ success: false, error: userError?.message }),
        { 
          status: 500, 
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          } 
        }
      );
    }

    const userId = user.id;
    console.log("Auth user created:", userId);

    // 🔹 3. Insert profile (no org lookup needed)
    let Organization;
    if(organization=="NHS"){
       Organization = "NationalHonorSociety";
    }
    else{
      Organization = "NationalHonorSocietyAssociates"
    }
    const { error: profileError } = await supabase.from("profiles").insert({
      id: userId,
      email: email.toLowerCase(),
      first_name: first_name.trim(),
      last_name: last_name.trim(),
      phone_number,
      student_id,
      grade,
      organization: Organization,
      username: `${first_name.trim().toLowerCase()}.${last_name
        .trim()
        .toLowerCase()}`,
      display_name: first_name.trim(),
      is_verified: true,
      verification_code: code,
      org_id:orgId
    });

    if (profileError) {
      console.log("Profile creation failed:", profileError);
      await supabase.auth.admin.deleteUser(userId); // rollback
      return new Response(
        JSON.stringify({ success: false, error: profileError.message }),
        { 
          status: 500, 
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          } 
        }
      );
    }

    console.log("Profile created successfully");


    return new Response(
      JSON.stringify({ success: true, user_id: userId }),
      { 
        status: 200,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        } 
      }
    );
  } catch (err: any) {
    console.error("Signup error:", err);
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