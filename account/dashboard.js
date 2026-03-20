document.addEventListener("DOMContentLoaded", function () {
  const accountMessage = document.getElementById("accountMessage");
  const logoutBtn = document.getElementById("logoutBtn");
  const refreshOrdersBtn = document.getElementById("refreshOrdersBtn");
  const accountEmailDisplay = document.getElementById("accountEmailDisplay");
  const orderCount = document.getElementById("orderCount");
  const latestStatus = document.getElementById("latestStatus");
  const ordersList = document.getElementById("ordersList");
  const ordersEmptyState = document.getElementById("ordersEmptyState");

  function getSupabaseClient() {
    if (window.supabaseClient) return window.supabaseClient;

    if (window.AXIOM_SUPABASE && typeof window.AXIOM_SUPABASE === "object") {
      return window.AXIOM_SUPABASE;
    }

    if (window.supabase && typeof window.supabase.createClient === "function") {
      const config =
        window.AXIOM_DASHBOARD_CONFIG ||
        window.dashboardConfig ||
        window.AXIOM_CONFIG ||
        null;

      if (!config) return null;

      const url =
        config.supabaseUrl ||
        config.SUPABASE_URL ||
        config.url ||
        "";

      const anonKey =
        config.supabaseAnonKey ||
        config.SUPABASE_ANON_KEY ||
        config.anonKey ||
        "";

      if (!url || !anonKey) return null;

      return window.supabase.createClient(url, anonKey);
    }

    return null;
  }

  const supabase = getSupabaseClient();

  function accountPageUrl() {
    return window.location.hostname.includes("github.io")
      ? "/site/account/account.html"
      : "/account/account.html";
  }

  function showMessage(text, type) {
    if (!accountMessage) return;
    accountMessage.hidden = false;
    accountMessage.textContent = text;
    accountMessage.className = `account-message ${type === "error" ? "is-error" : "is-success"}`;
  }

  function clearMessage() {
    if (!accountMessage) return;
    accountMessage.hidden = true;
    accountMessage.textContent = "";
    accountMessage.className = "account-message";
  }

  function normalizeStatus(status) {
    const clean = String(status || "").trim().toLowerCase();
    if (!clean) return { label: "Pending", className: "default" };
    if (clean.includes("deliver")) return { label: "Delivered", className: "delivered" };
    if (clean.includes("ship")) return { label: "Shipped", className: "shipped" };
    if (clean.includes("paid")) return { label: "Paid", className: "paid" };
    if (clean.includes("pend")) return { label: "Pending", className: "pending" };

    return {
      label: clean.charAt(0).toUpperCase() + clean.slice(1),
      className: "default"
    };
  }

  function formatMoney(value) {
    return `$${Number(value || 0).toFixed(2)}`;
  }

  function formatDate(value) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleString();
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function buildTrackingUrl(trackingNumber) {
    const clean = String(trackingNumber || "").trim();
    if (!clean) return "";
    return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${encodeURIComponent(clean)}`;
  }

  function getOrderShippingAddress(order) {
    const shippingAddress = order.shipping_address || null;

    if (shippingAddress && typeof shippingAddress === "object") {
      const name =
        shippingAddress.full_name ||
        [shippingAddress.first_name, shippingAddress.last_name].filter(Boolean).join(" ").trim();

      const cityStateZip = [
        shippingAddress.city,
        shippingAddress.state,
        shippingAddress.zip || shippingAddress.postal_code
      ]
        .filter(Boolean)
        .join(", ");

      return [
        name,
        shippingAddress.address1 || shippingAddress.line1,
        shippingAddress.address2 || shippingAddress.line2,
        cityStateZip,
        shippingAddress.country
      ]
        .filter(Boolean)
        .join(" • ");
    }

    return "Not available";
  }

  function getOrderItems(order) {
    if (Array.isArray(order.order_items) && order.order_items.length) return order.order_items;
    if (Array.isArray(order.cart_items) && order.cart_items.length) return order.cart_items;
    return [];
  }

  function renderOrderItems(items) {
    if (!Array.isArray(items) || !items.length) {
      return `<div class="order-item"><div class="order-item-meta">No item details available.</div></div>`;
    }

    return items.map(function (item) {
      const name = escapeHtml(item.name || item.product_name || "Product");
      const variant = escapeHtml(item.variantLabel || item.variant_label || item.variant || "");
      const qty = Number(item.quantity || item.qty || 1);
      const price = Number(item.price || item.unit_price || 0);

      return `
        <div class="order-item">
          <div>
            <div class="order-item-name">${name}</div>
            <div class="order-item-meta">
              ${variant ? `${variant}<br>` : ""}
              Qty: ${qty}
            </div>
          </div>
          <div class="order-item-name">${formatMoney(price * qty)}</div>
        </div>
      `;
    }).join("");
  }

  function renderOrders(orders) {
    if (!ordersList || !ordersEmptyState || !orderCount || !latestStatus) return;

    ordersList.innerHTML = "";

    if (!Array.isArray(orders) || !orders.length) {
      ordersEmptyState.hidden = false;
      orderCount.textContent = "0";
      latestStatus.textContent = "—";
      return;
    }

    ordersEmptyState.hidden = true;
    orderCount.textContent = String(orders.length);

    const firstStatus = normalizeStatus(orders[0].order_status || "pending");
    latestStatus.textContent = firstStatus.label;

    orders.forEach(function (order) {
      const statusMeta = normalizeStatus(order.order_status || "pending");
      const orderNumber = order.order_number || order.id || "Order";
      const trackingNumber = order.tracking_number || "";
      const trackingUrl = order.tracking_url || buildTrackingUrl(trackingNumber);
      const eta =
        order.estimated_delivery ||
        order.estimated_delivery_date ||
        order.delivery_estimate ||
        "";
      const total = order.total_amount ?? 0;
      const items = getOrderItems(order);
      const createdAt = order.created_at || "";
      const shippingAddress = getOrderShippingAddress(order);

      const card = document.createElement("article");
      card.className = "order-card";
      card.innerHTML = `
        <div class="order-top">
          <div>
            <p class="order-id">Order #${escapeHtml(orderNumber)}</p>
            <p class="order-date">Placed: ${escapeHtml(formatDate(createdAt))}</p>
          </div>
          <span class="order-status ${statusMeta.className}">${escapeHtml(statusMeta.label)}</span>
        </div>

        <div class="order-grid">
          <div class="order-info-box">
            <span class="order-info-label">Total</span>
            <div class="order-info-value">${formatMoney(total)}</div>
          </div>

          <div class="order-info-box">
            <span class="order-info-label">Tracking Number</span>
            <div class="order-info-value">${escapeHtml(trackingNumber || "Not added yet")}</div>
          </div>

          <div class="order-info-box">
            <span class="order-info-label">Estimated Delivery</span>
            <div class="order-info-value">${escapeHtml(eta || "Not available yet")}</div>
          </div>

          <div class="order-info-box">
            <span class="order-info-label">Shipping Address</span>
            <div class="order-info-value">${escapeHtml(shippingAddress)}</div>
          </div>
        </div>

        <div class="order-items">
          <h4>Items</h4>
          ${renderOrderItems(items)}
        </div>

        <div class="order-links">
          ${trackingUrl ? `<a class="order-link" href="${trackingUrl}" target="_blank" rel="noopener noreferrer">Track Package</a>` : ""}
          <a class="order-link" href="mailto:realaxiompeptides@gmail.com?subject=${encodeURIComponent(`Help with Order #${orderNumber}`)}">Email Support</a>
        </div>
      `;

      ordersList.appendChild(card);
    });
  }

  async function getLoggedInUser() {
    if (!supabase) return null;

    const { data, error } = await supabase.auth.getUser();
    if (error) {
      console.error("getUser failed:", error);
      return null;
    }

    return data && data.user ? data.user : null;
  }

  async function claimOrdersForUser() {
    if (!supabase) return;

    const { error } = await supabase.rpc("claim_my_orders");
    if (error) {
      console.error("claim_my_orders failed:", error);
    }
  }

  async function loadOrders() {
    clearMessage();

    const user = await getLoggedInUser();
    if (!user) {
      redirectToAccount();
      return;
    }

    if (accountEmailDisplay) {
      accountEmailDisplay.textContent = user.email || "Account";
    }

    await claimOrdersForUser();

    const { data, error } = await supabase.rpc("get_my_orders");

    if (error) {
      console.error("get_my_orders failed:", error);
      showMessage("Could not load your orders right now.", "error");
      renderOrders([]);
      return;
    }

    renderOrders(Array.isArray(data) ? data : []);
  }

  function redirectToAccount() {
    window.location.href = accountPageUrl();
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", async function () {
      clearMessage();

      if (!supabase) {
        showMessage("Supabase is not configured.", "error");
        return;
      }

      const { error } = await supabase.auth.signOut();
      if (error) {
        showMessage(error.message || "Unable to log out.", "error");
        return;
      }

      redirectToAccount();
    });
  }

  if (refreshOrdersBtn) {
    refreshOrdersBtn.addEventListener("click", async function () {
      await loadOrders();
    });
  }

  if (supabase && supabase.auth && typeof supabase.auth.onAuthStateChange === "function") {
    supabase.auth.onAuthStateChange(async function (event) {
      if (event === "SIGNED_OUT") {
        redirectToAccount();
        return;
      }

      if (
        event === "SIGNED_IN" ||
        event === "INITIAL_SESSION" ||
        event === "TOKEN_REFRESHED" ||
        event === "USER_UPDATED"
      ) {
        await loadOrders();
      }
    });
  }

  loadOrders();
});
