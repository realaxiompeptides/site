window.AXIOM_ORDER_FULFILLMENT_MODAL = {
  currentOrder: null,
  currentMode: null,

  init() {
    const modal = document.getElementById("orderFulfillmentModal");
    const closeBtn = document.getElementById("orderFulfillmentCloseBtn");
    const cancelBtn = document.getElementById("cancelShipmentBtn");

    if (closeBtn && !closeBtn.dataset.bound) {
      closeBtn.dataset.bound = "true";
      closeBtn.addEventListener("click", () => this.close());
    }

    if (cancelBtn && !cancelBtn.dataset.bound) {
      cancelBtn.dataset.bound = "true";
      cancelBtn.addEventListener("click", () => this.close());
    }

    if (modal && !modal.dataset.bound) {
      modal.dataset.bound = "true";
      modal.addEventListener("click", (event) => {
        const closeTarget = event.target.closest("[data-modal-close='true']");
        if (closeTarget) {
          this.close();
        }
      });
    }

    document.querySelectorAll("[data-payment-method]").forEach((btn) => {
      if (btn.dataset.bound) return;
      btn.dataset.bound = "true";

      btn.addEventListener("click", async () => {
        const paymentMethod = btn.getAttribute("data-payment-method");
        await this.fulfillOrder(paymentMethod);
      });
    });

    const saveShipmentBtn = document.getElementById("saveShipmentBtn");
    if (saveShipmentBtn && !saveShipmentBtn.dataset.bound) {
      saveShipmentBtn.dataset.bound = "true";
      saveShipmentBtn.addEventListener("click", async () => {
        await this.markShipped();
      });
    }

    if (!window.__axiomFulfillmentEscapeBound) {
      window.__axiomFulfillmentEscapeBound = true;
      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          this.close();
        }
      });
    }
  },

  open(order) {
    this.currentOrder = order || null;
    this.currentMode = "fulfill";

    this.resetMessages();
    this.showStep("fulfillment");
    this.showModal();
  },

  openShipped(order) {
    this.currentOrder = order || null;
    this.currentMode = "shipped";

    this.resetMessages();
    this.resetShipmentFields();
    this.showStep("shipped");
    this.showModal();
  },

  showModal() {
    const modal = document.getElementById("orderFulfillmentModal");
    if (!modal) return;

    modal.hidden = false;
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("dashboard-modal-open");
  },

  close() {
    const modal = document.getElementById("orderFulfillmentModal");
    if (!modal) return;

    modal.hidden = true;
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("dashboard-modal-open");

    this.currentOrder = null;
    this.currentMode = null;
    this.resetMessages();
  },

  showStep(step) {
    const fulfillmentStep = document.getElementById("fulfillmentStep");
    const shippedStep = document.getElementById("shippedStep");

    if (fulfillmentStep) fulfillmentStep.hidden = step !== "fulfillment";
    if (shippedStep) shippedStep.hidden = step !== "shipped";
  },

  resetMessages() {
    const fulfillmentMessage = document.getElementById("fulfillmentStatusMessage");
    const shipmentMessage = document.getElementById("shipmentStatusMessage");

    if (fulfillmentMessage) {
      fulfillmentMessage.textContent = "";
      fulfillmentMessage.className = "dashboard-modal-status";
    }

    if (shipmentMessage) {
      shipmentMessage.textContent = "";
      shipmentMessage.className = "dashboard-modal-status";
    }
  },

  resetShipmentFields() {
    const trackingNumber = document.getElementById("shipmentTrackingNumber");
    const trackingUrl = document.getElementById("shipmentTrackingUrl");

    if (trackingNumber) trackingNumber.value = "";
    if (trackingUrl) trackingUrl.value = "";
  },

  setMessage(id, text, type) {
    const el = document.getElementById(id);
    if (!el) return;

    el.textContent = text || "";
    el.className = `dashboard-modal-status ${type || ""}`.trim();
  },

  async fulfillOrder(paymentMethod) {
    if (!this.currentOrder?.id) {
      this.setMessage("fulfillmentStatusMessage", "No order selected.", "error");
      return;
    }

    if (!window.axiomSupabase) {
      this.setMessage("fulfillmentStatusMessage", "Supabase client not found.", "error");
      return;
    }

    this.setMessage("fulfillmentStatusMessage", "Saving order update...", "loading");

    try {
      const updatePayload = {
        payment_method: paymentMethod,
        payment_status: "paid",
        fulfillment_status: "fulfilled",
        order_status: "fulfilled",
        fulfilled_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await window.axiomSupabase
        .from("orders")
        .update(updatePayload)
        .eq("id", this.currentOrder.id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      this.currentOrder = data || { ...this.currentOrder, ...updatePayload };

      this.setMessage("fulfillmentStatusMessage", "Order marked as fulfilled.", "success");

      if (window.AXIOM_ORDER_DETAIL && typeof window.AXIOM_ORDER_DETAIL.setOrder === "function") {
        window.AXIOM_ORDER_DETAIL.setOrder(this.currentOrder);
      }

      if (window.AXIOM_DASHBOARD_APP && typeof window.AXIOM_DASHBOARD_APP.refreshOrders === "function") {
        await window.AXIOM_DASHBOARD_APP.refreshOrders();
      }

      setTimeout(() => {
        this.close();
      }, 700);
    } catch (error) {
      console.error("Failed to fulfill order:", error);
      this.setMessage(
        "fulfillmentStatusMessage",
        "Failed to update order. Check your orders table columns and Supabase policies.",
        "error"
      );
    }
  },

  async markShipped() {
    if (!this.currentOrder?.id) {
      this.setMessage("shipmentStatusMessage", "No order selected.", "error");
      return;
    }

    if (!window.axiomSupabase) {
      this.setMessage("shipmentStatusMessage", "Supabase client not found.", "error");
      return;
    }

    const trackingNumber = document.getElementById("shipmentTrackingNumber")?.value.trim() || "";
    const trackingUrl = document.getElementById("shipmentTrackingUrl")?.value.trim() || "";

    this.setMessage("shipmentStatusMessage", "Saving shipment...", "loading");

    try {
      const updatePayload = {
        fulfillment_status: "shipped",
        order_status: "shipped",
        tracking_number: trackingNumber || null,
        tracking_url: trackingUrl || null,
        shipped_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await window.axiomSupabase
        .from("orders")
        .update(updatePayload)
        .eq("id", this.currentOrder.id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      this.currentOrder = data || { ...this.currentOrder, ...updatePayload };

      this.setMessage("shipmentStatusMessage", "Shipment saved successfully.", "success");

      if (window.AXIOM_ORDER_DETAIL && typeof window.AXIOM_ORDER_DETAIL.setOrder === "function") {
        window.AXIOM_ORDER_DETAIL.setOrder(this.currentOrder);
      }

      if (window.AXIOM_DASHBOARD_APP && typeof window.AXIOM_DASHBOARD_APP.refreshOrders === "function") {
        await window.AXIOM_DASHBOARD_APP.refreshOrders();
      }

      setTimeout(() => {
        this.close();
      }, 700);
    } catch (error) {
      console.error("Failed to mark order shipped:", error);
      this.setMessage(
        "shipmentStatusMessage",
        "Failed to update order. Check your orders table columns and Supabase policies.",
        "error"
      );
    }
  }
};

document.addEventListener("DOMContentLoaded", function () {
  if (
    window.AXIOM_ORDER_FULFILLMENT_MODAL &&
    typeof window.AXIOM_ORDER_FULFILLMENT_MODAL.init === "function"
  ) {
    window.AXIOM_ORDER_FULFILLMENT_MODAL.init();
  }
});
