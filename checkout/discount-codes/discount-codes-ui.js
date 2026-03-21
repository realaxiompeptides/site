window.AXIOM_DISCOUNT_CODES_UI = (function () {
  const state = {
    code: "",
    discountAmount: 0,
    discountType: "",
    discountValue: 0,
    description: "",
    isApplied: false
  };

  function toNumber(value, fallback = 0) {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
  }

  function normalizeCode(value) {
    return String(value || "").trim().toUpperCase();
  }

  function getInput() {
    return document.getElementById("couponCodeInput");
  }

  function getButton() {
    return document.getElementById("applyCouponBtn");
  }

  function getFeedback() {
    return document.getElementById("couponFeedback");
  }

  function getAppliedCodeEl() {
    return document.getElementById("appliedCouponCode");
  }

  function getTopAppliedCodeEl() {
    return document.getElementById("topAppliedCouponCode");
  }

  function getDiscountRow() {
    return document.getElementById("discountAmountRow");
  }

  function getTopDiscountRow() {
    return document.getElementById("topDiscountAmountRow");
  }

  function getDiscountAmountEl() {
    return document.getElementById("discountAmount");
  }

  function getTopDiscountAmountEl() {
    return document.getElementById("topDiscountAmount");
  }

  function formatMoney(value) {
    return `$${toNumber(value, 0).toFixed(2)}`;
  }

  function setFeedback(message, type) {
    const feedback = getFeedback();
    if (!feedback) return;

    feedback.textContent = message || "";
    feedback.classList.remove("success", "error");

    if (type) {
      feedback.classList.add(type);
    }
  }

  function clearAppliedDiscount() {
    state.code = "";
    state.discountAmount = 0;
    state.discountType = "";
    state.discountValue = 0;
    state.description = "";
    state.isApplied = false;

    const appliedCodeEl = getAppliedCodeEl();
    const topAppliedCodeEl = getTopAppliedCodeEl();
    const discountRow = getDiscountRow();
    const topDiscountRow = getTopDiscountRow();
    const discountAmountEl = getDiscountAmountEl();
    const topDiscountAmountEl = getTopDiscountAmountEl();

    if (appliedCodeEl) appliedCodeEl.textContent = "";
    if (topAppliedCodeEl) topAppliedCodeEl.textContent = "";
    if (discountAmountEl) discountAmountEl.textContent = "-$0.00";
    if (topDiscountAmountEl) topDiscountAmountEl.textContent = "-$0.00";
    if (discountRow) discountRow.hidden = true;
    if (topDiscountRow) topDiscountRow.hidden = true;

    window.dispatchEvent(
      new CustomEvent("axiom-discount-updated", {
        detail: getAppliedDiscount()
      })
    );
  }

  function applyDiscountToUi() {
    const appliedCodeEl = getAppliedCodeEl();
    const topAppliedCodeEl = getTopAppliedCodeEl();
    const discountRow = getDiscountRow();
    const topDiscountRow = getTopDiscountRow();
    const discountAmountEl = getDiscountAmountEl();
    const topDiscountAmountEl = getTopDiscountAmountEl();

    const label = state.code ? `(${state.code})` : "";

    if (appliedCodeEl) appliedCodeEl.textContent = label;
    if (topAppliedCodeEl) topAppliedCodeEl.textContent = label;
    if (discountAmountEl) discountAmountEl.textContent = `-${formatMoney(state.discountAmount)}`;
    if (topDiscountAmountEl) topDiscountAmountEl.textContent = `-${formatMoney(state.discountAmount)}`;
    if (discountRow) discountRow.hidden = !state.isApplied;
    if (topDiscountRow) topDiscountRow.hidden = !state.isApplied;
  }

  function getAppliedDiscount() {
    return {
      code: state.code,
      discountAmount: state.discountAmount,
      discountType: state.discountType,
      discountValue: state.discountValue,
      description: state.description,
      isApplied: state.isApplied
    };
  }

  async function applyCoupon(subtotal) {
    const input = getInput();
    const button = getButton();

    if (!input) return;

    const code = normalizeCode(input.value);

    if (!code) {
      clearAppliedDiscount();
      setFeedback("Please enter a discount code.", "error");
      return;
    }

    if (!window.AXIOM_DISCOUNT_CODES_API) {
      setFeedback("Discount code system is not available.", "error");
      return;
    }

    const originalButtonText = button ? button.textContent : "";

    try {
      if (button) {
        button.disabled = true;
        button.textContent = "Applying...";
      }

      const result = await window.AXIOM_DISCOUNT_CODES_API.validateCode(code, subtotal);

      if (!result || result.is_valid !== true) {
        clearAppliedDiscount();
        setFeedback(result?.message || "That code is invalid.", "error");
        return;
      }

      state.code = normalizeCode(result.code || code);
      state.discountAmount = toNumber(result.discount_amount, 0);
      state.discountType = String(result.discount_type || "");
      state.discountValue = toNumber(result.discount_value, 0);
      state.description = String(result.description || "");
      state.isApplied = true;

      applyDiscountToUi();
      setFeedback(result.message || "Discount code applied.", "success");

      window.dispatchEvent(
        new CustomEvent("axiom-discount-updated", {
          detail: getAppliedDiscount()
        })
      );
    } catch (error) {
      console.error(error);
      clearAppliedDiscount();
      setFeedback(error.message || "Could not apply discount code.", "error");
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = originalButtonText || "Apply Coupon";
      }
    }
  }

  function bindEvents() {
    const input = getInput();
    const button = getButton();

    if (button && !button.dataset.bound) {
      button.dataset.bound = "true";
      button.addEventListener("click", async function () {
        let subtotal = 0;

        if (
          window.AXIOM_CHECKOUT_DISCOUNT_HOOKS &&
          typeof window.AXIOM_CHECKOUT_DISCOUNT_HOOKS.getSubtotal === "function"
        ) {
          subtotal = toNumber(window.AXIOM_CHECKOUT_DISCOUNT_HOOKS.getSubtotal(), 0);
        } else {
          const subtotalEl = document.getElementById("subtotal");
          subtotal = subtotalEl
            ? toNumber(String(subtotalEl.textContent || "").replace(/[^0-9.-]/g, ""), 0)
            : 0;
        }

        await applyCoupon(subtotal);
      });
    }

    if (input && !input.dataset.bound) {
      input.dataset.bound = "true";

      input.addEventListener("keydown", async function (event) {
        if (event.key === "Enter") {
          event.preventDefault();

          const buttonEl = getButton();
          if (buttonEl) {
            buttonEl.click();
          }
        }
      });

      input.addEventListener("input", function () {
        if (!input.value.trim()) {
          clearAppliedDiscount();
          setFeedback("", "");
        }
      });
    }
  }

  function init() {
    bindEvents();
    clearAppliedDiscount();
  }

  return {
    init,
    getAppliedDiscount,
    clearAppliedDiscount
  };
})();
