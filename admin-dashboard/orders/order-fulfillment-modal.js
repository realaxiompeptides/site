window.AXIOM_ORDER_FULFILLMENT_MODAL = (function () {
  let currentFulfillmentOrder = null;
  let currentShipmentOrder = null;

  function fulfillmentModal() {
    return document.getElementById("orderFulfillmentModal");
  }

  function shippedModal() {
    return document.getElementById("orderShippedModal");
  }

  function openFulfillment(order) {
    currentFulfillmentOrder = order || null;
    const modal = fulfillmentModal();
    if (!modal) return;
    modal.hidden = false;
    document.body.classList.add("axiom-modal-open");
  }

  function closeFulfillment() {
    currentFulfillmentOrder = null;
    const modal = fulfillmentModal();
    if (!modal) return;
    modal.hidden = true;
    document.body.classList.remove("axiom-modal-open");
  }

  function openShipped(order) {
    currentShipmentOrder = order || null;

    const trackingNumberInput = document.getElementById("shipmentTrackingNumber");
    const trackingUrlInput = document.getElementById("shipmentTrackingUrl");

    if (trackingNumberInput) {
      trackingNumberInput.value = order?.tracking_number || "";
    }

    if (trackingUrlInput) {
      trackingUrlInput.value = order?.tracking_url || "";
    }

    const modal = shippedModal();
    if (!modal) return;
    modal.hidden = false;
    document.body.classList.add("axiom-modal-open");
  }

  function closeShipped() {
    currentShipmentOrder = null;
    const modal = shippedModal();
    if (!modal) return;
    modal.hidden = true;
    document.body.classList.remove("axiom-modal-open");
  }

  function bindClose(selector, closeFn, root) {
    root.querySelectorAll(selector).forEach((el) => {
      if (el.dataset.bound === "true") return;
      el.dataset.bound = "true";
      el.addEventListener("click", closeFn);
    });
  }

  function init() {
    const fulfillRoot = fulfillmentModal();
    const shippedRoot = shippedModal();

    if (fulfillRoot) {
      bindClose("[data-close-order-fulfillment-modal]", closeFulfillment, fulfillRoot);

      fulfillRoot.querySelectorAll("[data-payment-method]").forEach((button) => {
        if (button.dataset.bound === "true") return;
        button.dataset.bound = "true";

        button.addEventListener("click", async function () {
          const paymentMethod = button.getAttribute("data-payment-method");
          if (!paymentMethod || !currentFulfillmentOrder) return;

          button.disabled = true;

          try {
            if (
              window.AXIOM_ORDER_ACTIONS &&
              typeof window.AXIOM_ORDER_ACTIONS.fulfillOrder === "function"
            ) {
              const result = await window.AXIOM_ORDER_ACTIONS.fulfillOrder(
                currentFulfillmentOrder,
                paymentMethod
              );

              if (result?.ok) {
                closeFulfillment();
                alert("Order marked as paid and fulfilled.");
              }
            }
          } finally {
            button.disabled = false;
          }
        });
      });
    }

    if (shippedRoot) {
      bindClose("[data-close-order-shipped-modal]", closeShipped, shippedRoot);

      const confirmBtn = document.getElementById("confirmMarkShippedBtn");
      if (confirmBtn && confirmBtn.dataset.bound !== "true") {
        confirmBtn.dataset.bound = "true";

        confirmBtn.addEventListener("click", async function () {
          if (!currentShipmentOrder) return;

          const trackingNumber =
            document.getElementById("shipmentTrackingNumber")?.value.trim() || "";

          const trackingUrl =
            document.getElementById("shipmentTrackingUrl")?.value.trim() || "";

          confirmBtn.disabled = true;

          try {
            if (
              window.AXIOM_ORDER_ACTIONS &&
              typeof window.AXIOM_ORDER_ACTIONS.markShipped === "function"
            ) {
              const result = await window.AXIOM_ORDER_ACTIONS.markShipped(
                currentShipmentOrder,
                trackingNumber,
                trackingUrl
              );

              if (result?.ok) {
                closeShipped();
                alert("Order marked as shipped.");
              }
            }
          } finally {
            confirmBtn.disabled = false;
          }
        });
      }
    }
  }

  return {
    init,
    open: openFulfillment,
    close: closeFulfillment,
    openShipped,
    closeShipped
  };
})();
