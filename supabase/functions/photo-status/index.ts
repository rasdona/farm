// ============================================================
// photo-status: Get user's photo status and trust badges
// ============================================================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function corsHeaders(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
  };
}

function jsonResp(data: Record<string, unknown>, status = 200, origin?: string | null) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
  });
}

function errorResp(msg: string, status = 400, origin?: string | null) {
  return jsonResp({ error: msg }, status, origin);
}

serve(async (req: Request): Promise<Response> => {
  const origin = req.headers.get("origin");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders(origin) });
  }

  if (req.method !== "GET") return errorResp("Method not allowed", 405, origin);

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) return errorResp("Unauthorized", 401, origin);

    const token = authHeader.replace("Bearer ", "");
    if (!token || token.length < 10) {
      return errorResp("Invalid authentication token. Please log in again.", 401, origin);
    }

    const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: { user }, error: authErr } = await sb.auth.getUser(token);
    if (authErr) {
      console.error("[photo-status] Auth error:", authErr.message);
      return errorResp("Authentication failed: " + authErr.message, 401, origin);
    }
    if (!user) return errorResp("User not found. Please log in again.", 401, origin);

    console.log("[photo-status] Authenticated user:", user.id);

    // Get user profile from users table
    const { data: profile, error: profileErr } = await sb.from("users")
      .select("profile_photo_url, profile_photo_verified, profile_completed, requires_photo_upload, mobile_verified, email_verified")
      .eq("id", user.id)
      .single();

    // Fallback: also check profiles table
    let photoUrl = profile?.profile_photo_url;
    let photoVerified = profile?.profile_photo_verified;

    if (!photoUrl) {
      const { data: profilesData } = await sb.from("profiles")
        .select("profile_picture_url")
        .eq("user_id", user.id)
        .single();

      if (profilesData?.profile_picture_url) {
        photoUrl = profilesData.profile_picture_url;
        console.log("[photo-status] Found photo in profiles table:", photoUrl);
        // Sync back to users table
        await sb.from("users").update({
          profile_photo_url: photoUrl,
          profile_photo_verified: true,
          requires_photo_upload: false,
        }).eq("id", user.id).catch(() => {});
      }
    }

    // Get trust badges
    const { data: badges } = await sb.rpc("get_trust_badges", { p_user_id: user.id });

    // Get photo history
    const { data: history } = await sb.rpc("get_photo_history", { p_user_id: user.id });

    // Get active photos
    const { data: photos } = await sb.from("profile_photos")
      .select("id, photo_url, file_name, file_size_bytes, file_type, width, height, created_at")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    return jsonResp({
      success: true,
      profile: {
        photo_url: photoUrl,
        photo_verified: photoVerified,
        profile_completed: profile?.profile_completed,
        requires_photo: profile?.requires_photo_upload,
        mobile_verified: profile?.mobile_verified,
        email_verified: profile?.email_verified,
      },
      badges: badges || [],
      photos: photos || [],
      history: history || [],
    }, 200, origin);

  } catch (err) {
    console.error("photo-status error:", err);
    return errorResp("Internal server error", 500, origin);
  }
});
