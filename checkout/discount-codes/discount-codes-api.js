window.AXIOM_DISCOUNT_CODES_API = (function () {
  function getSupabase() {
    if (!window.axiomSupabase) {
      throw new Error("Supabase client is not available.");
    }
    return window.axiomSupabase;
  }

  function normalizeCode(value) {
    return String(value || "").trim().toUpperCase();
  }

  function toNumber(value, fallback = 0) {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
  }

  async function validateCode(code, subtotal) {
    const supabase = getSupabase();

    const cleanCode = normalizeCode(code);
    const cleanSubtotal = toNumber(subtotal, 0);

    const { data, error } = await supabase.rpc("validate_discount_code", {
      p_code: cleanCode,
      p_subtotal: cleanSubtotal
    });

    if (error) {
      throw new Error(error.message || "Could not validate discount code.");
    }

    return data || {
      is_valid: false,
      message: "Could not validate discount code."
    };
  }

  return {
    validateCode
  };
})();
