document.addEventListener("DOMContentLoaded", function () {
  const loginTab = document.getElementById("loginTab");
  const signupTab = document.getElementById("signupTab");
  const loginForm = document.getElementById("loginForm");
  const signupForm = document.getElementById("signupForm");

  const accountMessage = document.getElementById("accountMessage");

  const loginEmail = document.getElementById("loginEmail");
  const loginPassword = document.getElementById("loginPassword");
  const signupEmail = document.getElementById("signupEmail");
  const signupPassword = document.getElementById("signupPassword");
  const signupPasswordConfirm = document.getElementById("signupPasswordConfirm");

  const forgotPasswordBtn = document.getElementById("forgotPasswordBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  const refreshOrdersBtn = document.getElementById("refreshOrdersBtn");

  const authCard = document.getElementById("authCard");
  const dashboardCard = document.getElementById("dashboardCard");
  const ordersCard = document.getElementById("ordersCard");

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

  function switchToLogin() {
    if (loginTab) loginTab.classList.add("is-active");
    if (signupTab) signupTab.classList.remove("is-active");
    if (loginForm) loginForm.hidden = false;
    if (signupForm) signupForm.hidden = true;
    clearMessage();
  }

  function switchToSignup() {
    if (signupTab) signupTab.classList.add("is-active");
    if (loginTab) loginTab.classList.remove("is-active");
    if (signupForm) signupForm.hidden = false;
    if (loginForm) loginForm.hidden = true;
    clearMessage();
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
    const shippingAddress = order.shipping_address || order.shippingAddress || null;

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

    const fallbackAddress = [
      order.shipping_name,
      order.shipping_address_1,
      order.shipping_address_2,
      [order.shipping_city, order.shipping_state, order.shipping_zip].filter(Boolean).join(", "),
      order.shipping_country
    ]
      .filter(Boolean)
      .join(" • ");

    return fallbackAddress || "Not available";
  }

  function getOrderItems(order) {
    if (Array.isArray(order.order_items) && order.order_items.length) {
      return order.order_items;
    }

    if (Array.isArray(order.cart_items) && order.cart_items.length) {
      return order.cart_items;
    }

    if (Array.isArray(order.items) && order.items.length) {
      return order.items;
    }

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

    const firstStatus = normalizeStatus(orders[0].order_status || orders[0].status || "pending");
    latestStatus.textContent = firstStatus.label;

    orders.forEach(function (order) {
      const statusMeta = normalizeStatus(order.order_status || order.status || "pending");
      const orderNumber =
        order.order_number ||
        order.public_order_id ||
        order.id ||
        "Order";
      const trackingNumber =
        order.tracking_number ||
        order.trackingNumber ||
        "";
      const trackingUrl =
        order.tracking_url ||
        order.trackingUrl ||
        buildTrackingUrl(trackingNumber);
      const eta =
        order.estimated_delivery ||
        order.estimated_delivery_date ||
        order.delivery_estimate ||
        "";
      const total =
        order.total_amount ??
        order.total ??
        order.order_total ??
        0;
      const items = getOrderItems(order);
      const createdAt =
        order.created_at ||
        order.inserted_at ||
        order.order_date ||
        "";
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

  async function claimOrdersForUser() {
    if (!supabase) return;

    try {
      const { error } = await supabase.rpc("claim_my_orders");
      if (error) {
        console.error("claim_my_orders failed:", error);
      }
    } catch (error) {
      console.error("claim_my_orders exception:", error);
    }
  }

  async function loadOrdersForUser(user) {
    if (!supabase || !user || !user.email) {
      renderOrders([]);
      return;
    }

    const { data, error } = await supabase.rpc("get_my_orders");

    if (error) {
      console.error("Failed to load orders:", error);
      showMessage("Could not load your orders right now.", "error");
      renderOrders([]);
      return;
    }

    renderOrders(Array.isArray(data) ? data : []);
  }

  async function updateAuthView(options) {
    const opts = options || {};
    const preserveMessage = opts.preserveMessage === true;

    if (!supabase) {
      showMessage("Supabase is not configured on this page yet.", "error");
      return;
    }

    const { data, error } = await supabase.auth.getUser();
    if (error) {
      console.error(error);
    }

    const user = data && data.user ? data.user : null;

    if (!user) {
      if (authCard) authCard.hidden = false;
      if (dashboardCard) dashboardCard.hidden = true;
      if (ordersCard) ordersCard.hidden = true;
      if (accountEmailDisplay) accountEmailDisplay.textContent = "—";
      renderOrders([]);

      if (!preserveMessage) {
        clearMessage();
      }
      return;
    }

    if (authCard) authCard.hidden = true;
    if (dashboardCard) dashboardCard.hidden = false;
    if (ordersCard) ordersCard.hidden = false;
    if (accountEmailDisplay) accountEmailDisplay.textContent = user.email || "Account";

    await claimOrdersForUser();
    await loadOrdersForUser(user);
  }

  if (loginTab) loginTab.addEventListener("click", switchToLogin);
  if (signupTab) signupTab.addEventListener("click", switchToSignup);

  if (loginForm) {
    loginForm.addEventListener("submit", async function (event) {
      event.preventDefault();
      clearMessage();

      if (!supabase) {
        showMessage("Supabase is not configured.", "error");
        return;
      }

      const email = (loginEmail && loginEmail.value ? loginEmail.value : "").trim().toLowerCase();
      const password = loginPassword ? loginPassword.value : "";

      if (!email || !password) {
        showMessage("Enter your email and password.", "error");
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password
      });

      if (error) {
        showMessage(error.message || "Unable to sign in.", "error");
        return;
      }

      showMessage("Signed in successfully.", "success");
      await updateAuthView({ preserveMessage: true });
    });
  }

  if (signupForm) {
    signupForm.addEventListener("submit", async function (event) {
      event.preventDefault();
      clearMessage();

      if (!supabase) {
        showMessage("Supabase is not configured.", "error");
        return;
      }

      const email = (signupEmail && signupEmail.value ? signupEmail.value : "").trim().toLowerCase();
      const password = signupPassword ? signupPassword.value : "";
      const confirm = signupPasswordConfirm ? signupPasswordConfirm.value : "";

      if (!email || !password || !confirm) {
        showMessage("Fill out all fields.", "error");
        return;
      }

      if (password.length < 6) {
        showMessage("Password must be at least 6 characters.", "error");
        return;
      }

      if (password !== confirm) {
        showMessage("Passwords do not match.", "error");
        return;
      }

      const redirectBase =
        window.location.origin +
        "/site/account/account.html";

      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          emailRedirectTo: redirectBase
        }
      });

      if (error) {
        showMessage(error.message || "Unable to create account.", "error");
        return;
      }

      const userCreated = data && data.user;

      if (userCreated && data.session) {
        showMessage("Account created and signed in successfully.", "success");
        await updateAuthView({ preserveMessage: true });
        return;
      }

      showMessage("Account created. Check your email to confirm your account if email confirmation is enabled.", "success");
      switchToLogin();
      if (loginEmail) loginEmail.value = email;
    });
  }

  if (forgotPasswordBtn) {
    forgotPasswordBtn.addEventListener("click", async function () {
      clearMessage();

      if (!supabase) {
        showMessage("Supabase is not configured.", "error");
        return;
      }

      const email = (loginEmail && loginEmail.value ? loginEmail.value : "").trim().toLowerCase();
      if (!email) {
        showMessage("Enter your email first.", "error");
        return;
      }

      const redirectBase =
        window.location.origin +
        "/site/account/account.html";

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectBase
      });

      if (error) {
        showMessage(error.message || "Could not send reset email.", "error");
        return;
      }

      showMessage("Password reset email sent.", "success");
    });
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

      if (authCard) authCard.hidden = false;
      if (dashboardCard) dashboardCard.hidden = true;
      if (ordersCard) ordersCard.hidden = true;
      if (accountEmailDisplay) accountEmailDisplay.textContent = "—";
      renderOrders([]);
      switchToLogin();
      showMessage("Logged out successfully.", "success");
    });
  }

  if (refreshOrdersBtn) {
    refreshOrdersBtn.addEventListener("click", async function () {
      clearMessage();

      if (!supabase) {
        showMessage("Supabase is not configured.", "error");
        return;
      }

      await claimOrdersForUser();

      const { data, error } = await supabase.auth.getUser();
      if (error) {
        console.error(error);
      }

      const user = data && data.user ? data.user : null;
      await loadOrdersForUser(user);
    });
  }

  if (supabase && supabase.auth && typeof supabase.auth.onAuthStateChange === "function") {
    supabase.auth.onAuthStateChange(async function (event) {
      if (event === "SIGNED_IN" || event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
        await updateAuthView({ preserveMessage: true });
        return;
      }

      if (event === "SIGNED_OUT") {
        if (authCard) authCard.hidden = false;
        if (dashboardCard) dashboardCard.hidden = true;
        if (ordersCard) ordersCard.hidden = true;
        if (accountEmailDisplay) accountEmailDisplay.textContent = "—";
        renderOrders([]);
        switchToLogin();
      }
    });
  }

  updateAuthView();
});
