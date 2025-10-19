import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// DEPLOYMENT MARKER: Updated with enhanced logging - 2024-10-18

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

    console.log("Signup request:", {
      email,
      first_name,
      last_name,
      organization,
      role: finalRole,
      hasCode: !!code,
      codeLength: code?.length
    });

    if (!email || !password || !first_name || !last_name || !organization || !code) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields. Verification code is required for signup." }),
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
    let orgUuid: string;
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

    // Validate verification code - SIMPLIFIED LOGIC FOR UNIVERSAL CODES
    if (code) {
      console.log("=== VERIFICATION CODE VALIDATION START ===");
      console.log("Input code:", code, "type:", typeof code);
      console.log("Role:", finalRole, "Organization:", organization);
      console.log("Function deployment timestamp:", new Date().toISOString());
      
      // First check what codes exist in database
      const { data: allCodes } = await supabase
        .from("verification_codes")
        .select("*");
      console.log("All codes in database:", allCodes);

      // Check for the specific verification codes - UNIVERSAL CODES ONLY
      console.log("Looking for code:", code, "in verification_codes table");
      let { data: codeData, error: codeError } = await supabase
        .from("verification_codes")
        .select("*")
        .eq("code", code)
        .eq("is_used", false)
        .single();

      console.log("Code lookup result:", { codeData, codeError });
      console.log("Code data details:", codeData);
      console.log("Expected codes: 50082571 (member), 97655500 (officer)");

      if (codeError || !codeData) {
        console.log("=== VERIFICATION CODE VALIDATION FAILED ===");
        console.log("Code:", code);
        console.log("Error:", codeError);
        console.log("Found data:", !!codeData);
        console.log("Error details:", JSON.stringify(codeError));
        
        return new Response(
          JSON.stringify({
            success: false,
            error: "Invalid or expired verification code"
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

      // Check if code has expired
      if (codeData.expires_at && new Date(codeData.expires_at) < new Date()) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Verification code has expired"
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

      // Validate code type against requested role
      // 50082571 = member code (can be used by members only)
      // 97655500 = officer code (can be used by officers, presidents, vice_presidents, admins)

      if (code === "50082571") {
        // Member verification code - only for member role
        if (finalRole !== 'member') {
          return new Response(
            JSON.stringify({
              success: false,
              error: "This verification code is only valid for member accounts"
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
      } else if (code === "97655500") {
        // Officer verification code - for officer roles
        if (!['officer', 'president', 'vice_president', 'admin'].includes(finalRole)) {
          return new Response(
            JSON.stringify({
              success: false,
              error: "This verification code is only valid for officer accounts"
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

      console.log("Verification code validation passed for", finalRole, "with code", code);
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
      console.log("Marking verification code as used:", code);

      // For universal codes, we don't mark them as used since they can be reused
      // Only mark specific org codes as used
      const { data: codeInfo } = await supabase
        .from("verification_codes")
        .select("org")
        .eq("code", code)
        .single();

      if (codeInfo?.org !== "UNIVERSAL") {
        const { error: codeUpdateError } = await supabase
          .from("verification_codes")
          .update({
            is_used: true,
            used_by: userId,
            used_at: new Date().toISOString()
          })
          .eq("code", code)
          .eq("is_used", false);

        if (codeUpdateError) {
          console.log("Failed to mark verification code as used:", codeUpdateError);
        } else {
          console.log("Verification code marked as used successfully");
        }
      } else {
        console.log("Universal verification code - not marking as used (can be reused)");
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