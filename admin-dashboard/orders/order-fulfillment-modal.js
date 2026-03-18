window.AXIOM_ORDER_FULFILLMENT_MODAL = {
  currentOrder: null,
  currentMode: null,

  init() {
    const overlay = document.getElementById("orderFulfillmentModalOverlay");
    const closeBtn = document.getElementById("orderFulfillmentModalClose");
    const cancelBtn = document.getElementById("cancelShipmentBtn");
    const buyShippingLabelBtn = document.getElementById("buyShippingLabelBtn");
    const saveShipmentBtn = document.getElementById("saveShipmentBtn");
    const closeShipmentSavedBtn = document.getElementById("closeShipmentSavedBtn");
    const copyTrackingNumberBtn = document.getElementById("copyTrackingNumberBtn");
    const copyTrackingUrlBtn = document.getElementById("copyTrackingUrlBtn");

    if (overlay) {
      overlay.hidden = true;
    }

    if (closeBtn && !closeBtn.dataset.bound) {
      closeBtn.dataset.bound = "true";
      closeBtn.addEventListener("click", () => this.close());
    }

    if (cancelBtn && !cancelBtn.dataset.bound) {
      cancelBtn.dataset.bound = "true";
      cancelBtn.addEventListener("click", () => this.close());
    }

    if (closeShipmentSavedBtn && !closeShipmentSavedBtn.dataset.bound) {
      closeShipmentSavedBtn.dataset.bound = "true";
      closeShipmentSavedBtn.addEventListener("click", () => this.close());
    }

    if (buyShippingLabelBtn && !buyShippingLabelBtn.dataset.bound) {
      buyShippingLabelBtn.dataset.bound = "true";
      buyShippingLabelBtn.addEventListener("click", () => {
        const carrierInput = document.getElementById("shipmentCarrierInput");
        const serviceInput = document.getElementById("shipmentServiceInput");

        if (carrierInput && !carrierInput.value.trim()) {
          carrierInput.value = "USPS";
        }

        if (serviceInput && !serviceInput.value.trim()) {
          serviceInput.value = "Ground Advantage";
        }

        this.setMessage(
          "orderFulfillmentModalSuccess",
          "Shipping label buying is not connected yet. Enter the shipment details and save for now.",
          "success"
        );
      });
    }

    if (saveShipmentBtn && !saveShipmentBtn.dataset.bound) {
      saveShipmentBtn.dataset.bound = "true";
      saveShipmentBtn.addEventListener("click", async () => {
        await this.markShipped();
      });
    }

    if (copyTrackingNumberBtn && !copyTrackingNumberBtn.dataset.bound) {
      copyTrackingNumberBtn.dataset.bound = "true";
      copyTrackingNumberBtn.addEventListener("click", async () => {
        const value =
          document.getElementById("savedShipmentTrackingNumber")?.textContent?.trim() || "";
        await this.copyText(value, "Tracking number copied.");
      });
    }

    if (copyTrackingUrlBtn && !copyTrackingUrlBtn.dataset.bound) {
      copyTrackingUrlBtn.dataset.bound = "true";
      copyTrackingUrlBtn.addEventListener("click", async () => {
        const value =
          document.getElementById("savedShipmentTrackingUrl")?.getAttribute("href") || "";
        await this.copyText(value === "#" ? "" : value, "Tracking URL copied.");
      });
    }

    if (overlay && !overlay.dataset.bound) {
      overlay.dataset.bound = "true";
      overlay.addEventListener("click", (event) => {
        if (event.target === overlay) {
          this.close();
        }
      });
    }

    document.querySelectorAll("[data-payment-method]").forEach((btn) => {
      if (btn.dataset.bound) return;
      btn.dataset.bound = "true";

      btn.addEventListener("click", async () => {
        const paymentMethod = btn.getAttribute("data-payment-method") || "";
        await this.fulfillOrder(paymentMethod);
      });
    });

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

    const title = document.getElementById("orderFulfillmentModalTitle");
    const kicker = document.getElementById("orderFulfillmentModalKicker");

    if (title) title.textContent = "Fulfill Order";
    if (kicker) kicker.textContent = "ORDER ACTION";

    this.resetMessages();
    this.resetShipmentFields();
    this.showStep("fulfillment");
    this.showModal();
  },

  openShipped(order) {
    this.currentOrder = order || null;
    this.currentMode = "shipped";

    const title = document.getElementById("orderFulfillmentModalTitle");
    const kicker = document.getElementById("orderFulfillmentModalKicker");

    if (title) title.textContent = "Mark Order Shipped";
    if (kicker) kicker.textContent = "ORDER ACTION";

    this.resetMessages();
    this.resetShipmentFields();
    this.showStep("shipment");
    this.showModal();
  },

  showModal() {
    const overlay = document.getElementById("orderFulfillmentModalOverlay");
    if (!overlay) return;

    overlay.hidden = false;
    document.body.classList.add("dashboard-modal-open");
  },

  close() {
    const overlay = document.getElementById("orderFulfillmentModalOverlay");
    if (overlay) {
      overlay.hidden = true;
    }

    document.body.classList.remove("dashboard-modal-open");
    this.currentOrder = null;
    this.currentMode = null;
    this.resetMessages();
    this.resetShipmentFields();
    this.showStep("fulfillment");
  },

  showStep(step) {
    const fulfillmentPaymentStep = document.getElementById("fulfillmentPaymentStep");
    const shipmentFieldsStep = document.getElementById("shipmentFieldsStep");
    const shipmentSavedStep = document.getElementById("shipmentSavedStep");

    if (fulfillmentPaymentStep) fulfillmentPaymentStep.hidden = step !== "fulfillment";
    if (shipmentFieldsStep) shipmentFieldsStep.hidden = step !== "shipment";
    if (shipmentSavedStep) shipmentSavedStep.hidden = step !== "saved";
  },

  resetMessages() {
    const errorEl = document.getElementById("orderFulfillmentModalError");
    const successEl = document.getElementById("orderFulfillmentModalSuccess");

    if (errorEl) {
      errorEl.hidden = true;
      errorEl.textContent = "";
      errorEl.className = "order-modal-error";
    }

    if (successEl) {
      successEl.hidden = true;
      successEl.textContent = "";
      successEl.className = "order-modal-success";
    }
  },

  resetShipmentFields() {
    const carrier = document.getElementById("shipmentCarrierInput");
    const service = document.getElementById("shipmentServiceInput");
    const trackingNumber = document.getElementById("shipmentTrackingNumberInput");
    const trackingUrl = document.getElementById("shipmentTrackingUrlInput");

    if (carrier) carrier.value = "";
    if (service) service.value = "";
    if (trackingNumber) trackingNumber.value = "";
    if (trackingUrl) trackingUrl.value = "";

    const savedCarrier = document.getElementById("savedShipmentCarrier");
    const savedService = document.getElementById("savedShipmentService");
    const savedTrackingNumber = document.getElementById("savedShipmentTrackingNumber");
    const savedTrackingUrl = document.getElementById("savedShipmentTrackingUrl");

    if (savedCarrier) savedCarrier.textContent = "—";
    if (savedService) savedService.textContent = "—";
    if (savedTrackingNumber) savedTrackingNumber.textContent = "—";

    if (savedTrackingUrl) {
      savedTrackingUrl.textContent = "—";
      savedTrackingUrl.setAttribute("href", "#");
    }
  },

  setMessage(id, text, type) {
    const errorEl = document.getElementById("orderFulfillmentModalError");
    const successEl = document.getElementById("orderFulfillmentModalSuccess");

    if (errorEl) {
      errorEl.hidden = true;
      errorEl.textContent = "";
    }

    if (successEl) {
      successEl.hidden = true;
      successEl.textContent = "";
    }

    const target = document.getElementById(id);
    if (!target) return;

    target.hidden = !text;
    target.textContent = text || "";

    if (type === "error") {
      target.className = "order-modal-error";
    } else {
      target.className = "order-modal-success";
    }
  },

  async copyText(value, successMessage) {
    if (!value) {
      this.setMessage("orderFulfillmentModalError", "Nothing to copy.", "error");
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      this.setMessage("orderFulfillmentModalSuccess", successMessage, "success");
    } catch (error) {
      console.error("Copy failed:", error);
      this.setMessage("orderFulfillmentModalError", "Failed to copy.", "error");
    }
  },

  async updateOrderWithFallback(payloadVariants) {
    if (!this.currentOrder?.id) {
      throw new Error("No order selected.");
    }

    if (!window.axiomSupabase) {
      throw new Error("Supabase client not found.");
    }

    let lastError = null;

    for (const payload of payloadVariants) {
      try {
        const { data, error } = await window.axiomSupabase
          .from("orders")
          .update(payload)
          .eq("id", this.currentOrder.id)
          .select("*")
          .single();

        if (error) {
          lastError = error;
          continue;
        }

        return data || { ...this.currentOrder, ...payload };
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error("Order update failed.");
  },

  async refreshOrderViews(updatedOrder) {
    this.currentOrder = updatedOrder || this.currentOrder;

    if (
      window.AXIOM_ORDER_DETAIL &&
      typeof window.AXIOM_ORDER_DETAIL.setOrder === "function"
    ) {
      window.AXIOM_ORDER_DETAIL.setOrder(this.currentOrder);
    }

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
  },

  fillSavedShipment(shipment) {
    const savedCarrier = document.getElementById("savedShipmentCarrier");
    const savedService = document.getElementById("savedShipmentService");
    const savedTrackingNumber = document.getElementById("savedShipmentTrackingNumber");
    const savedTrackingUrl = document.getElementById("savedShipmentTrackingUrl");

    if (savedCarrier) {
      savedCarrier.textContent = shipment.carrier || "—";
    }

    if (savedService) {
      savedService.textContent = shipment.service || "—";
    }

    if (savedTrackingNumber) {
      savedTrackingNumber.textContent = shipment.trackingNumber || "—";
    }

    if (savedTrackingUrl) {
      if (shipment.trackingUrl) {
        savedTrackingUrl.textContent = shipment.trackingUrl;
        savedTrackingUrl.setAttribute("href", shipment.trackingUrl);
        savedTrackingUrl.setAttribute("target", "_blank");
        savedTrackingUrl.setAttribute("rel", "noopener noreferrer");
      } else {
        savedTrackingUrl.textContent = "—";
        savedTrackingUrl.setAttribute("href", "#");
        savedTrackingUrl.removeAttribute("target");
        savedTrackingUrl.removeAttribute("rel");
      }
    }
  },

  async fulfillOrder(paymentMethod) {
    if (!this.currentOrder?.id) {
      this.setMessage("orderFulfillmentModalError", "No order selected.", "error");
      return;
    }

    this.setMessage("orderFulfillmentModalSuccess", "Saving order update...", "success");

    try {
      const now = new Date().toISOString();

      const payloadVariants = [
        {
          payment_method: paymentMethod,
          payment_status: "paid",
          fulfillment_status: "fulfilled",
          order_status: "fulfilled",
          updated_at: now
        },
        {
          payment_method: paymentMethod,
          fulfillment_status: "fulfilled",
          order_status: "fulfilled",
          updated_at: now
        },
        {
          payment_method: paymentMethod,
          fulfillment_status: "fulfilled"
        },
        {
          payment_method: paymentMethod,
          order_status: "fulfilled"
        }
      ];

      const updatedOrder = await this.updateOrderWithFallback(payloadVariants);
      await this.refreshOrderViews(updatedOrder);

      this.setMessage("orderFulfillmentModalSuccess", "Order fulfilled successfully.", "success");

      setTimeout(() => {
        this.close();
      }, 700);
    } catch (error) {
      console.error("Failed to fulfill order:", error);
      this.setMessage(
        "orderFulfillmentModalError",
        "Failed to update order. Check your orders table columns and Supabase policies.",
        "error"
      );
    }
  },

  async markShipped() {
    if (!this.currentOrder?.id) {
      this.setMessage("orderFulfillmentModalError", "No order selected.", "error");
      return;
    }

    const carrier = document.getElementById("shipmentCarrierInput")?.value.trim() || "";
    const service = document.getElementById("shipmentServiceInput")?.value.trim() || "";
    const trackingNumber =
      document.getElementById("shipmentTrackingNumberInput")?.value.trim() || "";
    const trackingUrl =
      document.getElementById("shipmentTrackingUrlInput")?.value.trim() || "";

    this.setMessage("orderFulfillmentModalSuccess", "Saving shipment...", "success");

    try {
      const now = new Date().toISOString();

      const payloadVariants = [
        {
          fulfillment_status: "shipped",
          order_status: "shipped",
          tracking_number: trackingNumber || null,
          tracking_url: trackingUrl || null,
          shipping_carrier: carrier || null,
          shipping_service: service || null,
          updated_at: now
        },
        {
          fulfillment_status: "shipped",
          order_status: "shipped",
          tracking_number: trackingNumber || null,
          tracking_url: trackingUrl || null,
          updated_at: now
        },
        {
          fulfillment_status: "shipped",
          tracking_number: trackingNumber || null,
          tracking_url: trackingUrl || null,
          updated_at: now
        },
        {
          fulfillment_status: "shipped",
          order_status: "shipped",
          updated_at: now
        },
        {
          fulfillment_status: "shipped"
        }
      ];

      const updatedOrder = await this.updateOrderWithFallback(payloadVariants);

      const mergedOrder = {
        ...updatedOrder,
        shipping_carrier: carrier || updatedOrder?.shipping_carrier || "",
        shipping_service: service || updatedOrder?.shipping_service || "",
        tracking_number: trackingNumber || updatedOrder?.tracking_number || "",
        tracking_url: trackingUrl || updatedOrder?.tracking_url || ""
      };

      await this.refreshOrderViews(mergedOrder);

      this.fillSavedShipment({
        carrier: carrier || mergedOrder.shipping_carrier || "",
        service: service || mergedOrder.shipping_service || "",
        trackingNumber: trackingNumber || mergedOrder.tracking_number || "",
        trackingUrl: trackingUrl || mergedOrder.tracking_url || ""
      });

      this.showStep("saved");
      this.setMessage("orderFulfillmentModalSuccess", "Shipment saved successfully.", "success");
    } catch (error) {
      console.error("Failed to mark order shipped:", error);
      this.setMessage(
        "orderFulfillmentModalError",
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
