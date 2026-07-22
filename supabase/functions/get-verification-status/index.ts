// ============================================================
// get-verification-status: Get user's verification status
// ============================================================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getSupabase, jsonResp, errorResp } from "../_shared/utils.ts";

serve(async (req: Request): Promise<Response> => {
  const origin = req.headers.get("origin");

  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": origin || "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
      },
    });
  }

  if (req.method !== "GET") return errorResp("Method not allowed", 405, origin);

  try {
    // Extract user from JWT
    const authHeader = req.headers.get("authorization");
    if (!authHeader) return errorResp("Unauthorized", 401, origin);

    const token = authHeader.replace("Bearer ", "");
    const sb = getSupabase();

    const { data: { user }, error: authErr } = await sb.auth.getUser(token);
    if (authErr || !user) return errorResp("Unauthorized", 401, origin);

    const { data, error } = await sb.rpc("get_verification_status", {
      p_user_id: user.id,
    });

    if (error) {
      console.error("get_verification_status error:", error);
      return errorResp("Failed to get status", 500, origin);
    }

    return jsonResp({
      success: true,
      verification: data?.[0] || null,
    }, 200, origin);

  } catch (err) {
    console.error("get-verification-status error:", err);
    return errorResp("Internal server error", 500, origin);
  }
});
