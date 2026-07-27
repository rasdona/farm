// ============================================================
// delete-photo: Remove profile photo
// ============================================================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STORAGE_BUCKET = "avatars";

function corsHeaders(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, DELETE, OPTIONS",
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

  if (req.method !== "DELETE" && req.method !== "POST") {
    return errorResp("Method not allowed", 405, origin);
  }

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
      console.error("[delete-photo] Auth error:", authErr.message);
      return errorResp("Authentication failed: " + authErr.message, 401, origin);
    }
    if (!user) return errorResp("User not found. Please log in again.", 401, origin);

    console.log("[delete-photo] Authenticated user:", user.id);

    // Delete from storage (try both naming conventions)
    await sb.storage.from(STORAGE_BUCKET).remove([
      `${user.id}/profile.jpg`, `${user.id}/profile.png`, `${user.id}/profile.webp`,
      `${user.id}/avatar.jpg`, `${user.id}/avatar.png`, `${user.id}/avatar.webp`,
    ]).catch((e) => console.warn("[delete-photo] Storage cleanup warning:", e.message));

    // Update database via RPC
    const { data: result, error: fnErr } = await sb.rpc("delete_profile_photo", {
      p_user_id: user.id,
    });

    if (fnErr) {
      console.warn("[delete-photo] RPC failed:", fnErr.message);
      // Fallback: direct DB updates
      await sb.from("users").update({
        profile_photo_url: null,
        profile_photo_verified: false,
        requires_photo_upload: true,
        updated_at: new Date().toISOString(),
      }).eq("id", user.id).catch(() => {});

      await sb.from("profiles").update({
        profile_picture_url: null,
        updated_at: new Date().toISOString(),
      }).eq("user_id", user.id).catch(() => {});

      console.log("[delete-photo] Photo removed via direct DB fallback");
    } else {
      console.log("[delete-photo] Photo removed via RPC");
    }

    const r = result?.[0];

    return jsonResp({
      success: r?.success ?? true,
      message: r?.message ?? "Photo removed",
      requires_new_upload: r?.requires_new_upload ?? true,
    }, 200, origin);

  } catch (err) {
    console.error("delete-photo error:", err);
    return errorResp("Internal server error", 500, origin);
  }
});
