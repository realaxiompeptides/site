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

function normalizeStatus(value: unknown) {
  return String(value ?? "").trim().toUpperCase();
}

function normalizeStatusCode(value: unknown) {
  return String(value ?? "").trim();
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
    const serviceRoleKey = Deno.env.get("SERVICE_ROLE_KEY");
    const webhookApiKey = Deno.env.get("QUIKLIE_WEBHOOK_API_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ error: "Missing Supabase secrets" }, 500);
    }

    const authHeader = req.headers.get("authorization") || req.headers.get("x-api-key") || "";
    if (webhookApiKey && authHeader && !authHeader.includes(webhookApiKey)) {
      return jsonResponse({ error: "Unauthorized webhook" }, 401);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const body = await req.json();

    const url = new URL(req.url);
    const session_id = url.searchParams.get("session_id");

    const transactionId = String(body.transactionId || body.qkpaymentId || "").trim();
    const status = normalizeStatus(body.status);
    const statusCode = normalizeStatusCode(body.statusCode);

    let sessionQuery = supabase.from("checkout_sessions").select("*");

    if (session_id) {
      sessionQuery = sessionQuery.eq("session_id", session_id);
    } else if (transactionId) {
      sessionQuery = sessionQuery.eq("gateway_transaction_id", transactionId);
    } else {
      return jsonResponse({ error: "Missing session_id or transactionId" }, 400);
    }

    const { data: session, error: sessionError } = await sessionQuery.maybeSingle();
    if (sessionError || !session) {
      return jsonResponse({ error: "Checkout session not found" }, 404);
    }

    const updatePayload: Record<string, unknown> = {
      gateway_name: "quiklie",
      gateway_transaction_id: transactionId || null,
      gateway_status: status || null,
      gateway_status_code: statusCode || null,
      gateway_response_raw: body,
      updated_at: new Date().toISOString()
    };

    if (status === "SUCCESS" || statusCode === "1") {
      const nowIso = new Date().toISOString();

      Object.assign(updatePayload, {
        session_status: "converted",
        payment_status: "paid",
        payment_collected_at: nowIso,
        confirmed_at: nowIso,
        completed_at: nowIso,
        payment_method: "credit_debit_card"
      });
    }

    await supabase
      .from("checkout_sessions")
      .update(updatePayload)
      .eq("id", session.id);

    const { data: order } = await supabase
      .from("orders")
      .select("id")
      .eq("checkout_session_id", session.id)
      .maybeSingle();

    if (order) {
      const orderUpdate: Record<string, unknown> = {
        gateway_name: "quiklie",
        gateway_transaction_id: transactionId || null,
        gateway_status: status || null,
        gateway_status_code: statusCode || null,
        gateway_response_raw: body,
        updated_at: new Date().toISOString()
      };

      if (status === "SUCCESS" || statusCode === "1") {
        const nowIso = new Date().toISOString();

        Object.assign(orderUpdate, {
          order_status: "confirmed",
          payment_status: "paid",
          payment_method: "credit_debit_card",
          payment_collected_at: nowIso,
          confirmed_at: nowIso,
          completed_at: nowIso
        });
      }

      await supabase
        .from("orders")
        .update(orderUpdate)
        .eq("id", order.id);

      await supabase.from("order_events").insert({
        order_id: order.id,
        checkout_session_id: session.id,
        event_type: "gateway_webhook",
        event_label: `Quiklie webhook: ${status || statusCode || "UNKNOWN"}`,
        event_data: body
      });
    }

    return jsonResponse({ ok: true });
  } catch (error) {
    return jsonResponse({
      error: error instanceof Error ? error.message : "Unexpected server error"
    }, 500);
  }
});
