// @ts-ignore - Deno imports
import { serve } from "std/http/server.ts";
// @ts-ignore - Deno imports  
import { createClient } from "@supabase/supabase-js";

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
      code,
      phone_number,
      student_id,
      grade
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

    // Organization mapping to proper UUIDs
    let orgUuid;
    if (organization.toLowerCase() === 'nhs') {
      orgUuid = '550e8400-e29b-41d4-a716-446655440003';
    } else if (organization.toLowerCase() === 'nhsa') {
      orgUuid = '550e8400-e29b-41d4-a716-446655440004';
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Invalid organization: ${organization}. Must be NHS or NHSA`
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

    // Validate verification code if provided
    if (code) {
      // First try to find code for the specific organization
      let { data: codeData, error: codeError } = await supabase
        .from("verification_codes")
        .select("*")
        .eq("code", code)
        .eq("org_id", orgUuid)
        .eq("is_used", false)
        .single();

      // Special handling for universal officer code 97655500
      if ((codeError || !codeData) && finalRole === 'officer' && code === '97655500') {
        const { data: universalCode, error: universalError } = await supabase
          .from("verification_codes")
          .select("*")
          .eq("code", code)
          .eq("is_used", false)
          .single();

        if (universalCode) {
          codeData = universalCode;
          codeError = null;
        }
      }

      if (codeError || !codeData) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Invalid or expired verification code for this organization"
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

      // Check if code type matches role requirement
      if (finalRole === 'officer' && codeData.code_type !== 'officer' && codeData.code_type !== 'general') {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Officer role requires an officer verification code"
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
    }

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

    // Generate username and display_name
    const cleanFirstName = first_name.trim();
    const cleanLastName = last_name.trim();
    const username = `${cleanFirstName.toLowerCase()}.${cleanLastName.toLowerCase()}`.replace(/[^a-z0-9.]/g, '');
    const display_name = `${cleanFirstName} ${cleanLastName}`;

    // Insert profile with all fields
    const { error: profileError } = await supabase.from("profiles").insert({
      id: userId,
      email: email.toLowerCase(),
      first_name: cleanFirstName,
      last_name: cleanLastName,
      username: username,
      display_name: display_name,
      phone_number: phone_number || null,
      student_id: student_id || null,
      grade: grade || null,
      org_id: orgUuid,
      role: finalRole,
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

    // Mark verification code as used if provided
    if (code) {
      // For universal officer code 97655500, mark it as used (it exists only once)
      if (code === '97655500') {
        const { error: codeUpdateError } = await supabase
          .from("verification_codes")
          .update({
            is_used: true,
            used_by: userId,
            used_at: new Date().toISOString()
          })
          .eq("code", code);

        if (codeUpdateError) {
          console.log("Failed to mark universal verification code as used:", codeUpdateError);
        }
      } else {
        // For regular codes, mark the specific org's code as used
        const { error: codeUpdateError } = await supabase
          .from("verification_codes")
          .update({
            is_used: true,
            used_by: userId,
            used_at: new Date().toISOString()
          })
          .eq("code", code)
          .eq("org_id", orgUuid);

        if (codeUpdateError) {
          console.log("Failed to mark verification code as used:", codeUpdateError);
        }
      }
    }

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