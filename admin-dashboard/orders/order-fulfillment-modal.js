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

      fulfillRoot.querySelectorAll("[data-payment-method]").for
