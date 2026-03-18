window.AXIOM_ORDER_DETAIL = {
  currentOrder: null,

  init() {
    const backBtn = document.getElementById("orderDetailBackBtn");
    if (backBtn) {
      backBtn.addEventListener("click", () => {
        this.hide();
      });
    }
  },

  show() {
    const panel = document.getElementById("orderDetailPanel");
    const ordersListWrap = document.getElementById("ordersListWrap");
    const ordersListCard = ordersListWrap ? ordersListWrap.closest(".dashboard-card") : null;

    if (panel) panel.hidden = false;
    if (ordersListCard) ordersListCard.hidden = true;
  },

  hide() {
    const panel = document.getElementById("orderDetailPanel");
    const ordersListWrap = document.getElementById("ordersListWrap");
    const ordersListCard = ordersListWrap ? ordersListWrap.closest(".dashboard-card") : null;

    if (panel) panel.hidden = true;
    if (ordersListCard) ordersListCard.hidden = false;
  },

  setOrder(order) {
    this.currentOrder = order;
    this.renderOverview(order);
    this.renderShipping(order);
    this.renderBilling(order);
    this.renderCartItems(order);
    this.show();
  },

  clear() {
    this.currentOrder = null;

    const ids = [
      "orderDetailNumber",
      "orderDetailStatus",
      "orderDetailPaymentStatus",
      "orderDetailFulfillmentStatus",
      "orderDetailEmail",
      "orderDetailPhone",
      "orderDetailCreated",
      "orderDetailSubtotal",
      "orderDetailShipping",
      "orderDetailTax",
      "orderDetailTotal"
    ];

    ids.forEach(function (id) {
      const el = document.getElementById(id);
      if (el) el.textContent = "—";
    });

    const shippingMount = document.getElementById("orderDetailShippingAddress");
    if (shippingMount) {
      shippingMount.innerHTML = "—";
    }

    const billingMount = document.getElementById("orderDetailBillingAddress");
    if (billingMount) {
      billingMount.innerHTML = "—";
    }

    const itemsMount = document.getElementById("orderDetailItemsWrap");
    if (itemsMount) {
      itemsMount.innerHTML = `<div class="dashboard-empty">No items found.</div>`;
    }
  },

  renderOverview(order) {
    const map = {
      orderDetailNumber: order?.order_number ? `#${order.order_number}` : "—",
      orderDetailStatus: order?.order_status || "—",
      orderDetailPaymentStatus: order?.payment_status || "—",
      orderDetailFulfillmentStatus: order?.fulfillment_status || "—",
      orderDetailEmail: order?.customer_email || "—",
      orderDetailPhone: order?.customer_phone || "—",
      orderDetailCreated: order?.created_at ? new Date(order.created_at).toLocaleString() : "—",
      orderDetailSubtotal: window.AXIOM_HELPERS.formatMoney(order?.subtotal || 0),
      orderDetailShipping: window.AXIOM_HELPERS.formatMoney(order?.shipping_amount || 0),
      orderDetailTax: window.AXIOM_HELPERS.formatMoney(order?.tax_amount || 0),
      orderDetailTotal: window.AXIOM_HELPERS.formatMoney(order?.total_amount || 0)
    };

    Object.keys(map).forEach(function (id) {
      const el = document.getElementById(id);
      if (el) el.textContent = map[id];
    });
  },

  formatAddressBlock(address) {
    if (!address || typeof address !== "object") {
      return "—";
    }

    const firstName = address.first_name || address.firstName || "";
    const lastName = address.last_name || address.lastName || "";
    const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();

    const address1 = address.address1 || address.line1 || "";
    const address2 = address.address2 || address.line2 || "";
    const city = address.city || "";
    const state = address.state || address.province || "";
    const zip = address.zip || address.postal_code || address.postalCode || "";
    const country = address.country || "US";
    const phone = address.phone || "";

    return `
      <div class="dashboard-address-list">
        <p><strong>Name:</strong> ${fullName || "—"}</p>
        <p><strong>Address:</strong> ${address1 || "—"}</p>
        <p><strong>Address 2:</strong> ${address2 || "—"}</p>
        <p><strong>City:</strong> ${city || "—"}</p>
        <p><strong>State:</strong> ${state || "—"}</p>
        <p><strong>ZIP:</strong> ${zip || "—"}</p>
        <p><strong>Country:</strong> ${country || "—"}</p>
        <p><strong>Phone:</strong> ${phone || "—"}</p>
      </div>
    `;
  },

  renderShipping(order) {
    const mount = document.getElementById("orderDetailShippingAddress");
    if (!mount) return;

    mount.innerHTML = this.formatAddressBlock(order?.shipping_address);
  },

  renderBilling(order) {
    const mount = document.getElementById("orderDetailBillingAddress");
    if (!mount) return;

    mount.innerHTML = this.formatAddressBlock(order?.billing_address);
  },

  renderCartItems(order) {
    const mount = document.getElementById("orderDetailItemsWrap");
    if (!mount) return;

    const items = Array.isArray(order?.cart_items) ? order.cart_items : [];

    if (!items.length) {
      mount.innerHTML = `<div class="dashboard-empty">No items found.</div>`;
      return;
    }

    mount.innerHTML = items.map(function (item) {
      const name = item.product_name || item.name || "Product";
      const variant = item.variant_label || item.variantLabel || item.variant || "";
      const quantity = Number(item.quantity || item.qty || 1);

      const unitPrice =
        item.unit_price !== undefined && item.unit_price !== null
          ? Number(item.unit_price || 0)
          : Number(item.price || 0);

      const lineTotal =
        item.line_total !== undefined && item.line_total !== null
          ? Number(item.line_total || 0)
          : unitPrice * quantity;

      const image = item.image || "../images/products/placeholder.PNG";

      return `
        <div class="dashboard-item-row">
          <div class="dashboard-item-image">
            <img
              src="${image}"
              alt="${name}"
              onerror="this.onerror=null;this.src='../images/products/placeholder.PNG';"
            />
          </div>

          <div class="dashboard-item-info">
            <h4>${name}</h4>
            <p>${variant}</p>
            <p>Qty: ${quantity}</p>
          </div>

          <div class="dashboard-item-price">
            ${window.AXIOM_HELPERS.formatMoney(lineTotal)}
          </div>
        </div>
      `;
    }).join("");
  }
};

document.addEventListener("DOMContentLoaded", function () {
  if (window.AXIOM_ORDER_DETAIL) {
    window.AXIOM_ORDER_DETAIL.init();
    window.AXIOM_ORDER_DETAIL.hide();
  }
});
