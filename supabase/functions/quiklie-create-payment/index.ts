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
    const quiklieMerchantId = Deno.env.get("QUIKLIE_MERCHANT_ID");
    const callbackBase = Deno.env.get("QUIKLIE_CALLBACK_URL");
    const redirectBase = Deno.env.get("QUIKLIE_REDIRECT_URL");

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ error: "Missing Supabase secrets" }, 500);
    }

    if (!quiklieBaseUrl || !quiklieMerchantId || !callbackBase || !redirectBase) {
      return jsonResponse({ error: "Missing Quiklie secrets" }, 500);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();
    const {
      session_id,
      cardNumber,
      cardHolderName,
      cardExpiryMonth,
      cardExpiryYear,
      cardCvv,
      ipAddress
    } = body ?? {};

    if (!session_id) {
      return jsonResponse({ error: "session_id is required" }, 400);
    }

    if (!cardNumber || !cardHolderName || !cardExpiryMonth || !cardExpiryYear || !cardCvv) {
      return jsonResponse({ error: "Missing card fields" }, 400);
    }

    const { data: session, error: sessionError } = await supabase
      .from("checkout_sessions")
      .select("*")
      .eq("session_id", session_id)
      .maybeSingle();

    if (sessionError || !session) {
      return jsonResponse({ error: "Checkout session not found" }, 404);
    }

    const callbackUrl = `${callbackBase}?session_id=${encodeURIComponent(session_id)}`;
    const redirectUrl = `${redirectBase}?session_id=${encodeURIComponent(session_id)}`;

    const shipping = session.shipping_address || {};
    const billing = session.billing_address || shipping || {};

    const payload = {
      merchantId: Number(quiklieMerchantId),
      firstName: String(shipping.first_name || billing.first_name || session.customer_first_name || "").trim(),
      lastName: String(shipping.last_name || billing.last_name || session.customer_last_name || "").trim(),
      email: String(session.customer_email || "").trim(),
      phone: String(session.customer_phone || shipping.phone || billing.phone || "").trim(),
      amount: Number(session.total_amount || 0),
      currencyCode: String(session.currency || "USD").trim(),
      zipCode: String(shipping.zip || billing.zip || "").trim(),
      address: String(shipping.address1 || billing.address1 || "").trim(),
      city: String(shipping.city || billing.city || "").trim(),
      state: String(shipping.state || billing.state || "").trim(),
      country: String(shipping.country || billing.country || "US").trim(),
      cardNumber: String(cardNumber).replace(/\s+/g, ""),
      cardHolderName: String(cardHolderName).trim(),
      cardExpiryMonth: String(cardExpiryMonth).trim(),
      cardExpiryYear: String(cardExpiryYear).trim(),
      cardCvv: String(cardCvv).trim(),
      ipAddress: String(ipAddress || req.headers.get("x-forwarded-for") || "").split(",")[0].trim(),
      callbackUrl,
      redirectUrl
    };

    const gatewayRes = await fetch(`${quiklieBaseUrl}/api/v1/process-payment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
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
    const gatewayTransactionId = String(
      gatewayJson.qkpaymentId ||
      gatewayJson.quikleePaymentId ||
      gatewayJson.transactionId ||
      ""
    ).trim();
    const gatewayRedirectUrl = String(
      gatewayJson.quikleeRedirectUrl ||
      gatewayJson.redirectUrl ||
      ""
    ).trim();

    await supabase
      .from("checkout_sessions")
      .update({
        payment_method: "credit_debit_card",
        gateway_name: "quiklie",
        gateway_transaction_id: gatewayTransactionId || null,
        gateway_status: gatewayStatus || null,
        gateway_status_code: gatewayStatusCode || null,
        gateway_redirect_url: gatewayRedirectUrl || null,
        gateway_response_raw: gatewayJson,
        updated_at: new Date().toISOString()
      })
      .eq("id", session.id);

    const { data: existingOrder } = await supabase
      .from("orders")
      .select("id, order_number")
      .eq("checkout_session_id", session.id)
      .maybeSingle();

    let orderId = existingOrder?.id ?? null;
    let orderNumber = existingOrder?.order_number ?? session.order_number ?? null;

    if (!existingOrder) {
      const { data: insertedOrder, error: orderInsertError } = await supabase
        .from("orders")
        .insert({
          checkout_session_id: session.id,
          order_status: "pending",
          payment_status: "unpaid",
          fulfillment_status: "unfulfilled",
          customer_email: session.customer_email,
          customer_phone: session.customer_phone,
          customer_first_name: session.customer_first_name,
          customer_last_name: session.customer_last_name,
          cart_items: session.cart_items || [],
          subtotal: session.subtotal || 0,
          shipping_amount: session.shipping_amount || 0,
          tax_amount: session.tax_amount || 0,
          discount_amount: session.discount_amount || 0,
          total_amount: session.total_amount || 0,
          shipping_selection: session.shipping_selection || {},
          shipping_address: session.shipping_address || {},
          billing_address: session.billing_address || {},
          payment_method: "credit_debit_card",
          shipping_carrier: session.shipping_carrier || null,
          shipping_service: session.shipping_service_level || null,
          shipping_label_status: session.shipping_label_status || "not_purchased",
          payment_notes: session.payment_notes || null,
          gateway_name: "quiklie",
          gateway_transaction_id: gatewayTransactionId || null,
          gateway_status: gatewayStatus || null,
          gateway_status_code: gatewayStatusCode || null,
          gateway_redirect_url: gatewayRedirectUrl || null,
          gateway_response_raw: gatewayJson
        })
        .select("id, order_number")
        .single();

      if (orderInsertError) {
        return jsonResponse({ error: orderInsertError.message }, 500);
      }

      orderId = insertedOrder.id;
      orderNumber = insertedOrder.order_number;

      const cartItems = Array.isArray(session.cart_items) ? session.cart_items : [];
      if (cartItems.length) {
        const orderItems = cartItems.map((item: any) => ({
          order_id: insertedOrder.id,
          order_number: insertedOrder.order_number,
          product_id: item.id || null,
          slug: item.slug || null,
          product_name: item.product_name || item.name || "Product",
          variant_label: item.variant_label || item.variantLabel || item.variant || null,
          quantity: Number(item.quantity || item.qty || 1),
          unit_price: Number(item.unit_price || item.price || 0),
          line_total: Number(item.line_total || (Number(item.unit_price || item.price || 0) * Number(item.quantity || item.qty || 1))),
          image: item.image || null,
          weight_oz: Number(item.weight_oz || item.weightOz || 0)
        }));

        await supabase.from("order_items").insert(orderItems);
      }

      await supabase
        .from("checkout_sessions")
        .update({ order_number: insertedOrder.order_number })
        .eq("id", session.id);
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
          payment_method: "credit_debit_card",
          gateway_name: "quiklie",
          gateway_transaction_id: gatewayTransactionId || null,
          gateway_status: gatewayStatus || null,
          gateway_status_code: gatewayStatusCode || null,
          gateway_redirect_url: gatewayRedirectUrl || null,
          gateway_response_raw: gatewayJson
        })
        .eq("id", session.id);

      if (orderId) {
        await supabase
          .from("orders")
          .update({
            order_status: "confirmed",
            payment_status: "paid",
            payment_method: "credit_debit_card",
            payment_collected_at: nowIso,
            confirmed_at: nowIso,
            completed_at: nowIso,
            gateway_name: "quiklie",
            gateway_transaction_id: gatewayTransactionId || null,
            gateway_status: gatewayStatus || null,
            gateway_status_code: gatewayStatusCode || null,
            gateway_redirect_url: gatewayRedirectUrl || null,
            gateway_response_raw: gatewayJson
          })
          .eq("id", orderId);

        await supabase.from("order_events").insert({
          order_id: orderId,
          checkout_session_id: session.id,
          event_type: "payment_success",
          event_label: "Credit / Debit Card payment confirmed",
          event_data: gatewayJson
        });
      }
    }

    return jsonResponse({
      ok: true,
      status: gatewayStatus,
      statusCode: gatewayStatusCode,
      transactionId: gatewayTransactionId,
      redirectUrl: gatewayRedirectUrl,
      order_number: orderNumber
    });
  } catch (error) {
    return jsonResponse({
      error: error instanceof Error ? error.message : "Unexpected server error"
    }, 500);
  }
});
