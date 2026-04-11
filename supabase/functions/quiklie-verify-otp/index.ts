import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

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

function normalizeGatewayStatusCode(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeGatewayStatus(value: unknown) {
  return String(value ?? "").trim().toUpperCase();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const quiklieBaseUrl = Deno.env.get("QUIKLIE_BASE_URL");

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ error: "Missing Supabase secrets" }, 500);
    }

    if (!quiklieBaseUrl) {
      return jsonResponse({ error: "Missing QUIKLIE_BASE_URL secret" }, 500);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();
    const { session_id, transactionId, otp } = body ?? {};

    if (!session_id || !transactionId || !otp) {
      return jsonResponse({ error: "session_id, transactionId and otp are required" }, 400);
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

    const gatewayStatus = normalizeGatewayStatus(gatewayJson.status);
    const gatewayStatusCode = normalizeGatewayStatusCode(gatewayJson.statusCode);

    const { data: session, error: sessionError } = await supabase
      .from("checkout_sessions")
      .select("id, order_number")
      .eq("session_id", session_id)
      .maybeSingle();

    if (sessionError || !session) {
      return jsonResponse({ error: "Checkout session not found" }, 404);
    }

    if (gatewayStatus === "SUCCESS" || gatewayStatusCode === "1") {
      const nowIso = new Date().toISOString();

      await supabase
        .from("checkout_sessions")
        .update({
          session_status: "converted",
          payment_status: "paid",
          payment_collected_at: nowIso,
          confirmed_at: nowIso,
          completed_at: nowIso,
          payment_method: "creditcard",
          gateway_name: "quiklie",
          gateway_transaction_id: String(transactionId),
          gateway_status: gatewayStatus || null,
          gateway_status_code: gatewayStatusCode || null,
          gateway_response_raw: gatewayJson,
          updated_at: nowIso
        })
        .eq("id", session.id);

      await supabase
        .from("orders")
        .update({
          order_status: "confirmed",
          payment_status: "paid",
          payment_method: "creditcard",
          payment_collected_at: nowIso,
          confirmed_at: nowIso,
          completed_at: nowIso,
          gateway_name: "quiklie",
          gateway_transaction_id: String(transactionId),
          gateway_status: gatewayStatus || null,
          gateway_status_code: gatewayStatusCode || null,
          gateway_response_raw: gatewayJson,
          updated_at: nowIso
        })
        .eq("checkout_session_id", session.id);
    }

    return jsonResponse({
      ok: true,
      status: gatewayStatus,
      statusCode: gatewayStatusCode,
      transactionId: String(transactionId),
      order_number: session.order_number || null,
      raw: gatewayJson
    }, gatewayRes.status);
  } catch (error) {
    return jsonResponse({
      error: error instanceof Error ? error.message : "Unexpected server error"
    }, 500);
  }
});
