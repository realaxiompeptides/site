import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const quiklieBaseUrl = Deno.env.get("QUIKLIE_BASE_URL");
    if (!quiklieBaseUrl) {
      return jsonResponse({ error: "Missing QUIKLIE_BASE_URL secret" }, 500);
    }

    const body = await req.json();
    const { transactionId, otp } = body ?? {};

    if (!transactionId || !otp) {
      return jsonResponse({ error: "transactionId and otp are required" }, 400);
    }

    const gatewayRes = await fetch(`${quiklieBaseUrl}/api/v1/verify-otp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        transactionId: String(transactionId),
        otp: String(otp)
      })
    });

    const gatewayText = await gatewayRes.text();

    let gatewayJson: Record<string, unknown> = {};
    try {
      gatewayJson = gatewayText ? JSON.parse(gatewayText) : {};
    } catch {
      gatewayJson = { raw: gatewayText };
    }

    return jsonResponse(gatewayJson, gatewayRes.status);
  } catch (error) {
    return jsonResponse({
      error: error instanceof Error ? error.message : "Unexpected server error"
    }, 500);
  }
});
