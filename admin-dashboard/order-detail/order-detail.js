window.AXIOM_ORDER_DETAIL = {
  currentOrder: null,

  init() {
    const backBtn = document.getElementById("orderDetailBackBtn");
    if (backBtn && !backBtn.dataset.bound) {
      backBtn.dataset.bound = "true";
      backBtn.addEventListener("click", () => {
        if (
          window.AXIOM_DASHBOARD_APP &&
          typeof window.AXIOM_DASHBOARD_APP.showOrdersListOnly === "function"
        ) {
          window.AXIOM_DASHBOARD_APP.showOrdersListOnly();
        } else {
          this.hide();
        }
      });
    }

    const fulfillBtn = document.getElementById("fulfillOrderBtn");
    if (fulfillBtn && !fulfillBtn.dataset.bound) {
      fulfillBtn.dataset.bound = "true";
      fulfillBtn.addEventListener("click", () => {
        if (!this.currentOrder) {
          alert("No order selected.");
          return;
        }

        const orderStatus = String(this.currentOrder?.order_status || "").toLowerCase();
        const fulfillmentStatus = String(this.currentOrder?.fulfillment_status || "").toLowerCase();

        const isCancelled = orderStatus === "cancelled";
        const isFulfilled =
          !isCancelled &&
          (
            orderStatus === "fulfilled" ||
            orderStatus === "shipped" ||
            fulfillmentStatus === "fulfilled" ||
            fulfillmentStatus === "shipped"
          );

        if (isFulfilled) {
          return;
        }

        if (
          window.AXIOM_ORDER_FULFILLMENT_MODAL &&
          typeof window.AXIOM_ORDER_FULFILLMENT_MODAL.open === "function"
        ) {
          window.AXIOM_ORDER_FULFILLMENT_MODAL.open(this.currentOrder);
        }
      });
    }

    const shippedBtn = document.getElementById("markShippedBtn");
    if (shippedBtn && !shippedBtn.dataset.bound) {
      shippedBtn.dataset.bound = "true";
      shippedBtn.addEventListener("click", () => {
        if (!this.currentOrder) {
          alert("No order selected.");
          return;
        }

        const orderStatus = String(this.currentOrder?.order_status || "").toLowerCase();
        const fulfillmentStatus = String(this.currentOrder?.fulfillment_status || "").toLowerCase();

        const isCancelled = orderStatus === "cancelled";
        const isShipped =
          !isCancelled &&
          (
            orderStatus === "shipped" ||
            fulfillmentStatus === "shipped"
          );

        if (isShipped) {
          return;
        }

        if (
          window.AXIOM_ORDER_FULFILLMENT_MODAL &&
          typeof window.AXIOM_ORDER_FULFILLMENT_MODAL.openShipped === "function"
        ) {
          window.AXIOM_ORDER_FULFILLMENT_MODAL.openShipped(this.currentOrder);
        }
      });
    }

    const cancelBtn = document.getElementById("cancelOrderBtn");
    if (cancelBtn && !cancelBtn.dataset.bound) {
      cancelBtn.dataset.bound = "true";
      cancelBtn.addEventListener("click", async () => {
        if (!this.currentOrder) {
          alert("No order selected.");
          return;
        }

        const confirmed = window.confirm(
          "Cancel this order and move it back to unfulfilled?"
        );
        if (!confirmed) return;

        const updatedOrder = {
          ...this.currentOrder,
          order_status: "cancelled",
          payment_status: "cancelled",
          fulfillment_status: "unfulfilled",
          shipping_carrier: "",
          shipping_service: "",
          tracking_number: "",
          tracking_url: ""
        };

        const saved = await this.persistOrderUpdate(updatedOrder);

        if (!saved) {
          alert("Could not cancel this order.");
          return;
        }

        const latest = await this.fetchLatestOrder(saved.id);
        const finalOrder = latest || saved;

        this.currentOrder = finalOrder;
        this.setOrder(finalOrder);
        await this.refreshOrdersUi(finalOrder);

        alert("Order cancelled.");
      });
    }

    const copyBtn = document.getElementById("copyTrackingBtn");
    if (copyBtn && !copyBtn.dataset.bound) {
      copyBtn.dataset.bound = "true";
      copyBtn.addEventListener("click", async () => {
        const trackingNumber = this.currentOrder?.tracking_number || "";
        if (!trackingNumber) {
          alert("No tracking number saved yet.");
          return;
        }

        try {
          await navigator.clipboard.writeText(trackingNumber);
          alert("Tracking number copied.");
        } catch {
          alert("Could not copy tracking number.");
        }
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
    this.currentOrder = order || null;

    if (!order) {
      this.clear();
      this.hide();
      return;
    }

    this.renderOverview(order);
    this.updateActionButtons(order);
    this.renderShipment(order);
    this.renderShipping(order);
    this.renderBilling(order);
    this.renderCartItems(order);
    this.show();
  },

  async fetchLatestOrder(orderId) {
    try {
      if (!orderId || !window.axiomSupabase) return null;

      const { data, error } = await window.axiomSupabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .single();

      if (error) {
        console.error("fetchLatestOrder error:", error);
        return null;
      }

      return data || null;
    } catch (error) {
      console.error("fetchLatestOrder failed:", error);
      return null;
    }
  },

  async persistOrderUpdate(updatedOrder) {
    try {
      if (!updatedOrder?.id) {
        return updatedOrder;
      }

      if (!window.axiomSupabase) {
        console.error("Supabase client missing on order detail.");
        return null;
      }

      const paymentMethod =
        updatedOrder.payment_method ||
        updatedOrder.payment_type ||
        updatedOrder.payment_provider ||
        updatedOrder.paid_with ||
        null;

      const updatePayload = {
        order_status: updatedOrder.order_status || null,
        payment_status: updatedOrder.payment_status || null,
        payment_method: paymentMethod,
        fulfillment_status: updatedOrder.fulfillment_status || null,
        shipping_carrier: updatedOrder.shipping_carrier || null,
        shipping_service: updatedOrder.shipping_service || null,
        tracking_number: updatedOrder.tracking_number || null,
        tracking_url: updatedOrder.tracking_url || null,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await window.axiomSupabase
        .from("orders")
        .update(updatePayload)
        .eq("id", updatedOrder.id)
        .select("*")
        .single();

      if (error) {
        console.error("Supabase order update failed:", error);
        return null;
      }

      const checkoutSessionId =
        updatedOrder.checkout_session_id ||
        data?.checkout_session_id ||
        null;

      if (checkoutSessionId) {
        const sessionPayload = {
          payment_status: updatedOrder.payment_status || null,
          payment_method: paymentMethod,
          fulfillment_status: updatedOrder.fulfillment_status || null,
          tracking_number: updatedOrder.tracking_number || null,
          tracking_url: updatedOrder.tracking_url || null,
          updated_at: new Date().toISOString(),
          last_activity_at: new Date().toISOString()
        };

        const { error: sessionError } = await window.axiomSupabase
          .from("checkout_sessions")
          .update(sessionPayload)
          .eq("id", checkoutSessionId);

        if (sessionError) {
          console.error("Checkout session update failed:", sessionError);
        }
      }

      return { ...updatedOrder, ...(data || {}) };
    } catch (error) {
      console.error("persistOrderUpdate error:", error);
      return null;
    }
  },

  async refreshOrdersUi(updatedOrder) {
    try {
      if (
        window.AXIOM_DASHBOARD_APP &&
        typeof window.AXIOM_DASHBOARD_APP.refreshOrders === "function"
      ) {
        await window.AXIOM_DASHBOARD_APP.refreshOrders();
      }

      if (
        window.AXIOM_DASHBOARD_APP &&
        typeof window.AXIOM_DASHBOARD_APP.refreshHomeDashboard === "function"
      ) {
        await window.AXIOM_DASHBOARD_APP.refreshHomeDashboard();
      }

      if (
        window.AXIOM_DASHBOARD_APP &&
        Array.isArray(window.AXIOM_DASHBOARD_APP.orders) &&
        updatedOrder?.id
      ) {
        window.AXIOM_DASHBOARD_APP.orders = window.AXIOM_DASHBOARD_APP.orders.map(function (order) {
          return order && order.id === updatedOrder.id ? updatedOrder : order;
        });
      }

      if (
        updatedOrder?.id &&
        selectedOrderId === updatedOrder.id
      ) {
        const latest = await this.fetchLatestOrder(updatedOrder.id);
        if (latest) {
          this.currentOrder = latest;
          this.setOrder(latest);
        } else {
          this.currentOrder = updatedOrder;
          this.setOrder(updatedOrder);
        }
      }
    } catch (error) {
      console.error("refreshOrdersUi error:", error);
    }
  },

  clear() {
    this.currentOrder = null;

    const ids = [
      "orderDetailNumber",
      "orderDetailStatus",
      "orderDetailPaymentStatus",
      "orderDetailPaymentMethod",
      "orderDetailFulfillmentStatus",
      "orderDetailEmail",
      "orderDetailPhone",
      "orderDetailCreated",
      "orderDetailSubtotal",
      "orderDetailShipping",
      "orderDetailTax",
      "orderDetailTotal",
      "orderDetailShippingCarrier",
      "orderDetailShippingService",
      "orderDetailTrackingNumber",
      "orderDetailTrackingUrl"
    ];

    ids.forEach(function (id) {
      const el = document.getElementById(id);
      if (el) el.textContent = "—";
    });

    const shippingMount = document.getElementById("orderDetailShippingAddress");
    if (shippingMount) shippingMount.innerHTML = "—";

    const billingMount = document.getElementById("orderDetailBillingAddress");
    if (billingMount) billingMount.innerHTML = "—";

    const itemsMount = document.getElementById("orderDetailItemsWrap");
    if (itemsMount) {
      itemsMount.innerHTML = `<div class="dashboard-empty">No items found.</div>`;
    }

    this.updateActionButtons(null);
  },

  renderOverview(order) {
    const paymentMethod =
      order?.payment_method ||
      order?.payment_type ||
      order?.payment_provider ||
      order?.paid_with ||
      "—";

    const map = {
      orderDetailNumber: order?.order_number ? `#${order.order_number}` : "—",
      orderDetailStatus: order?.order_status || "—",
      orderDetailPaymentStatus: order?.payment_status || "—",
      orderDetailPaymentMethod: paymentMethod,
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

  updateActionButtons(order) {
    const fulfillBtn = document.getElementById("fulfillOrderBtn");
    const shippedBtn = document.getElementById("markShippedBtn");
    const cancelBtn = document.getElementById("cancelOrderBtn");

    if (!order) {
      if (fulfillBtn) {
        fulfillBtn.hidden = false;
        fulfillBtn.textContent = "Fulfill Order";
        fulfillBtn.disabled = false;
        fulfillBtn.classList.remove("dashboard-btn-disabled");
      }

      if (shippedBtn) {
        shippedBtn.hidden = false;
        shippedBtn.textContent = "Mark Shipped";
        shippedBtn.disabled = false;
        shippedBtn.classList.remove("dashboard-btn-disabled");
      }

      if (cancelBtn) {
        cancelBtn.hidden = true;
        cancelBtn.textContent = "Cancel Order";
        cancelBtn.disabled = false;
        cancelBtn.classList.remove("dashboard-btn-disabled");
      }

      return;
    }

    const orderStatus = String(order?.order_status || "").toLowerCase();
    const fulfillmentStatus = String(order?.fulfillment_status || "").toLowerCase();

    const isCancelled = orderStatus === "cancelled";
    const isFulfilled =
      !isCancelled &&
      (
        orderStatus === "fulfilled" ||
        orderStatus === "shipped" ||
        fulfillmentStatus === "fulfilled" ||
        fulfillmentStatus === "shipped"
      );

    const isShipped =
      !isCancelled &&
      (
        orderStatus === "shipped" ||
        fulfillmentStatus === "shipped"
      );

    if (fulfillBtn) {
      if (isFulfilled) {
        fulfillBtn.hidden = true;
        fulfillBtn.textContent = "Fulfilled";
        fulfillBtn.disabled = true;
        fulfillBtn.classList.add("dashboard-btn-disabled");
      } else {
        fulfillBtn.hidden = false;
        fulfillBtn.textContent = "Fulfill Order";
        fulfillBtn.disabled = false;
        fulfillBtn.classList.remove("dashboard-btn-disabled");
      }
    }

    if (shippedBtn) {
      if (isCancelled) {
        shippedBtn.hidden = true;
      } else {
        shippedBtn.hidden = false;
      }

      if (isShipped) {
        shippedBtn.textContent = "Order Shipped";
        shippedBtn.disabled = true;
        shippedBtn.classList.add("dashboard-btn-disabled");
      } else {
        shippedBtn.textContent = "Mark Shipped";
        shippedBtn.disabled = false;
        shippedBtn.classList.remove("dashboard-btn-disabled");
      }
    }

    if (cancelBtn) {
      if (isFulfilled || isShipped) {
        cancelBtn.hidden = false;
        cancelBtn.textContent = "Cancel Order";
        cancelBtn.disabled = false;
        cancelBtn.classList.remove("dashboard-btn-disabled");
      } else {
        cancelBtn.hidden = true;
        cancelBtn.textContent = "Cancel Order";
        cancelBtn.disabled = false;
        cancelBtn.classList.remove("dashboard-btn-disabled");
      }
    }
  },

  renderShipment(order) {
    const carrierEl = document.getElementById("orderDetailShippingCarrier");
    const serviceEl = document.getElementById("orderDetailShippingService");
    const trackingNumberEl = document.getElementById("orderDetailTrackingNumber");
    const trackingUrlEl = document.getElementById("orderDetailTrackingUrl");

    if (carrierEl) carrierEl.textContent = order?.shipping_carrier || "—";
    if (serviceEl) serviceEl.textContent = order?.shipping_service || "—";
    if (trackingNumberEl) trackingNumberEl.textContent = order?.tracking_number || "—";

    if (trackingUrlEl) {
      if (order?.tracking_url) {
        trackingUrlEl.innerHTML = `<a href="${order.tracking_url}" target="_blank" rel="noopener noreferrer">Open Tracking Link</a>`;
      } else {
        trackingUrlEl.textContent = "—";
      }
    }
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
