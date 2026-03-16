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

async function loadOrderFromSupabase() {
  const params = new URLSearchParams(window.location.search);
  const orderNumber = params.get("order");

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

  const items = Array.isArray(order.cart_items) ? order.cart_items : [];

  if (itemsEl) {
    if (!items.length) {
      itemsEl.innerHTML = `<p>No items found for this order.</p>`;
      return;
    }

    itemsEl.innerHTML = items.map((item) => {
      const qty = Number(item.quantity || 1);
      const price = Number(item.price || 0);
      const lineTotal = qty * price;
      const variant = item.variant_label || item.variantLabel || item.variant || "";

      return `
        <div class="thank-you-item">
          <div class="thank-you-item-image">
            <img
              src="${normalizeImagePath(item.image || "")}"
              alt="${item.name || "Product"}"
              onerror="this.onerror=null;this.src='../images/products/placeholder.PNG';"
            />
          </div>

          <div class="thank-you-item-info">
            <h4>${item.name || "Product"}</h4>
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

document.addEventListener("DOMContentLoaded", async function () {
  const order = await loadOrderFromSupabase();
  renderOrder(order);
});
