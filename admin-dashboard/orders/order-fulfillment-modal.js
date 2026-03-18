window.AXIOM_ORDER_FULFILLMENT_MODAL = (function () {
  let currentOrder = null;

  function getModal() {
    return document.getElementById("orderFulfillmentModal");
  }

  function open(order) {
    currentOrder = order || null;
    const modal = getModal();
    if (!modal) return;
    modal.hidden = false;
    document.body.classList.add("axiom-modal-open");
  }

  function close() {
    currentOrder = null;
    const modal = getModal();
    if (!modal) return;
    modal.hidden = true;
    document.body.classList.remove("axiom-modal-open");
  }

  function getCurrentOrder() {
    return currentOrder;
  }

  function init() {
    const modal = getModal();
    if (!modal) return;

    modal.querySelectorAll("[data-close-order-fulfillment-modal]").forEach((el) => {
      el.addEventListener("click", close);
    });

    modal.querySelectorAll("[data-payment-method]").forEach((button) => {
      button.addEventListener("click", async function () {
        const paymentMethod = button.getAttribute("data-payment-method");
        if (!paymentMethod || !currentOrder) return;

        if (
          window.AXIOM_ORDER_ACTIONS &&
          typeof window.AXIOM_ORDER_ACTIONS.fulfillOrder === "function"
        ) {
          await window.AXIOM_ORDER_ACTIONS.fulfillOrder(currentOrder, paymentMethod);
        }

        close();
      });
    });
  }

  return {
    init,
    open,
    close,
    getCurrentOrder
  };
})();
