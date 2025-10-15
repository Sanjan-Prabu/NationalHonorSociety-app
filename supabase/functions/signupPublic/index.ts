import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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

serve(async (req: Request) => {
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
    const requestBody = await req.json();
    const { 
      email, 
      password, 
      first_name, 
      last_name, 
      organization, 
      role,
      code
    } = requestBody;

    // Validate role and set default if not provided or invalid
    const validRoles = ['member', 'officer', 'president', 'vice_president', 'admin'];
    const finalRole = (role && validRoles.includes(role)) ? role : 'member';

    console.log("Raw request body:", requestBody);
    console.log("Role from request body:", requestBody.role);
    console.log("Final role value:", finalRole);
    console.log("Role type:", typeof finalRole);
    console.log("Signup request:", { email, first_name, last_name, organization, role: finalRole });

    if (!email || !password || !first_name || !last_name || !organization) {
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

    // Hard-coded organization mapping to avoid UUID issues
    let orgUuid;
    if (organization.toLowerCase() === 'test-nhs') {
      orgUuid = '550e8400-e29b-41d4-a716-446655440001';
    } else if (organization.toLowerCase() === 'test-nhsa') {
      orgUuid = '550e8400-e29b-41d4-a716-446655440002';
    } else {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Invalid organization: ${organization}. Must be test-nhs or test-nhsa` 
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

    console.log("Using org UUID:", orgUuid);

    // Create auth user
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

    // Insert profile
    const { error: profileError } = await supabase.from("profiles").insert({
      id: userId,
      email: email.toLowerCase(),
      first_name: first_name.trim(),
      last_name: last_name.trim(),
      org_id: orgUuid,
      is_verified: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (profileError) {
      console.log("Profile creation failed:", profileError);
      await supabase.auth.admin.deleteUser(userId);
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

    // Create membership with correct role
    console.log("Creating membership with role:", finalRole);
    console.log("Role value being inserted:", JSON.stringify(finalRole));
    const membershipInsert = {
      user_id: userId,
      org_id: orgUuid,
      role: finalRole, // This should be 'officer' or 'member'
      is_active: true,
      joined_at: new Date().toISOString(),
    };
    console.log("Membership insert object:", membershipInsert);
    
    const { error: membershipError } = await supabase.from("memberships").insert(membershipInsert);
    
    // Also update the profile role field
    console.log("Updating profile role to:", finalRole);
    const { error: profileRoleError } = await supabase.from("profiles").update({
      role: finalRole
    }).eq("id", userId);
    
    if (profileRoleError) {
      console.log("Profile role update failed:", profileRoleError);
    }

    if (membershipError) {
      console.log("Membership creation failed:", membershipError);
      await supabase.from("profiles").delete().eq("id", userId);
      await supabase.auth.admin.deleteUser(userId);
      return new Response(
        JSON.stringify({ success: false, error: membershipError.message }),
        { 
          status: 500, 
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          } 
        }
      );
    }

    console.log("Membership created successfully");

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