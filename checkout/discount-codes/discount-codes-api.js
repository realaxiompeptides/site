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

  function toText(value, fallback = "") {
    if (value === null || typeof value === "undefined") {
      return fallback;
    }
    return String(value);
  }

  function normalizeValidationResult(data, cleanCode, cleanSubtotal) {
    const row = data || {};

    return {
      is_valid: Boolean(row.is_valid),
      message: toText(
        row.message,
        row.is_valid ? "Discount code applied." : "Could not validate discount code."
      ),

      code: normalizeCode(row.code || cleanCode),
      input_code: cleanCode,
      subtotal: toNumber(
        row.subtotal !== undefined && row.subtotal !== null ? row.subtotal : cleanSubtotal,
        cleanSubtotal
      ),

      discount_type: toText(row.discount_type, ""),
      discount_value: toNumber(row.discount_value, 0),
      discount_amount: toNumber(row.discount_amount, 0),
      min_subtotal: toNumber(row.min_subtotal, 0),
      applies_to: toText(row.applies_to, "all"),

      is_affiliate_code: Boolean(row.is_affiliate_code),
      affiliate_id: row.affiliate_id || null,
      affiliate_code: toText(row.affiliate_code || row.code || cleanCode, ""),
      affiliate_referral_code: toText(row.affiliate_referral_code || row.affiliate_code || "", ""),
      affiliate_discount_amount: toNumber(
        row.affiliate_discount_amount !== undefined && row.affiliate_discount_amount !== null
          ? row.affiliate_discount_amount
          : row.discount_amount,
        0
      ),
      affiliate_commission_amount: toNumber(row.affiliate_commission_amount, 0),
      affiliate_commission_type: toText(row.affiliate_commission_type, ""),
      affiliate_commission_value: toNumber(row.affiliate_commission_value, 0),
      affiliate_email: toText(row.affiliate_email, ""),
      affiliate_full_name: toText(row.affiliate_full_name, ""),

      starts_at: row.starts_at || null,
      ends_at: row.ends_at || null,
      times_used: toNumber(row.times_used, 0),
      max_uses: row.max_uses === null || typeof row.max_uses === "undefined"
        ? null
        : toNumber(row.max_uses, null)
    };
  }

  async function validateCode(code, subtotal) {
    const supabase = getSupabase();

    const cleanCode = normalizeCode(code);
    const cleanSubtotal = toNumber(subtotal, 0);

    if (!cleanCode) {
      return {
        is_valid: false,
        message: "Enter a discount code.",
        code: "",
        input_code: "",
        subtotal: cleanSubtotal,
        discount_type: "",
        discount_value: 0,
        discount_amount: 0,
        min_subtotal: 0,
        applies_to: "all",
        is_affiliate_code: false,
        affiliate_id: null,
        affiliate_code: "",
        affiliate_referral_code: "",
        affiliate_discount_amount: 0,
        affiliate_commission_amount: 0,
        affiliate_commission_type: "",
        affiliate_commission_value: 0,
        affiliate_email: "",
        affiliate_full_name: "",
        starts_at: null,
        ends_at: null,
        times_used: 0,
        max_uses: null
      };
    }

    const { data, error } = await supabase.rpc("validate_discount_code", {
      p_code: cleanCode,
      p_subtotal: cleanSubtotal
    });

    if (error) {
      throw new Error(error.message || "Could not validate discount code.");
    }

    return normalizeValidationResult(data, cleanCode, cleanSubtotal);
  }

  return {
    validateCode
  };
})();
