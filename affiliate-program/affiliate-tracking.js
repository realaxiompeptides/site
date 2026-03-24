(function () {
  const STORAGE_KEY = "axiom_affiliate_attribution";
  const SESSION_STORAGE_KEY = "axiom_affiliate_attribution_session";
  const VISITOR_KEY = "axiom_visitor_id";
  const VISITOR_SESSION_KEY = "axiom_visitor_id_session";
  const ATTR_COOKIE_KEY = "axiom_affiliate_attribution";
  const VISITOR_COOKIE_KEY = "axiom_visitor_id";
  const SESSION_TTL_DAYS = 30;

  let syncTimeoutId = null;
  let isSyncingCheckoutAttribution = false;
  let scheduledSyncAttempts = 0;
  const MAX_SCHEDULED_SYNC_ATTEMPTS = 20;
  const SYNC_RETRY_MS = 750;

  function getSupabase() {
    return window.axiomSupabase || null;
  }

  function generateUuidLike() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (char) {
      const rand = Math.random() * 16 | 0;
      const value = char === "x" ? rand : (rand & 0x3 | 0x8);
      return value.toString(16);
    });
  }

  function safeJsonParse(value) {
    try {
      return JSON.parse(value);
    } catch (error) {
      return null;
    }
  }

  function getNowIso() {
    return new Date().toISOString();
  }

  function getExpiryDate(days) {
    const date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    return date;
  }

  function setCookie(name, value, days) {
    try {
      const expires = getExpiryDate(days).toUTCString();
      document.cookie =
        encodeURIComponent(name) +
        "=" +
        encodeURIComponent(value) +
        "; expires=" +
        expires +
        "; path=/; SameSite=Lax";
    } catch (error) {
      console.error("Failed to set cookie:", error);
    }
  }

  function getCookie(name) {
    try {
      const encodedName = encodeURIComponent(name) + "=";
      const parts = document.cookie ? document.cookie.split("; ") : [];

      for (let index = 0; index < parts.length; index += 1) {
        const part = parts[index];
        if (part.indexOf(encodedName) === 0) {
          return decodeURIComponent(part.substring(encodedName.length));
        }
      }

      return "";
    } catch (error) {
      return "";
    }
  }

  function clearCookie(name) {
    try {
      document.cookie =
        encodeURIComponent(name) +
        "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax";
    } catch (error) {
      console.error("Failed to clear cookie:", error);
    }
  }

  function getCurrentUrl() {
    return window.location.pathname + window.location.search;
  }

  function getCurrentPath() {
    return window.location.pathname || "/";
  }

  function getReferrer() {
    try {
      return document.referrer || "";
    } catch (error) {
      return "";
    }
  }

  function getUserAgent() {
    try {
      return navigator.userAgent || "";
    } catch (error) {
      return "";
    }
  }

  function getUtmParams() {
    try {
      const params = new URLSearchParams(window.location.search);
      return {
        utm_source: (params.get("utm_source") || "").trim() || null,
        utm_medium: (params.get("utm_medium") || "").trim() || null,
        utm_campaign: (params.get("utm_campaign") || "").trim() || null
      };
    } catch (error) {
      return {
        utm_source: null,
        utm_medium: null,
        utm_campaign: null
      };
    }
  }

  function getQueryParam(name) {
    const params = new URLSearchParams(window.location.search);
    return (params.get(name) || "").trim();
  }

  function isExpired(capturedAt) {
    if (!capturedAt) return false;

    const capturedTime = new Date(capturedAt).getTime();
    if (Number.isNaN(capturedTime)) return false;

    const ageMs = Date.now() - capturedTime;
    const maxAgeMs = SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;

    return ageMs > maxAgeMs;
  }

  function normalizeStoredAttribution(raw) {
    if (!raw || typeof raw !== "object") {
      return null;
    }

    return {
      affiliate_id: raw.affiliate_id || null,
      affiliate_code: raw.affiliate_code || "",
      affiliate_click_id: raw.affiliate_click_id || null,
      affiliate_referral_session_id: raw.affiliate_referral_session_id || null,
      affiliate_landing_page: raw.affiliate_landing_page || raw.landing_page || "",
      landing_page: raw.landing_page || raw.affiliate_landing_page || "",
      current_page: raw.current_page || getCurrentUrl(),
      referrer: raw.referrer || "",
      visitor_id: raw.visitor_id || getVisitorId(),
      affiliate_discount_amount: Number(raw.affiliate_discount_amount || 0),
      affiliate_commission_amount: Number(raw.affiliate_commission_amount || 0),
      captured_at: raw.captured_at || getNowIso()
    };
  }

  function clearStoredAttribution() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {}

    try {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    } catch (error) {}

    clearCookie(ATTR_COOKIE_KEY);

    if (window.AXIOM_AFFILIATE_ATTRIBUTION) {
      delete window.AXIOM_AFFILIATE_ATTRIBUTION;
    }
  }

  function clearStoredVisitorId() {
    try {
      localStorage.removeItem(VISITOR_KEY);
    } catch (error) {}

    try {
      sessionStorage.removeItem(VISITOR_SESSION_KEY);
    } catch (error) {}

    clearCookie(VISITOR_COOKIE_KEY);
  }

  function getVisitorId() {
    let visitorId = "";

    try {
      visitorId = localStorage.getItem(VISITOR_KEY) || "";
    } catch (error) {}

    if (!visitorId) {
      try {
        visitorId = sessionStorage.getItem(VISITOR_SESSION_KEY) || "";
      } catch (error) {}
    }

    if (!visitorId) {
      visitorId = getCookie(VISITOR_COOKIE_KEY) || "";
    }

    if (!visitorId) {
      visitorId = generateUuidLike();
    }

    try {
      localStorage.setItem(VISITOR_KEY, visitorId);
    } catch (error) {
      console.error("Failed storing visitor id in localStorage:", error);
    }

    try {
      sessionStorage.setItem(VISITOR_SESSION_KEY, visitorId);
    } catch (error) {
      console.error("Failed storing visitor id in sessionStorage:", error);
    }

    setCookie(VISITOR_COOKIE_KEY, visitorId, SESSION_TTL_DAYS);

    return visitorId;
  }

  function getStoredAttribution() {
    let parsed = null;

    try {
      const rawLocal = localStorage.getItem(STORAGE_KEY);
      if (rawLocal) {
        parsed = safeJsonParse(rawLocal);
      }
    } catch (error) {
      console.error("Failed to read local affiliate attribution:", error);
    }

    if (!parsed) {
      try {
        const rawSession = sessionStorage.getItem(SESSION_STORAGE_KEY);
        if (rawSession) {
          parsed = safeJsonParse(rawSession);
        }
      } catch (error) {
        console.error("Failed to read session affiliate attribution:", error);
      }
    }

    if (!parsed) {
      const cookieValue = getCookie(ATTR_COOKIE_KEY);
      if (cookieValue) {
        parsed = safeJsonParse(cookieValue);
      }
    }

    parsed = normalizeStoredAttribution(parsed);

    if (!parsed) {
      return null;
    }

    if (isExpired(parsed.captured_at)) {
      clearStoredAttribution();
      return null;
    }

    return parsed;
  }

  function setStoredAttribution(data) {
    const payload = normalizeStoredAttribution(Object.assign({}, data || {}));
    if (!payload) return;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {
      console.error("Failed to store affiliate attribution in localStorage:", error);
    }

    try {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {
      console.error("Failed to store affiliate attribution in sessionStorage:", error);
    }

    setCookie(ATTR_COOKIE_KEY, JSON.stringify(payload), SESSION_TTL_DAYS);
    window.AXIOM_AFFILIATE_ATTRIBUTION = payload;
  }

  function updateStoredAttributionPageData() {
    const existing = getStoredAttribution();
    if (!existing) return null;

    const nextPayload = normalizeStoredAttribution(
      Object.assign({}, existing, {
        current_page: getCurrentUrl(),
        referrer: getReferrer(),
        visitor_id: getVisitorId()
      })
    );

    setStoredAttribution(nextPayload);
    return nextPayload;
  }

  function buildAttributionPayload(args) {
    return normalizeStoredAttribution({
      affiliate_id: args.affiliate_id || null,
      affiliate_code: args.affiliate_code || "",
      affiliate_click_id: args.affiliate_click_id || null,
      affiliate_referral_session_id: args.affiliate_referral_session_id || null,
      affiliate_landing_page: args.affiliate_landing_page || args.landing_page || getCurrentUrl(),
      landing_page: args.landing_page || getCurrentUrl(),
      current_page: getCurrentUrl(),
      referrer: getReferrer(),
      visitor_id: args.visitor_id || getVisitorId(),
      affiliate_discount_amount:
        args.affiliate_discount_amount !== undefined && args.affiliate_discount_amount !== null
          ? Number(args.affiliate_discount_amount || 0)
          : 0,
      affiliate_commission_amount:
        args.affiliate_commission_amount !== undefined && args.affiliate_commission_amount !== null
          ? Number(args.affiliate_commission_amount || 0)
          : 0,
      captured_at: args.captured_at || getNowIso()
    });
  }

  async function fetchAffiliateByCode(referralCode) {
    const supabase = getSupabase();
    if (!supabase || !referralCode) return null;

    const result = await supabase
      .from("affiliates")
      .select("*")
      .eq("referral_code", referralCode)
      .eq("status", "approved")
      .maybeSingle();

    if (result.error) {
      throw result.error;
    }

    return result.data || null;
  }

  async function fetchAffiliateByDiscountCode(code) {
    const supabase = getSupabase();
    if (!supabase || !code) return null;

    const cleanCode = String(code || "").trim().toUpperCase();
    if (!cleanCode) return null;

    const result = await supabase
      .from("affiliates")
      .select("*")
      .eq("referral_code", cleanCode)
      .eq("status", "approved")
      .maybeSingle();

    if (result.error) {
      throw result.error;
    }

    return result.data || null;
  }

  async function createAffiliateClick(affiliate, visitorId) {
    const supabase = getSupabase();
    if (!supabase || !affiliate || !affiliate.id) return null;

    const utm = getUtmParams();

    const insertResult = await supabase
      .from("affiliate_clicks")
      .insert({
        affiliate_id: affiliate.id,
        referral_code: affiliate.referral_code,
        visitor_id: visitorId,
        landing_page: getCurrentUrl(),
        current_page: getCurrentUrl(),
        referrer: getReferrer(),
        user_agent: getUserAgent(),
        utm_source: utm.utm_source,
        utm_medium: utm.utm_medium,
        utm_campaign: utm.utm_campaign
      })
      .select("id")
      .single();

    if (insertResult.error) {
      throw insertResult.error;
    }

    return insertResult.data || null;
  }

  async function findOpenReferralSession(affiliate, visitorId) {
    const supabase = getSupabase();
    if (!supabase || !affiliate || !affiliate.id) return null;

    const result = await supabase
      .from("affiliate_referral_sessions")
      .select("*")
      .eq("affiliate_id", affiliate.id)
      .eq("visitor_id", visitorId)
      .eq("is_converted", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (result.error) {
      throw result.error;
    }

    return result.data || null;
  }

  async function createOrUpdateReferralSession(affiliate, visitorId) {
    const supabase = getSupabase();
    if (!supabase || !affiliate || !affiliate.id) return null;

    const existing = await findOpenReferralSession(affiliate, visitorId);

    if (existing && existing.id) {
      const updateResult = await supabase
        .from("affiliate_referral_sessions")
        .update({
          latest_page: getCurrentUrl(),
          latest_referrer: getReferrer(),
          user_agent: getUserAgent(),
          updated_at: getNowIso()
        })
        .eq("id", existing.id)
        .select("*")
        .single();

      if (updateResult.error) {
        throw updateResult.error;
      }

      return updateResult.data || existing;
    }

    const insertResult = await supabase
      .from("affiliate_referral_sessions")
      .insert({
        affiliate_id: affiliate.id,
        referral_code: affiliate.referral_code,
        visitor_id: visitorId,
        first_landing_page: getCurrentUrl(),
        latest_page: getCurrentUrl(),
        first_referrer: getReferrer(),
        latest_referrer: getReferrer(),
        user_agent: getUserAgent(),
        is_converted: false
      })
      .select("*")
      .single();

    if (insertResult.error) {
      throw insertResult.error;
    }

    return insertResult.data || null;
  }

  async function refreshTrackedSession(attribution) {
    const supabase = getSupabase();
    if (!supabase || !attribution || !attribution.affiliate_referral_session_id) return;

    const result = await supabase
      .from("affiliate_referral_sessions")
      .update({
        latest_page: getCurrentUrl(),
        latest_referrer: getReferrer(),
        user_agent: getUserAgent(),
        updated_at: getNowIso()
      })
      .eq("id", attribution.affiliate_referral_session_id);

    if (result.error) {
      console.error("Failed updating affiliate referral session:", result.error);
    }
  }

  function maybeStripReferralParamFromUrl() {
    try {
      const url = new URL(window.location.href);
      if (!url.searchParams.has("ref")) return;

      url.searchParams.delete("ref");
      const nextUrl = url.pathname + (url.search ? url.search : "") + (url.hash ? url.hash : "");
      window.history.replaceState({}, document.title, nextUrl);
    } catch (error) {
      console.error("Failed to strip ref param from URL:", error);
    }
  }

  async function handleReferralCode(referralCode) {
    const supabase = getSupabase();
    if (!supabase) return;

    const cleanCode = String(referralCode || "").trim();
    if (!cleanCode) return;

    const visitorId = getVisitorId();
    const affiliate = await fetchAffiliateByCode(cleanCode);

    if (!affiliate) {
      console.warn("Affiliate referral code not found or not approved:", cleanCode);
      return;
    }

    const existing = getStoredAttribution();

    if (
      existing &&
      existing.affiliate_code &&
      String(existing.affiliate_code).trim().toUpperCase() === cleanCode.toUpperCase() &&
      existing.affiliate_referral_session_id
    ) {
      const refreshedPayload = normalizeStoredAttribution(
        Object.assign({}, existing, {
          current_page: getCurrentUrl(),
          referrer: getReferrer(),
          visitor_id: visitorId
        })
      );

      setStoredAttribution(refreshedPayload);
      await refreshTrackedSession(refreshedPayload);
      maybeStripReferralParamFromUrl();
      return;
    }

    const click = await createAffiliateClick(affiliate, visitorId);
    const referralSession = await createOrUpdateReferralSession(affiliate, visitorId);

    const payload = buildAttributionPayload({
      affiliate_id: affiliate.id,
      affiliate_code: affiliate.referral_code,
      affiliate_click_id: click ? click.id : null,
      affiliate_referral_session_id: referralSession ? referralSession.id : null,
      landing_page: getCurrentUrl(),
      affiliate_landing_page: getCurrentUrl(),
      visitor_id: visitorId,
      affiliate_discount_amount: 0,
      affiliate_commission_amount:
        String(affiliate.commission_type || "").toLowerCase() === "percent"
          ? Number(affiliate.commission_value || 0)
          : 0
    });

    setStoredAttribution(payload);
    maybeStripReferralParamFromUrl();
  }

  async function restoreExistingAttribution() {
    const existing = updateStoredAttributionPageData();
    if (!existing) return;

    await refreshTrackedSession(existing);
  }

  async function adoptAffiliateFromDiscountCode(discountCode) {
    const supabase = getSupabase();
    if (!supabase) return null;

    const cleanCode = String(discountCode || "").trim().toUpperCase();
    if (!cleanCode) return null;

    const existing = getStoredAttribution();
    if (existing && existing.affiliate_id && existing.affiliate_code) {
      return existing;
    }

    const affiliate = await fetchAffiliateByDiscountCode(cleanCode);
    if (!affiliate || !affiliate.id) {
      return null;
    }

    const visitorId = getVisitorId();
    const click = await createAffiliateClick(affiliate, visitorId);
    const referralSession = await createOrUpdateReferralSession(affiliate, visitorId);

    const payload = buildAttributionPayload({
      affiliate_id: affiliate.id,
      affiliate_code: affiliate.referral_code,
      affiliate_click_id: click ? click.id : null,
      affiliate_referral_session_id: referralSession ? referralSession.id : null,
      landing_page: getCurrentUrl(),
      affiliate_landing_page: getCurrentUrl(),
      visitor_id: visitorId,
      affiliate_discount_amount:
        String(affiliate.discount_type || "").toLowerCase() === "percent"
          ? Number(affiliate.discount_value || 0)
          : Number(affiliate.discount_value || 0),
      affiliate_commission_amount:
        String(affiliate.commission_type || "").toLowerCase() === "percent"
          ? Number(affiliate.commission_value || 0)
          : 0
    });

    setStoredAttribution(payload);
    return payload;
  }

  function getAttributionForCheckout() {
    const stored = getStoredAttribution();
    if (!stored) return null;

    return {
      affiliate_id: stored.affiliate_id || null,
      affiliate_code: stored.affiliate_code || "",
      affiliate_click_id: stored.affiliate_click_id || null,
      affiliate_referral_session_id: stored.affiliate_referral_session_id || null,
      affiliate_landing_page: stored.affiliate_landing_page || stored.landing_page || "",
      visitor_id: stored.visitor_id || getVisitorId(),
      affiliate_discount_amount: Number(stored.affiliate_discount_amount || 0),
      affiliate_commission_amount: Number(stored.affiliate_commission_amount || 0)
    };
  }

  async function syncAttributionIntoCheckoutSession() {
    const supabase = getSupabase();
    const attribution = getAttributionForCheckout();

    if (!supabase || !attribution || !attribution.affiliate_id || !attribution.affiliate_code) {
      return;
    }

    if (
      !window.AXIOM_CHECKOUT_SESSION ||
      typeof window.AXIOM_CHECKOUT_SESSION.ensureSession !== "function"
    ) {
      return;
    }

    if (isSyncingCheckoutAttribution) {
      return;
    }

    isSyncingCheckoutAttribution = true;

    try {
      const sessionId = await window.AXIOM_CHECKOUT_SESSION.ensureSession();
      if (!sessionId) return;

      const { data: checkoutRow, error: checkoutError } = await supabase
        .from("checkout_sessions")
        .select(
          "id, affiliate_id, affiliate_code, affiliate_click_id, affiliate_referral_session_id, affiliate_landing_page, affiliate_discount_amount, affiliate_commission_amount, discount_code"
        )
        .eq("session_id", sessionId)
        .maybeSingle();

      if (checkoutError || !checkoutRow) {
        if (checkoutError) {
          console.error("Failed loading checkout session for affiliate sync:", checkoutError);
        }
        return;
      }

      const existingAffiliateId = checkoutRow.affiliate_id || null;
      const existingAffiliateCode = checkoutRow.affiliate_code || "";
      const checkoutDiscountCode = String(checkoutRow.discount_code || "").trim().toUpperCase();
      const incomingAffiliateCode = String(attribution.affiliate_code || "").trim().toUpperCase();

      if (
        checkoutDiscountCode &&
        incomingAffiliateCode &&
        checkoutDiscountCode === incomingAffiliateCode
      ) {
        attribution.affiliate_discount_amount = Number(attribution.affiliate_discount_amount || 0);
      }

      if (
        existingAffiliateId &&
        existingAffiliateCode &&
        String(existingAffiliateCode).trim().toUpperCase() !== incomingAffiliateCode
      ) {
        return;
      }

      const alreadySynced =
        String(existingAffiliateId || "") === String(attribution.affiliate_id || "") &&
        String(existingAffiliateCode || "") === String(attribution.affiliate_code || "") &&
        String(checkoutRow.affiliate_click_id || "") === String(attribution.affiliate_click_id || "") &&
        String(checkoutRow.affiliate_referral_session_id || "") ===
          String(attribution.affiliate_referral_session_id || "") &&
        String(checkoutRow.affiliate_landing_page || "") ===
          String(attribution.affiliate_landing_page || "") &&
        Number(checkoutRow.affiliate_discount_amount || 0) ===
          Number(attribution.affiliate_discount_amount || 0) &&
        Number(checkoutRow.affiliate_commission_amount || 0) ===
          Number(attribution.affiliate_commission_amount || 0);

      if (alreadySynced) {
        return;
      }

      const updatePayload = {
        affiliate_id: attribution.affiliate_id || null,
        affiliate_code: attribution.affiliate_code || null,
        affiliate_click_id: attribution.affiliate_click_id || null,
        affiliate_referral_session_id: attribution.affiliate_referral_session_id || null,
        affiliate_landing_page: attribution.affiliate_landing_page || null,
        affiliate_discount_amount: Number(attribution.affiliate_discount_amount || 0),
        affiliate_commission_amount: Number(attribution.affiliate_commission_amount || 0),
        updated_at: getNowIso(),
        last_activity_at: getNowIso()
      };

      const { error: updateError } = await supabase
        .from("checkout_sessions")
        .update(updatePayload)
        .eq("id", checkoutRow.id);

      if (updateError) {
        console.error("Failed syncing affiliate attribution into checkout session:", updateError);
        return;
      }

      try {
        const refreshed = normalizeStoredAttribution(
          Object.assign({}, getStoredAttribution() || {}, updatePayload, {
            visitor_id: attribution.visitor_id || getVisitorId()
          })
        );

        if (refreshed) {
          setStoredAttribution(refreshed);
        }
      } catch (error) {
        console.error("Failed refreshing stored attribution after checkout sync:", error);
      }
    } catch (error) {
      console.error("Affiliate checkout session sync crashed:", error);
    } finally {
      isSyncingCheckoutAttribution = false;
    }
  }

  async function syncDiscountCodeIntoAffiliateAttribution(discountCode) {
    try {
      const cleanCode = String(discountCode || "").trim().toUpperCase();
      if (!cleanCode) return null;

      const existing = getStoredAttribution();
      if (
        existing &&
        existing.affiliate_code &&
        String(existing.affiliate_code).trim().toUpperCase() === cleanCode
      ) {
        await syncAttributionIntoCheckoutSession();
        return existing;
      }

      const adopted = await adoptAffiliateFromDiscountCode(cleanCode);
      if (adopted) {
        await syncAttributionIntoCheckoutSession();
        scheduleCheckoutAttributionSync();
      }
      return adopted;
    } catch (error) {
      console.error("Failed syncing discount code into affiliate attribution:", error);
      return null;
    }
  }

  async function syncConversionForOrder(orderId) {
    const supabase = getSupabase();
    if (!supabase || !orderId) return null;

    try {
      const { data: orderRow, error: orderError } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .maybeSingle();

      if (orderError || !orderRow) {
        if (orderError) {
          console.error("Failed loading order for affiliate conversion sync:", orderError);
        }
        return null;
      }

      if (!orderRow.affiliate_id || !orderRow.affiliate_code) {
        return null;
      }

      const { data: existingConversion, error: existingConversionError } = await supabase
        .from("affiliate_conversions")
        .select("id, commission_status")
        .eq("order_id", orderRow.id)
        .maybeSingle();

      if (existingConversionError) {
        console.error("Failed loading existing affiliate conversion:", existingConversionError);
        return null;
      }

      const fulfillmentStatus = String(orderRow.fulfillment_status || "").toLowerCase();
      const isClaimable = fulfillmentStatus === "fulfilled" || fulfillmentStatus === "shipped";
      const commissionStatus = isClaimable ? "claimable" : "pending";
      const claimableAt = isClaimable ? getNowIso() : null;

      if (existingConversion && existingConversion.id) {
        const { error: updateError } = await supabase
          .from("affiliate_conversions")
          .update({
            affiliate_id: orderRow.affiliate_id,
            referral_code: orderRow.affiliate_code,
            affiliate_click_id: orderRow.affiliate_click_id || null,
            affiliate_referral_session_id: orderRow.affiliate_referral_session_id || null,
            checkout_session_id: orderRow.checkout_session_id || null,
            order_number: orderRow.order_number || null,
            customer_email: orderRow.customer_email || null,
            subtotal: Number(orderRow.subtotal || 0),
            total_amount: Number(orderRow.total_amount || 0),
            discount_amount: Number(orderRow.discount_amount || 0),
            commission_amount: Number(orderRow.affiliate_commission_amount || 0),
            commission_status: commissionStatus,
            claimable_at: claimableAt,
            updated_at: getNowIso()
          })
          .eq("id", existingConversion.id);

        if (updateError) {
          console.error("Failed updating affiliate conversion:", updateError);
        }

        return true;
      }

      const { error: insertError } = await supabase
        .from("affiliate_conversions")
        .insert({
          affiliate_id: orderRow.affiliate_id,
          referral_code: orderRow.affiliate_code,
          affiliate_click_id: orderRow.affiliate_click_id || null,
          affiliate_referral_session_id: orderRow.affiliate_referral_session_id || null,
          checkout_session_id: orderRow.checkout_session_id || null,
          order_id: orderRow.id,
          order_number: orderRow.order_number || null,
          customer_email: orderRow.customer_email || null,
          subtotal: Number(orderRow.subtotal || 0),
          total_amount: Number(orderRow.total_amount || 0),
          discount_amount: Number(orderRow.discount_amount || 0),
          commission_amount: Number(orderRow.affiliate_commission_amount || 0),
          commission_status: commissionStatus,
          claimable_at: claimableAt,
          created_at: getNowIso(),
          updated_at: getNowIso()
        });

      if (insertError) {
        console.error("Failed inserting affiliate conversion:", insertError);
        return null;
      }

      if (orderRow.affiliate_referral_session_id) {
        const { error: referralUpdateError } = await supabase
          .from("affiliate_referral_sessions")
          .update({
            is_converted: true,
            updated_at: getNowIso()
          })
          .eq("id", orderRow.affiliate_referral_session_id);

        if (referralUpdateError) {
          console.error("Failed marking affiliate referral session converted:", referralUpdateError);
        }
      }

      return true;
    } catch (error) {
      console.error("Affiliate conversion sync crashed:", error);
      return null;
    }
  }

  function clearScheduledSync() {
    if (syncTimeoutId) {
      clearTimeout(syncTimeoutId);
      syncTimeoutId = null;
    }
  }

  function scheduleCheckoutAttributionSync() {
    clearScheduledSync();
    scheduledSyncAttempts = 0;

    function runAttempt() {
      scheduledSyncAttempts += 1;

      syncAttributionIntoCheckoutSession().catch(function (error) {
        console.error("Scheduled checkout affiliate sync failed:", error);
      });

      if (scheduledSyncAttempts < MAX_SCHEDULED_SYNC_ATTEMPTS) {
        syncTimeoutId = setTimeout(runAttempt, SYNC_RETRY_MS);
      } else {
        syncTimeoutId = null;
      }
    }

    runAttempt();
  }

  function bindAffiliateTrackingListeners() {
    if (window.__axiomAffiliateTrackingBound) {
      return;
    }

    window.__axiomAffiliateTrackingBound = true;

    window.addEventListener("storage", function () {
      syncAttributionIntoCheckoutSession().catch(function (error) {
        console.error("Storage-triggered affiliate sync failed:", error);
      });
    });

    window.addEventListener("pageshow", function () {
      syncAttributionIntoCheckoutSession().catch(function (error) {
        console.error("Pageshow affiliate sync failed:", error);
      });
    });

    window.addEventListener("axiom-cart-updated", function () {
      syncAttributionIntoCheckoutSession().catch(function (error) {
        console.error("Cart-updated affiliate sync failed:", error);
      });
    });

    window.addEventListener("axiom-discount-updated", function (event) {
      const code =
        event && event.detail && event.detail.code
          ? String(event.detail.code || "").trim().toUpperCase()
          : "";

      if (!code) {
        return;
      }

      syncDiscountCodeIntoAffiliateAttribution(code).catch(function (error) {
        console.error("Discount-updated affiliate sync failed:", error);
      });
    });

    window.addEventListener("axiom-order-created", function (event) {
      const orderId = event && event.detail ? event.detail.orderId : null;
      if (!orderId) return;

      syncConversionForOrder(orderId).catch(function (error) {
        console.error("Order-created affiliate conversion sync failed:", error);
      });
    });

    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "visible") {
        syncAttributionIntoCheckoutSession().catch(function (error) {
          console.error("Visibility affiliate sync failed:", error);
        });
      }
    });
  }

  async function initAffiliateTracking() {
    const supabase = getSupabase();

    if (!supabase) {
      console.warn("Affiliate tracking skipped: axiomSupabase is not available.");
      return;
    }

    try {
      getVisitorId();

      const referralCode = getQueryParam("ref");

      if (referralCode) {
        await handleReferralCode(referralCode);
      } else {
        await restoreExistingAttribution();
      }

      bindAffiliateTrackingListeners();
      await syncAttributionIntoCheckoutSession();
      scheduleCheckoutAttributionSync();
    } catch (error) {
      console.error("Affiliate tracking init failed:", error);
    }
  }

  window.AXIOM_AFFILIATE_TRACKING = {
    init: initAffiliateTracking,
    getAttribution: getStoredAttribution,
    getAttributionForCheckout: getAttributionForCheckout,
    getVisitorId: getVisitorId,
    clearAttribution: clearStoredAttribution,
    clearVisitorId: clearStoredVisitorId,
    syncAttributionIntoCheckoutSession: syncAttributionIntoCheckoutSession,
    syncDiscountCodeIntoAffiliateAttribution: syncDiscountCodeIntoAffiliateAttribution,
    syncConversionForOrder: syncConversionForOrder,
    storageKey: STORAGE_KEY,
    sessionStorageKey: SESSION_STORAGE_KEY,
    cookieKey: ATTR_COOKIE_KEY,
    visitorCookieKey: VISITOR_COOKIE_KEY
  };

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      function () {
        initAffiliateTracking();
      },
      { once: true }
    );
  } else {
    initAffiliateTracking();
  }
})();
