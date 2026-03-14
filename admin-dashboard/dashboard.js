const DASHBOARD_PARTIALS = [
  { mountId: "sessionOverviewMount", file: "session-overview/session-overview.html" },
  { mountId: "paymentInfoMount", file: "payment-info/payment.html" },
  { mountId: "shippingInfoMount", file: "shipping-info/shipping.html" },
  { mountId: "billingInfoMount", file: "billing-info/billing.html" },
  { mountId: "cartItemsMount", file: "cart-items/cart-items.html" }
];

let allSessions = [];
let selectedSessionId = null;

function formatMoney(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function safeObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function renderAddress(addressObj) {
  const address = safeObject(addressObj);

  const lines = [
    [address.first_name, address.last_name].filter(Boolean).join(" ").trim(),
    address.address1 || "",
    address.address2 || "",
    [address.city, address.state, address.zip].filter(Boolean).join(", ").replace(", ,", ","),
    address.country || ""
  ].filter(Boolean);

  if (!lines.length) {
    return `<p>—</p>`;
  }

  return `<p>${lines.join("<br>")}</p>`;
}

async function loadPartials() {
  await Promise.all(
    DASHBOARD_PARTIALS.map(async ({ mountId, file }) => {
      const mount = document.getElementById(mountId);
      if (!mount) return;

      const response = await fetch(file, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Failed to load ${file}`);
      }

      mount.innerHTML = await response.text();
    })
  );
}

async function fetchCheckoutSessions() {
  if (!window.axiomSupabase) {
    console.error("Supabase client missing.");
    return [];
  }

  const { data, error } = await window.axiomSupabase
    .from("checkout_sessions")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load checkout sessions:", error);
    return [];
  }

  return data || [];
}

function getFilteredSessions() {
  const searchValue = (document.getElementById("sessionSearch")?.value || "").trim().toLowerCase();
  const statusValue = (document.getElementById("statusFilter")?.value || "").trim().toLowerCase();

  return allSessions.filter((session) => {
    const email = String(session.customer_email || "").toLowerCase();
    const phone = String(session.customer_phone || "").toLowerCase();
    const sessionId = String(session.session_id || "").toLowerCase();
    const status = String(session.session_status || "").toLowerCase();

    const matchesSearch =
      !searchValue ||
      email.includes(searchValue) ||
      phone.includes(searchValue) ||
      sessionId.includes(searchValue);

    const matchesStatus = !statusValue || status === statusValue;

    return matchesSearch && matchesStatus;
  });
}

function renderSessionsList() {
  const list = document.getElementById("sessionsList");
  if (!list) return;

  const sessions = getFilteredSessions();

  if (!sessions.length) {
    list.innerHTML = `<div class="dashboard-empty">No checkout sessions found.</div>`;
    return;
  }

  list.innerHTML = sessions.map((session) => {
    const isActive = session.id === selectedSessionId;
    return `
      <div class="dashboard-session-card ${isActive ? "active" : ""}" data-session-id="${session.id}">
        <h4>${session.customer_email || session.session_id || "Unknown Session"}</h4>
        <p>${session.customer_phone || "No phone"}</p>
        <p>${formatDateTime(session.created_at)}</p>
        <span class="dashboard-badge ${session.session_status}">${session.session_status || "active"}</span>
      </div>
    `;
  }).join("");

  list.querySelectorAll("[data-session-id]").forEach((card) => {
    card.addEventListener("click", () => {
      selectedSessionId = card.getAttribute("data-session-id");
      renderSessionsList();
      renderSelectedSession();
    });
  });
}

function renderSelectedSession() {
  const session = allSessions.find((entry) => entry.id === selectedSessionId);

  const title = document.getElementById("dashboardSessionTitle");
  if (title) {
    title.textContent = session
      ? (session.customer_email || session.session_id || "Checkout Session")
      : "Select a session";
  }

  if (!session) {
    return;
  }

  const shippingSelection = safeObject(session.shipping_selection);
  const cartItems = safeArray(session.cart_items);

  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value || "—";
  };

  setText("overviewSessionId", session.session_id || "—");
  setText("overviewStatus", session.session_status || "—");
  setText("overviewEmail", session.customer_email || "—");
  setText("overviewPhone", session.customer_phone || "—");
  setText("overviewCreated", formatDateTime(session.created_at));
  setText("overviewLastActivity", formatDateTime(session.last_activity_at));
  setText("overviewSubtotal", formatMoney(session.subtotal));
  setText("overviewShipping", formatMoney(session.shipping_amount));
  setText("overviewTax", formatMoney(session.tax_amount));
  setText("overviewTotal", formatMoney(session.total_amount));

  setText("paymentMethodValue", session.payment_method || "—");
  setText("paymentShippingMethodValue", shippingSelection.method_name || "—");
  setText("paymentShippingCodeValue", shippingSelection.method_code || "—");

  const shippingInfoBlock = document.getElementById("shippingInfoBlock");
  if (shippingInfoBlock) {
    shippingInfoBlock.innerHTML = renderAddress(session.shipping_address);
  }

  const billingInfoBlock = document.getElementById("billingInfoBlock");
  if (billingInfoBlock) {
    billingInfoBlock.innerHTML = renderAddress(session.billing_address);
  }

  const cartItemsTableWrap = document.getElementById("cartItemsTableWrap");
  if (cartItemsTableWrap) {
    if (!cartItems.length) {
      cartItemsTableWrap.innerHTML = `<div class="dashboard-empty">No cart items saved.</div>`;
    } else {
      cartItemsTableWrap.innerHTML = cartItems.map((item) => {
        const qty = Number(item.quantity || 0);
        const price = Number(item.price || 0);
        const lineTotal = qty * price;
        const image = item.image || "../images/products/placeholder.PNG";

        return `
          <div class="dashboard-item-row">
            <div class="dashboard-item-image">
              <img src="${image}" alt="${item.name || "Product"}" onerror="this.onerror=null;this.src='../images/products/placeholder.PNG';">
            </div>

            <div class="dashboard-item-info">
              <h4>${item.name || "Product"}</h4>
              <p>${item.variantLabel || "—"}</p>
              <p>Qty: ${qty}</p>
            </div>

            <div class="dashboard-item-price">
              ${formatMoney(lineTotal)}
            </div>
          </div>
        `;
      }).join("");
    }
  }
}

async function refreshDashboard() {
  const list = document.getElementById("sessionsList");
  if (list) {
    list.innerHTML = `<div class="dashboard-loading">Loading sessions...</div>`;
  }

  allSessions = await fetchCheckoutSessions();

  if (!selectedSessionId && allSessions.length) {
    selectedSessionId = allSessions[0].id;
  }

  renderSessionsList();
  renderSelectedSession();
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    await loadPartials();
    await refreshDashboard();

    document.getElementById("sessionSearch")?.addEventListener("input", renderSessionsList);
    document.getElementById("statusFilter")?.addEventListener("change", renderSessionsList);
    document.getElementById("refreshSessionsBtn")?.addEventListener("click", refreshDashboard);
  } catch (error) {
    console.error("Dashboard failed to initialize:", error);
  }
});
