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

  function getAffiliateTrackingAttribution() {
    try {
      if (
        window.AXIOM_AFFILIATE_TRACKING &&
        typeof window.AXIOM_AFFILIATE_TRACKING.getAttributionForCheckout === "function"
      ) {
        return window.AXIOM_AFFILIATE_TRACKING.getAttributionForCheckout() || null;
      }
    } catch (error) {
      console.error("Failed to read affiliate attribution from tracking:", error);
    }

    try {
      return window.AXIOM_AFFILIATE_ATTRIBUTION || null;
    } catch (error) {
      return null;
    }
  }

  async function getAffiliateDetailsByCode(code) {
    const supabase = getSupabase();
    const cleanCode = normalizeCode(code);

    if (!cleanCode) {
      return null;
    }

    const { data, error } = await supabase
      .from("affiliates")
      .select("id, referral_code, commission_type, commission_value, discount_type, discount_value, email, full_name, status")
      .eq("referral_code", cleanCode)
      .maybeSingle();

    if (error) {
      throw new Error(error.message || "Could not load affiliate details.");
    }

    if (!data) {
      return null;
    }

    return data;
  }

  function calculateAffiliateDiscountAmount(subtotal, affiliate) {
    const cleanSubtotal = Math.max(toNumber(subtotal, 0), 0);
    if (!affiliate) return 0;

    const discountType = toText(affiliate.discount_type, "").toLowerCase();
    const discountValue = toNumber(affiliate.discount_value, 0);

    if (discountType === "percent") {
      return Number(((cleanSubtotal * discountValue) / 100).toFixed(2));
    }

    if (discountType === "fixed") {
      return Number(Math.min(cleanSubtotal, discountValue).toFixed(2));
    }

    return 0;
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

  function buildEmptyInvalidResult(cleanCode, cleanSubtotal, message) {
    return {
      is_valid: false,
      message: message || "Could not validate discount code.",
      code: cleanCode,
      input_code: cleanCode,
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

  function mergeAffiliateContextIntoValidationResult(result, affiliateContext) {
    const merged = Object.assign({}, result || {});

    if (!affiliateContext) {
      return merged;
    }

    merged.is_affiliate_code = true;
    merged.affiliate_id = affiliateContext.id || merged.affiliate_id || null;
    merged.affiliate_code = normalizeCode(
      affiliateContext.referral_code || merged.affiliate_code || merged.code || ""
    );
    merged.affiliate_referral_code = normalizeCode(
      affiliateContext.referral_code || merged.affiliate_referral_code || merged.affiliate_code || ""
    );
    merged.affiliate_discount_amount = toNumber(
      merged.affiliate_discount_amount !== undefined && merged.affiliate_discount_amount !== null
        ? merged.affiliate_discount_amount
        : merged.discount_amount,
      0
    );
    merged.affiliate_commission_type = toText(
      affiliateContext.commission_type || merged.affiliate_commission_type,
      ""
    );
    merged.affiliate_commission_value = toNumber(
      affiliateContext.commission_value !== undefined && affiliateContext.commission_value !== null
        ? affiliateContext.commission_value
        : merged.affiliate_commission_value,
      0
    );
    merged.affiliate_commission_amount = toNumber(
      merged.affiliate_commission_amount,
      0
    );
    merged.affiliate_email = toText(
      affiliateContext.email || merged.affiliate_email,
      ""
    );
    merged.affiliate_full_name = toText(
      affiliateContext.full_name || merged.affiliate_full_name,
      ""
    );

    return merged;
  }

  async function validateAffiliateCodeDirectly(cleanCode, cleanSubtotal) {
    const affiliate = await getAffiliateDetailsByCode(cleanCode);

    if (!affiliate || String(affiliate.status || "").toLowerCase() !== "approved") {
      return buildEmptyInvalidResult(cleanCode, cleanSubtotal, "That discount code does not exist.");
    }

    const discountAmount = calculateAffiliateDiscountAmount(cleanSubtotal, affiliate);

    return {
      is_valid: true,
      message: "Affiliate discount code applied.",
      code: normalizeCode(affiliate.referral_code || cleanCode),
      input_code: cleanCode,
      subtotal: cleanSubtotal,
      discount_type: toText(affiliate.discount_type, "percent"),
      discount_value: toNumber(affiliate.discount_value, 0),
      discount_amount: discountAmount,
      min_subtotal: 0,
      applies_to: "all",
      is_affiliate_code: true,
      affiliate_id: affiliate.id || null,
      affiliate_code: normalizeCode(affiliate.referral_code || cleanCode),
      affiliate_referral_code: normalizeCode(affiliate.referral_code || cleanCode),
      affiliate_discount_amount: discountAmount,
      affiliate_commission_amount: 0,
      affiliate_commission_type: toText(affiliate.commission_type, ""),
      affiliate_commission_value: toNumber(affiliate.commission_value, 0),
      affiliate_email: toText(affiliate.email, ""),
      affiliate_full_name: toText(affiliate.full_name, ""),
      starts_at: null,
      ends_at: null,
      times_used: 0,
      max_uses: null
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

    const affiliateTrackingAttribution = getAffiliateTrackingAttribution();
    const trackedAffiliateCode = normalizeCode(affiliateTrackingAttribution?.affiliate_code || "");

    const { data, error } = await supabase.rpc("validate_discount_code", {
      p_code: cleanCode,
      p_subtotal: cleanSubtotal
    });

    if (error) {
      throw new Error(error.message || "Could not validate discount code.");
    }

    let normalized = normalizeValidationResult(data, cleanCode, cleanSubtotal);

    if (!normalized.is_valid) {
      const directAffiliateResult = await validateAffiliateCodeDirectly(cleanCode, cleanSubtotal);
      if (directAffiliateResult.is_valid) {
        normalized = directAffiliateResult;
      }
    }

    if (normalized.is_valid && normalized.is_affiliate_code) {
      return normalized;
    }

    if (
      normalized.is_valid &&
      trackedAffiliateCode &&
      cleanCode === trackedAffiliateCode
    ) {
      try {
        const trackedAffiliate = await getAffiliateDetailsByCode(trackedAffiliateCode);
        if (trackedAffiliate && String(trackedAffiliate.status || "").toLowerCase() === "approved") {
          normalized = mergeAffiliateContextIntoValidationResult(normalized, trackedAffiliate);
          normalized.is_affiliate_code = true;
          normalized.affiliate_discount_amount = toNumber(normalized.discount_amount, 0);
        }
      } catch (affiliateContextError) {
        console.error("Failed to merge tracked affiliate discount context:", affiliateContextError);
      }
    }

    return normalized;
  }

  return {
    validateCode
  };
})();
