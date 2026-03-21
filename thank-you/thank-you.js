function formatMoney(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function normalizeImagePath(path) {
  if (!path || typeof path !== "string") {
    return "../images/products/placeholder.PNG";
  }

  const cleanPath = path.trim();

  if (
    cleanPath.startsWith("../") ||
    cleanPath.startsWith("./") ||
    cleanPath.startsWith("/") ||
    cleanPath.startsWith("http://") ||
    cleanPath.startsWith("https://")
  ) {
    return cleanPath;
  }

  return `../${cleanPath}`;
}

/*
  Replace these with your real payment handles / wallet addresses.
*/
const PAYMENT_DETAILS = {
  cashapp: {
    label: "Cash App",
    handle: "$REPLACE_WITH_YOUR_CASHAPP",
    instructions:
      "Send the payment through Cash App and include only your order number in the note."
  },
  applepay: {
    label: "Apple Pay",
    destination: "REPLACE_WITH_YOUR_APPLE_PAY_NUMBER_OR_EMAIL",
    instructions:
      "Send the payment through Apple Pay and include only your order number with the payment."
  },
  zelle: {
    label: "Zelle",
    destination: "REPLACE_WITH_YOUR_ZELLE_EMAIL_OR_PHONE",
    instructions:
      "Send the payment through Zelle and include only your order number with the payment."
  },
  crypto: {
    label: "Crypto",
    instructions:
      "Send the exact total using your selected crypto method. Double-check the network before sending.",
    wallets: {
      bitcoin: "REPLACE_WITH_YOUR_BITCOIN_WALLET",
      solana: "REPLACE_WITH_YOUR_SOLANA_WALLET",
      ethereum: "REPLACE_WITH_YOUR_ETHEREUM_WALLET",
      usdc: "REPLACE_WITH_YOUR_USDC_WALLET",
      usdt: "REPLACE_WITH_YOUR_USDT_WALLET"
    }
  }
};

function getBusinessDayShipEstimate(date) {
  const shipDate = new Date(date);
  shipDate.setHours(0, 0, 0, 0);

  const day = shipDate.getDay();

  if (day === 6) {
    shipDate.setDate(shipDate.getDate() + 2);
  } else if (day === 0) {
    shipDate.setDate(shipDate.getDate() + 1);
  } else {
    shipDate.setDate(shipDate.getDate() + 1);
    const nextDay = shipDate.getDay();
    if (nextDay === 6) {
      shipDate.setDate(shipDate.getDate() + 2);
    } else if (nextDay === 0) {
      shipDate.setDate(shipDate.getDate() + 1);
    }
  }

  return shipDate;
}

function getEstimatedDelivery(shipDate, shippingMethodName) {
  const deliveryDate = new Date(shipDate);
  const method = String(shippingMethodName || "").toLowerCase();

  let businessDaysToAdd = 4;

  if (method.includes("priority")) {
    businessDaysToAdd = 2;
  } else if (method.includes("ground")) {
    businessDaysToAdd = 4;
  } else if (method.includes("express")) {
    businessDaysToAdd = 1;
  }

  while (businessDaysToAdd > 0) {
    deliveryDate.setDate(deliveryDate.getDate() + 1);
    const day = deliveryDate.getDay();

    if (day !== 0 && day !== 6) {
      businessDaysToAdd -= 1;
    }
  }

  return deliveryDate;
}

function formatDateLong(date) {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric"
  });
}

function getOrderNumberFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("order");
}

async function loadOrderFromSupabase() {
  const orderNumber = getOrderNumberFromUrl();

  if (!orderNumber || !window.axiomSupabase) return null;

  const { data, error } = await window.axiomSupabase
    .from("orders")
    .select("*")
    .eq("order_number", Number(orderNumber))
    .maybeSingle();

  if (error) {
    console.error("Failed to load order:", error);
    return null;
  }

  return data || null;
}

function getPaymentMethodKey(rawValue) {
  const value = String(rawValue || "").trim().toLowerCase();

  if (!value) return "";

  if (value.includes("cash")) return "cashapp";
  if (value.includes("apple")) return "applepay";
  if (value.includes("zelle")) return "zelle";
  if (value.includes("crypto")) return "crypto";
  if (value.includes("bitcoin")) return "crypto";
  if (value.includes("solana")) return "crypto";
  if (value.includes("ethereum")) return "crypto";

  return value.replace(/\s+/g, "");
}

function getItemLineTotal(item) {
  if (item.line_total !== undefined && item.line_total !== null && !Number.isNaN(Number(item.line_total))) {
    return Number(item.line_total);
  }

  const qty = Number(item.quantity || item.qty || 1);
  const unitPrice =
    item.unit_price !== undefined && item.unit_price !== null && !Number.isNaN(Number(item.unit_price))
      ? Number(item.unit_price)
      : Number(item.price || 0);

  return qty * unitPrice;
}

function getItemDisplayName(item) {
  return item.name || item.product_name || item.productName || "Product";
}

function getItemDisplayVariant(item) {
  return item.variant_label || item.variantLabel || item.variant || "";
}

function getOrderItems(order) {
  if (Array.isArray(order?.cart_items)) {
    return order.cart_items;
  }

  return [];
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) {
    el.textContent = value;
  }
}

function setHtml(id, value) {
  const el = document.getElementById(id);
  if (el) {
    el.innerHTML = value;
  }
}

function makeTopLogoBigger() {
  const selectors = [
    ".thank-you-header .checkout-logo img",
    ".thank-you-logo img",
    ".thank-you-header img",
    ".order-success-header img",
    "header .checkout-logo img"
  ];

  selectors.forEach(function (selector) {
    document.querySelectorAll(selector).forEach(function (img) {
      img.style.width = "120px";
      img.style.maxWidth = "120px";
      img.style.height = "auto";
      img.style.objectFit = "contain";
      img.style.display = "block";
    });
  });
}

function renderPaymentInstructions(order) {
  const paymentMethod = order?.payment_method || "";
  const paymentKey = getPaymentMethodKey(paymentMethod);

  const instructionsMount =
    document.getElementById("thankYouPaymentInstructions") ||
    document.getElementById("paymentInstructions") ||
    document.getElementById("thankYouPaymentDetails") ||
    document.getElementById("thankYouPayNowBox");

  if (!instructionsMount) return;

  if (paymentKey === "cashapp") {
    instructionsMount.innerHTML = `
      <div class="thank-you-payment-card">
        <h3>Cash App Instructions</h3>
        <p>${PAYMENT_DETAILS.cashapp.instructions}</p>
        <div class="thank-you-payment-detail-row">
          <span>Cash App</span>
          <strong>${PAYMENT_DETAILS.cashapp.handle}</strong>
        </div>
        <div class="thank-you-payment-detail-row">
          <span>Order Number</span>
          <strong>#${order.order_number}</strong>
        </div>
      </div>
    `;
    return;
  }

  if (paymentKey === "applepay") {
    instructionsMount.innerHTML = `
      <div class="thank-you-payment-card">
        <h3>Apple Pay Instructions</h3>
        <p>${PAYMENT_DETAILS.applepay.instructions}</p>
        <div class="thank-you-payment-detail-row">
          <span>Send To</span>
          <strong>${PAYMENT_DETAILS.applepay.destination}</strong>
        </div>
        <div class="thank-you-payment-detail-row">
          <span>Order Number</span>
          <strong>#${order.order_number}</strong>
        </div>
      </div>
    `;
    return;
  }

  if (paymentKey === "zelle") {
    instructionsMount.innerHTML = `
      <div class="thank-you-payment-card">
        <h3>Zelle Instructions</h3>
        <p>${PAYMENT_DETAILS.zelle.instructions}</p>
        <div class="thank-you-payment-detail-row">
          <span>Send To</span>
          <strong>${PAYMENT_DETAILS.zelle.destination}</strong>
        </div>
        <div class="thank-you-payment-detail-row">
          <span>Order Number</span>
          <strong>#${order.order_number}</strong>
        </div>
      </div>
    `;
    return;
  }

  if (paymentKey === "crypto") {
    instructionsMount.innerHTML = `
      <div class="thank-you-payment-card">
        <h3>Crypto Instructions</h3>
        <p>${PAYMENT_DETAILS.crypto.instructions}</p>

        <div class="thank-you-payment-detail-row">
          <span>Order Number</span>
          <strong>#${order.order_number}</strong>
        </div>

        <div class="thank-you-wallet-list">
          <div class="thank-you-payment-detail-row">
            <span>Bitcoin</span>
            <strong>${PAYMENT_DETAILS.crypto.wallets.bitcoin}</strong>
          </div>

          <div class="thank-you-payment-detail-row">
            <span>Solana</span>
            <strong>${PAYMENT_DETAILS.crypto.wallets.solana}</strong>
          </div>

          <div class="thank-you-payment-detail-row">
            <span>Ethereum</span>
            <strong>${PAYMENT_DETAILS.crypto.wallets.ethereum}</strong>
          </div>

          <div class="thank-you-payment-detail-row">
            <span>USDC</span>
            <strong>${PAYMENT_DETAILS.crypto.wallets.usdc}</strong>
          </div>

          <div class="thank-you-payment-detail-row">
            <span>USDT</span>
            <strong>${PAYMENT_DETAILS.crypto.wallets.usdt}</strong>
          </div>
        </div>
      </div>
    `;
    return;
  }

  instructionsMount.innerHTML = `
    <div class="thank-you-payment-card">
      <h3>Payment Instructions</h3>
      <p>Please use the selected payment method and include your order number when required.</p>
      <div class="thank-you-payment-detail-row">
        <span>Payment Method</span>
        <strong>${paymentMethod || "Not selected"}</strong>
      </div>
      <div class="thank-you-payment-detail-row">
        <span>Order Number</span>
        <strong>#${order.order_number}</strong>
      </div>
    </div>
  `;
}

function renderOrder(order) {
  if (!order) return;

  const orderNumberEl = document.getElementById("thankYouOrderNumber");
  const orderStatusEl = document.getElementById("thankYouOrderStatus");
  const subtotalEl = document.getElementById("thankYouSubtotal");
  const shippingEl = document.getElementById("thankYouShipping");
  const taxEl = document.getElementById("thankYouTax");
  const totalEl = document.getElementById("thankYouTotal");
  const paymentMethodEl = document.getElementById("thankYouPaymentMethod");
  const shippingMethodEl = document.getElementById("thankYouShippingMethod");
  const emailEl = document.getElementById("thankYouEmail");
  const phoneEl = document.getElementById("thankYouPhone");
  const shipEstimateEl = document.getElementById("thankYouShipEstimate");
  const deliveryEstimateEl = document.getElementById("thankYouDeliveryEstimate");
  const deliveryMethodEl = document.getElementById("thankYouDeliveryMethod");
  const itemsEl = document.getElementById("thankYouItems");

  if (orderNumberEl) orderNumberEl.textContent = `#${order.order_number}`;
  if (orderStatusEl) orderStatusEl.textContent = "Pending Payment";
  if (subtotalEl) subtotalEl.textContent = formatMoney(order.subtotal || 0);
  if (shippingEl) shippingEl.textContent = formatMoney(order.shipping_amount || 0);
  if (taxEl) taxEl.textContent = formatMoney(order.tax_amount || 0);
  if (totalEl) totalEl.textContent = formatMoney(order.total_amount || 0);
  if (paymentMethodEl) paymentMethodEl.textContent = order.payment_method || "Not selected";
  if (shippingMethodEl) {
    shippingMethodEl.textContent =
      order.shipping_method_name ||
      order.shipping_selection?.method_name ||
      order.shipping_selection?.label ||
      "Not selected";
  }
  if (emailEl) emailEl.textContent = order.customer_email || "—";
  if (phoneEl) phoneEl.textContent = order.customer_phone || "—";

  const shipDate = getBusinessDayShipEstimate(new Date());
  const deliveryDate = getEstimatedDelivery(
    shipDate,
    order.shipping_method_name || order.shipping_selection?.method_name || ""
  );

  if (shipEstimateEl) shipEstimateEl.textContent = formatDateLong(shipDate);
  if (deliveryEstimateEl) deliveryEstimateEl.textContent = formatDateLong(deliveryDate);
  if (deliveryMethodEl) {
    deliveryMethodEl.textContent =
      order.shipping_method_name ||
      order.shipping_selection?.method_name ||
      "Delivery estimate depends on the shipping method selected.";
  }

  renderPaymentInstructions(order);

  const items = getOrderItems(order);

  if (itemsEl) {
    if (!items.length) {
      itemsEl.innerHTML = `<p>No items found for this order.</p>`;
      return;
    }

    itemsEl.innerHTML = items.map((item) => {
      const qty = Number(item.quantity || item.qty || 1);
      const lineTotal = getItemLineTotal(item);
      const variant = getItemDisplayVariant(item);
      const itemName = getItemDisplayName(item);

      return `
        <div class="thank-you-item">
          <div class="thank-you-item-image">
            <img
              src="${normalizeImagePath(item.image || "")}"
              alt="${itemName}"
              onerror="this.onerror=null;this.src='../images/products/placeholder.PNG';"
            />
          </div>

          <div class="thank-you-item-info">
            <h4>${itemName}</h4>
            ${variant ? `<p>${variant}</p>` : ""}
            <p>Qty: ${qty}</p>
          </div>

          <div class="thank-you-item-price">
            ${formatMoney(lineTotal)}
          </div>
        </div>
      `;
    }).join("");
  }
}

function renderMissingOrderState() {
  setText("thankYouOrderNumber", "Order Not Found");
  setText("thankYouOrderStatus", "Unavailable");
  setText("thankYouSubtotal", "$0.00");
  setText("thankYouShipping", "$0.00");
  setText("thankYouTax", "$0.00");
  setText("thankYouTotal", "$0.00");
  setHtml("thankYouItems", "<p>We could not find this order.</p>");

  const instructionsMount =
    document.getElementById("thankYouPaymentInstructions") ||
    document.getElementById("paymentInstructions") ||
    document.getElementById("thankYouPaymentDetails") ||
    document.getElementById("thankYouPayNowBox");

  if (instructionsMount) {
    instructionsMount.innerHTML = `
      <div class="thank-you-payment-card">
        <h3>Order Not Found</h3>
        <p>Please go back to your checkout confirmation link or contact support if this keeps happening.</p>
      </div>
    `;
  }
}

document.addEventListener("DOMContentLoaded", async function () {
  makeTopLogoBigger();

  const order = await loadOrderFromSupabase();

  if (!order) {
    renderMissingOrderState();
    return;
  }

  renderOrder(order);
});
