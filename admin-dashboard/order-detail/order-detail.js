window.AXIOM_ORDER_DETAIL = {
  currentSession: null,

  setSession(session) {
    this.currentSession = session;
    this.renderOverview(session);
    this.renderPayment(session);
    this.renderShipping(session);
    this.renderBilling(session);
    this.renderCartItems(session);
  },

  renderOverview(session) {
    const map = {
      detailSessionId: session?.session_id || "—",
      detailStatus: session?.session_status || "—",
      detailEmail: session?.customer_email || "—",
      detailPhone: session?.customer_phone || "—",
      detailCreated: session?.created_at ? new Date(session.created_at).toLocaleString() : "—",
      detailLastActivity: session?.last_activity_at ? new Date(session.last_activity_at).toLocaleString() : "—",
      detailSubtotal: window.AXIOM_HELPERS.formatMoney(session?.subtotal || 0),
      detailShipping: window.AXIOM_HELPERS.formatMoney(session?.shipping_amount || 0),
      detailTax: window.AXIOM_HELPERS.formatMoney(session?.tax_amount || 0),
      detailTotal: window.AXIOM_HELPERS.formatMoney(session?.total_amount || 0)
    };

    Object.keys(map).forEach(function (id) {
      const el = document.getElementById(id);
      if (el) el.textContent = map[id];
    });
  },

  renderPayment(session) {
    const paymentMethod = document.getElementById("detailPaymentMethod");
    const shippingMethod = document.getElementById("detailShippingMethod");
    const shippingCode = document.getElementById("detailShippingCode");

    if (paymentMethod) paymentMethod.textContent = session?.payment_method || "—";
    if (shippingMethod) {
      shippingMethod.textContent =
        session?.shipping_selection?.label ||
        session?.shipping_selection?.service ||
        "—";
    }
    if (shippingCode) {
      shippingCode.textContent =
        session?.shipping_selection?.code ||
        session?.shipping_selection?.rate_id ||
        "—";
    }
  },

  renderShipping(session) {
    const mount = document.getElementById("detailShippingAddress");
    if (!mount) return;

    const address = session?.shipping_address;
    if (!address) {
      mount.innerHTML = "—";
      return;
    }

    mount.innerHTML = `
      <p>${address.first_name || ""} ${address.last_name || ""}</p>
      <p>${address.address1 || ""}</p>
      ${address.address2 ? `<p>${address.address2}</p>` : ""}
      <p>${address.city || ""}, ${address.state || ""} ${address.zip || ""}</p>
      <p>${address.country || "US"}</p>
    `;
  },

  renderBilling(session) {
    const mount = document.getElementById("detailBillingAddress");
    if (!mount) return;

    const address = session?.billing_address;
    if (!address) {
      mount.innerHTML = "—";
      return;
    }

    mount.innerHTML = `
      <p>${address.first_name || ""} ${address.last_name || ""}</p>
      <p>${address.address1 || ""}</p>
      ${address.address2 ? `<p>${address.address2}</p>` : ""}
      <p>${address.city || ""}, ${address.state || ""} ${address.zip || ""}</p>
      <p>${address.country || "US"}</p>
    `;
  },

  renderCartItems(session) {
    const mount = document.getElementById("detailCartItems");
    if (!mount) return;

    const items = Array.isArray(session?.cart_items) ? session.cart_items : [];

    if (!items.length) {
      mount.innerHTML = `<p class="dashboard-empty">—</p>`;
      return;
    }

    mount.innerHTML = items.map(function (item) {
      const lineTotal = Number(item.price || 0) * Number(item.quantity || 1);

      return `
        <div class="dashboard-item-row">
          <div class="dashboard-item-image">
            <img src="${item.image || ""}" alt="${item.name || "Product"}" />
          </div>

          <div class="dashboard-item-info">
            <h4>${item.name || "Product"}</h4>
            <p>${item.variant_label || ""}</p>
            <p>Qty: ${Number(item.quantity || 1)}</p>
          </div>

          <div class="dashboard-item-price">
            ${window.AXIOM_HELPERS.formatMoney(lineTotal)}
          </div>
        </div>
      `;
    }).join("");
  }
};
