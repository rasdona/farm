// ============================================================
// verify-email-link: Verify email via link token
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
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      },
    });
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    const purpose = url.searchParams.get("purpose") || "email_verify";

    if (!token) {
      return errorResp("Token required", 400, origin);
    }

    const sb = getSupabase();

    const { data: verifyResult, error: verifyErr } = await sb.rpc(
      "verify_email_token",
      {
        p_token: token,
        p_purpose: purpose,
      }
    );

    if (verifyErr || !verifyResult?.[0]?.success) {
      // Redirect to error page
      return new Response(null, {
        status: 302,
        headers: {
          Location: `${Deno.env.get("APP_URL") || "https://krishiconnect.com.np"}/verify.html?error=invalid_token`,
          ...corsHeaders(origin),
        },
      });
    }

    const userId = verifyResult[0].user_id;

    // Complete verification
    if (purpose === "email_verify") {
      await sb.rpc("complete_email_verification", { p_user_id: userId });
    } else if (purpose === "password_reset") {
      // Redirect to reset page with token
      return new Response(null, {
        status: 302,
        headers: {
          Location: `${Deno.env.get("APP_URL") || "https://krishiconnect.com.np"}/reset-password?token=${token}`,
          ...corsHeaders(origin),
        },
      });
    }

    // Redirect to success page
    return new Response(null, {
      status: 302,
      headers: {
        Location: `${Deno.env.get("APP_URL") || "https://krishiconnect.com.np"}/verify.html?success=true`,
        ...corsHeaders(origin),
      },
    });

  } catch (err) {
    console.error("verify-email-link error:", err);
    return errorResp("Internal server error", 500, origin);
  }
});

function corsHeaders(origin: string | null): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}
