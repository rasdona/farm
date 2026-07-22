// ============================================================
// cleanup-otps: Cron job to purge expired OTPs
// ============================================================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getSupabase, jsonResp, errorResp } from "../_shared/utils.ts";

serve(async (req: Request): Promise<Response> => {
  try {
    // Verify cron secret
    const authHeader = req.headers.get("authorization");
    const cronSecret = Deno.env.get("CRON_SECRET");

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return errorResp("Unauthorized", 401);
    }

    const sb = getSupabase();

    const { data, error } = await sb.rpc("cleanup_expired_otps");

    if (error) {
      console.error("cleanup error:", error);
      return errorResp("Cleanup failed", 500);
    }

    console.log(`Cleanup completed. Expired OTPs: ${data}`);

    return jsonResp({
      success: true,
      message: "Cleanup completed",
      expired_otps: data,
    });

  } catch (err) {
    console.error("cleanup-otps error:", err);
    return errorResp("Internal server error", 500);
  }
});
