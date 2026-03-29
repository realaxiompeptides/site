(function () {
  const STORAGE_KEY = "axiom_affiliate_attribution";
  const SESSION_STORAGE_KEY = "axiom_affiliate_attribution_session";
  const VISITOR_KEY = "axiom_visitor_id";
  const VISITOR_SESSION_KEY = "axiom_visitor_id_session";
  const ATTR_COOKIE_KEY = "axiom_affiliate_attribution";
  const VISITOR_COOKIE_KEY = "axiom_visitor_id";
  const SESSION_TTL_DAYS = 30;

  const PENDING_CONVERSION_KEY = "axiom_pending_affiliate_conversion_order_id";
  const PENDING_CONVERSION_SESSION_KEY = "axiom_pending_affiliate_conversion_order_id_session";

  const MAX_SCHEDULED_SYNC_ATTEMPTS = 20;
  const SYNC_RETRY_MS = 750;

  let syncTimeoutId = null;
  let isSyncingCheckoutAttribution = false;
  let scheduledSyncAttempts = 0;
  let booted = false;

  function getSupabase() {
    return (
      window.axiomSupabase ||
      window.AXIOM_SUPABASE ||
      window.supabaseClient ||
      null
    );
  }

  function wait(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, ms);
    });
  }

  async function waitForSupabase(maxAttempts, delayMs) {
    const attempts = Number(maxAttempts || 40);
    const delay = Number(delayMs || 150);

    for (let index = 0; index < attempts; index += 1) {
      const supabase = getSupabase();
      if (supabase) {
        return supabase;
      }
      await wait(delay);
    }

    return null;
  }

  function debug() {
    try {
      const args = Array.prototype.slice.call(arguments);
      args.unshift("[AXIOM AFFILIATE TRACKING]");
      console.log.apply(console, args);
    } catch (error) {}
  }

  function warn() {
    try {
      const args = Array.prototype.slice.call(arguments);
      args.unshift("[AXIOM AFFILIATE TRACKING]");
      console.warn.apply(console, args);
    } catch (error) {}
  }

  function errorLog() {
    try {
      const args = Array.prototype.slice.call(arguments);
      args.unshift("[AXIOM AFFILIATE TRACKING]");
      console.error.apply(console, args);
    } catch (error) {}
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
      errorLog("Failed to set cookie:", name, error);
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
      errorLog("Failed to clear cookie:", name, error);
    }
  }

  function getCurrentUrl() {
    try {
      return window.location.pathname + window.location.search;
    } catch (error) {
      return "/";
    }
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
    try {
      const params = new URLSearchParams(window.location.search);
      return (params.get(name) || "").trim();
    } catch (error) {
      return "";
    }
  }

  function normalizeCode(value) {
    return String(value || "").trim().toUpperCase();
  }

  function toNumber(value, fallback) {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
  }

  function isExpired(capturedAt) {
    if (!capturedAt) return false;

    const capturedTime = new Date(capturedAt).getTime();
    if (Number.isNaN(capturedTime)) return false;

    const ageMs = Date.now() - capturedTime;
    const maxAgeMs = SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;

    return ageMs > maxAgeMs;
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
    } catch (error) {}

    try {
      sessionStorage.setItem(VISITOR_SESSION_KEY, visitorId);
    } catch (error) {}

    setCookie(VISITOR_COOKIE_KEY, visitorId, SESSION_TTL_DAYS);

    return visitorId;
  }

  function normalizeStoredAttribution(raw) {
    if (!raw || typeof raw !== "object") {
      return null;
    }

    const normalized = {
      affiliate_id: raw.affiliate_id || null,
      affiliate_code: normalizeCode(raw.affiliate_code || ""),
      affiliate_click_id: raw.affiliate_click_id || null,
      affiliate_referral_session_id: raw.affiliate_referral_session_id || null,
      affiliate_landing_page: raw.affiliate_landing_page || raw.landing_page || "",
      landing_page: raw.landing_page || raw.affiliate_landing_page || "",
      current_page: raw.current_page || getCurrentUrl(),
      referrer: raw.referrer || "",
      visitor_id: raw.visitor_id || getVisitorId(),
      affiliate_discount_amount: toNumber(raw.affiliate_discount_amount, 0),
      affiliate_commission_amount: toNumber(raw.affiliate_commission_amount, 0),
      captured_at: raw.captured_at || getNowIso()
    };

    if (!normalized.affiliate_id && !normalized.affiliate_code) {
      return null;
    }

    return normalized;
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

  function getStoredAttribution() {
    let parsed = null;

    try {
      const rawLocal = localStorage.getItem(STORAGE_KEY);
      if (rawLocal) {
        parsed = safeJsonParse(rawLocal);
      }
    } catch (error) {}

    if (!parsed) {
      try {
        const rawSession = sessionStorage.getItem(SESSION_STORAGE_KEY);
        if (rawSession) {
          parsed = safeJsonParse(rawSession);
        }
      } catch (error) {}
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
    if (!payload) return null;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {}

    try {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {}

    setCookie(ATTR_COOKIE_KEY, JSON.stringify(payload), SESSION_TTL_DAYS);
    window.AXIOM_AFFILIATE_ATTRIBUTION = payload;

    return payload;
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

    if (nextPayload) {
      setStoredAttribution(nextPayload);
    }

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

    const cleanCode = normalizeCode(referralCode);
    if (!cleanCode) return null;

    const result = await supabase
      .from("affiliates")
      .select("id, referral_code, status, discount_type, discount_value, commission_type, commission_value")
      .eq("referral_code", cleanCode)
      .eq("status", "approved")
      .maybeSingle();

    if (result.error) {
      throw result.error;
    }

    return result.data || null;
  }

  async function fetchAffiliateByDiscountCode(code) {
    return fetchAffiliateByCode(code);
  }

  async function insertWithoutSelect(tableName, payload) {
    const supabase = getSupabase();
    if (!supabase) {
      throw new Error("Supabase client unavailable.");
    }

    const result = await supabase.from(tableName).insert(payload);
    if (result.error) {
      throw result.error;
    }

    return true;
  }

  async function updateWithoutSelect(tableName, payload, matchColumn, matchValue) {
    const supabase = getSupabase();
    if (!supabase) {
      throw new Error("Supabase client unavailable.");
    }

    const query = supabase.from(tableName).update(payload).eq(matchColumn, matchValue);
    const result = await query;
    if (result.error) {
      throw result.error;
    }

    return true;
  }

  async function createAffiliateClick(affiliate, visitorId, options) {
    if (!affiliate || !affiliate.id) return null;

    const clickId = generateUuidLike();
    const utm = getUtmParams();
    const payload = {
      id: clickId,
      affiliate_id: affiliate.id,
      referral_code: affiliate.referral_code,
      visitor_id: visitorId,
      landing_page:
        (options && options.landing_page) || getCurrentUrl(),
      current_page: getCurrentUrl(),
      referrer: getReferrer(),
      user_agent: getUserAgent(),
      utm_source: utm.utm_source,
      utm_medium: utm.utm_medium,
      utm_campaign: utm.utm_campaign,
      created_at: getNowIso()
    };

    await insertWithoutSelect("affiliate_clicks", payload);
    debug("Tracked affiliate click:", clickId, affiliate.referral_code, payload.landing_page);

    return { id: clickId };
  }

  async function createReferralSession(affiliate, visitorId, options) {
    if (!affiliate || !affiliate.id) return null;

    const sessionId = generateUuidLike();
    const payload = {
      id: sessionId,
      affiliate_id: affiliate.id,
      referral_code: affiliate.referral_code,
      visitor_id: visitorId,
      first_landing_page:
        (options && options.landing_page) || getCurrentUrl(),
      latest_page: getCurrentUrl(),
      first_referrer: getReferrer(),
      latest_referrer: getReferrer(),
      user_agent: getUserAgent(),
      is_converted: false,
      created_at: getNowIso(),
      updated_at: getNowIso()
    };

    await insertWithoutSelect("affiliate_referral_sessions", payload);
    debug("Created affiliate referral session:", sessionId, affiliate.referral_code);

    return { id: sessionId };
  }

  async function refreshTrackedSession(attribution) {
    if (!attribution || !attribution.affiliate_referral_session_id) return;

    try {
      await updateWithoutSelect(
        "affiliate_referral_sessions",
        {
          latest_page: getCurrentUrl(),
          latest_referrer: getReferrer(),
          user_agent: getUserAgent(),
          updated_at: getNowIso()
        },
        "id",
        attribution.affiliate_referral_session_id
      );
    } catch (error) {
      errorLog("Failed updating affiliate referral session:", error);
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
      errorLog("Failed to strip ref param from URL:", error);
    }
  }

  async function buildAffiliateAttributionForAffiliate(affiliate, options) {
    if (!affiliate || !affiliate.id) return null;

    const visitorId = options && options.visitorId ? options.visitorId : getVisitorId();
    const click = await createAffiliateClick(affiliate, visitorId, options);
    const referralSession = await createReferralSession(affiliate, visitorId, options);

    return buildAttributionPayload({
      affiliate_id: affiliate.id,
      affiliate_code: affiliate.referral_code,
      affiliate_click_id: click ? click.id : null,
      affiliate_referral_session_id: referralSession ? referralSession.id : null,
      landing_page:
        options && options.landing_page ? options.landing_page : getCurrentUrl(),
      affiliate_landing_page:
        options && options.affiliate_landing_page ? options.affiliate_landing_page : getCurrentUrl(),
      visitor_id: visitorId,
      affiliate_discount_amount: Number(affiliate.discount_value || 0),
      affiliate_commission_amount: Number(affiliate.commission_value || 0)
    });
  }

  async function handleReferralCode(referralCode) {
    const supabase = getSupabase();
    if (!supabase) return null;

    const cleanCode = normalizeCode(referralCode);
    if (!cleanCode) return null;

    const visitorId = getVisitorId();
    const existing = getStoredAttribution();

    const affiliate = await fetchAffiliateByCode(cleanCode);

    if (!affiliate) {
      warn("Affiliate referral code not found or not approved:", cleanCode);
      maybeStripReferralParamFromUrl();
      return null;
    }

    let referralSessionId = null;

    if (
      existing &&
      normalizeCode(existing.affiliate_code) === cleanCode &&
      existing.affiliate_id &&
      existing.affiliate_referral_session_id
    ) {
      referralSessionId = existing.affiliate_referral_session_id;

      const refreshedPayload = normalizeStoredAttribution(
        Object.assign({}, existing, {
          current_page: getCurrentUrl(),
          referrer: getReferrer(),
          visitor_id: visitorId
        })
      );

      if (refreshedPayload) {
        setStoredAttribution(refreshedPayload);
        await refreshTrackedSession(refreshedPayload);
      }
    } else {
      const referralSession = await createReferralSession(affiliate, visitorId, {
        landing_page: getCurrentUrl()
      });

      referralSessionId = referralSession ? referralSession.id : null;
    }

    const click = await createAffiliateClick(affiliate, visitorId, {
      landing_page: getCurrentUrl()
    });

    const payload = buildAttributionPayload({
      affiliate_id: affiliate.id,
      affiliate_code: affiliate.referral_code,
      affiliate_click_id: click ? click.id : null,
      affiliate_referral_session_id: referralSessionId,
      landing_page: getCurrentUrl(),
      affiliate_landing_page: getCurrentUrl(),
      visitor_id: visitorId,
      affiliate_discount_amount: Number(affiliate.discount_value || 0),
      affiliate_commission_amount: Number(affiliate.commission_value || 0)
    });

    if (payload) {
      setStoredAttribution(payload);
    }

    maybeStripReferralParamFromUrl();
    return payload;
  }

  async function restoreExistingAttribution() {
    const existing = updateStoredAttributionPageData();
    if (!existing) return null;

    await refreshTrackedSession(existing);
    return existing;
  }

  async function adoptAffiliateFromDiscountCode(discountCode) {
    const cleanCode = normalizeCode(discountCode);
    if (!cleanCode) return null;

    const existing = getStoredAttribution();
    if (
      existing &&
      existing.affiliate_code &&
      normalizeCode(existing.affiliate_code) === cleanCode &&
      existing.affiliate_id
    ) {
      return existing;
    }

    const affiliate = await fetchAffiliateByDiscountCode(cleanCode);
    if (!affiliate || !affiliate.id) {
      return null;
    }

    const payload = await buildAffiliateAttributionForAffiliate(affiliate, {
      visitorId: getVisitorId(),
      landing_page: getCurrentUrl(),
      affiliate_landing_page: getCurrentUrl()
    });

    if (payload) {
      setStoredAttribution(payload);
    }

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

  function buildAttributionFromCheckoutRow(checkoutRow) {
    if (!checkoutRow || (!checkoutRow.affiliate_id && !checkoutRow.affiliate_code)) {
      return null;
    }

    return normalizeStoredAttribution({
      affiliate_id: checkoutRow.affiliate_id || null,
      affiliate_code: checkoutRow.affiliate_code || "",
      affiliate_click_id: checkoutRow.affiliate_click_id || null,
      affiliate_referral_session_id: checkoutRow.affiliate_referral_session_id || null,
      affiliate_landing_page: checkoutRow.affiliate_landing_page || "",
      landing_page: checkoutRow.affiliate_landing_page || "",
      current_page: getCurrentUrl(),
      referrer: getReferrer(),
      visitor_id: getVisitorId(),
      affiliate_discount_amount: Number(checkoutRow.affiliate_discount_amount || 0),
      affiliate_commission_amount: Number(checkoutRow.affiliate_commission_amount || 0),
      captured_at: getNowIso()
    });
  }

  async function getLiveCheckoutRow(sessionId) {
    const supabase = getSupabase();
    if (!supabase || !sessionId) return null;

    const result = await supabase
      .from("checkout_sessions")
      .select(
        "id, session_id, affiliate_id, affiliate_code, affiliate_click_id, affiliate_referral_session_id, affiliate_landing_page, affiliate_discount_amount, affiliate_commission_amount, discount_code"
      )
      .eq("session_id", sessionId)
      .maybeSingle();

    if (result.error) {
      throw result.error;
    }

    return result.data || null;
  }

  async function syncAttributionIntoCheckoutSession() {
    const supabase = getSupabase();

    if (
      !supabase ||
      !window.AXIOM_CHECKOUT_SESSION ||
      typeof window.AXIOM_CHECKOUT_SESSION.ensureSession !== "function"
    ) {
      return null;
    }

    if (isSyncingCheckoutAttribution) {
      return null;
    }

    isSyncingCheckoutAttribution = true;

    try {
      const sessionId = await window.AXIOM_CHECKOUT_SESSION.ensureSession();
      if (!sessionId) return null;

      let checkoutRow = null;

      try {
        if (
          typeof window.AXIOM_CHECKOUT_SESSION.getSession === "function"
        ) {
          checkoutRow = await window.AXIOM_CHECKOUT_SESSION.getSession(true);
        }
      } catch (error) {
        errorLog("Failed reading cached checkout session before affiliate sync:", error);
      }

      if (!checkoutRow || !checkoutRow.id) {
        checkoutRow = await getLiveCheckoutRow(sessionId);
      }

      if (!checkoutRow || !checkoutRow.id) {
        warn("No checkout session row found for affiliate sync:", sessionId);
        return null;
      }

      let attribution = getAttributionForCheckout();

      if (!attribution && checkoutRow.affiliate_id && checkoutRow.affiliate_code) {
        const seeded = buildAttributionFromCheckoutRow(checkoutRow);
        if (seeded) {
          setStoredAttribution(seeded);
          attribution = getAttributionForCheckout();
        }
      }

      if (!attribution || !attribution.affiliate_id || !attribution.affiliate_code) {
        return null;
      }

      const existingAffiliateId = checkoutRow.affiliate_id || null;
      const existingAffiliateCode = normalizeCode(checkoutRow.affiliate_code || "");
      const incomingAffiliateCode = normalizeCode(attribution.affiliate_code || "");

      const alreadySynced =
        String(existingAffiliateId || "") === String(attribution.affiliate_id || "") &&
        existingAffiliateCode === incomingAffiliateCode &&
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
        return true;
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

      if (
        typeof window.AXIOM_CHECKOUT_SESSION.patchSession === "function"
      ) {
        await window.AXIOM_CHECKOUT_SESSION.patchSession(updatePayload);
      } else {
        await updateWithoutSelect("checkout_sessions", updatePayload, "id", checkoutRow.id);
      }

      const refreshed = normalizeStoredAttribution(
        Object.assign({}, getStoredAttribution() || {}, updatePayload, {
          visitor_id: attribution.visitor_id || getVisitorId()
        })
      );

      if (refreshed) {
        setStoredAttribution(refreshed);
      }

      debug("Synced affiliate attribution into checkout session:", sessionId, updatePayload);
      return true;
    } catch (error) {
      errorLog("Affiliate checkout session sync crashed:", error);
      return null;
    } finally {
      isSyncingCheckoutAttribution = false;
    }
  }

  async function syncDiscountCodeIntoAffiliateAttribution(discountCode) {
    try {
      const cleanCode = normalizeCode(discountCode);
      if (!cleanCode) return null;

      const existing = getStoredAttribution();
      if (
        existing &&
        existing.affiliate_code &&
        normalizeCode(existing.affiliate_code) === cleanCode
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
      errorLog("Failed syncing discount code into affiliate attribution:", error);
      return null;
    }
  }

  function setPendingConversionOrderId(orderId) {
    const cleanOrderId = String(orderId || "").trim();
    if (!cleanOrderId) return;

    try {
      localStorage.setItem(PENDING_CONVERSION_KEY, cleanOrderId);
    } catch (error) {}

    try {
      sessionStorage.setItem(PENDING_CONVERSION_SESSION_KEY, cleanOrderId);
    } catch (error) {}
  }

  function getPendingConversionOrderId() {
    let orderId = "";

    try {
      orderId = localStorage.getItem(PENDING_CONVERSION_KEY) || "";
    } catch (error) {}

    if (!orderId) {
      try {
        orderId = sessionStorage.getItem(PENDING_CONVERSION_SESSION_KEY) || "";
      } catch (error) {}
    }

    return String(orderId || "").trim();
  }

  function clearPendingConversionOrderId() {
    try {
      localStorage.removeItem(PENDING_CONVERSION_KEY);
    } catch (error) {}

    try {
      sessionStorage.removeItem(PENDING_CONVERSION_SESSION_KEY);
    } catch (error) {}
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
          errorLog("Failed loading order for affiliate conversion sync:", orderError);
        }
        return null;
      }

      if (!orderRow.affiliate_id || !orderRow.affiliate_code) {
        clearPendingConversionOrderId();
        debug("Order has no affiliate attribution, skipping conversion:", orderId);
        return null;
      }

      let existingConversion = null;
      let existingConversionError = null;

      try {
        const existingResult = await supabase
          .from("affiliate_conversions")
          .select("id, commission_status")
          .eq("order_id", orderRow.id)
          .maybeSingle();

        existingConversion = existingResult.data || null;
        existingConversionError = existingResult.error || null;
      } catch (error) {
        existingConversionError = error;
      }

      if (existingConversionError) {
        errorLog("Failed loading existing affiliate conversion:", existingConversionError);
      }

      const fulfillmentStatus = String(orderRow.fulfillment_status || "").toLowerCase();
      const isClaimable = fulfillmentStatus === "fulfilled" || fulfillmentStatus === "shipped";
      const commissionStatus = isClaimable ? "claimable" : "pending";
      const claimableAt = isClaimable ? getNowIso() : null;

      const basePayload = {
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
        updated_at: getNowIso()
      };

      if (existingConversion && existingConversion.id) {
        await updateWithoutSelect(
          "affiliate_conversions",
          basePayload,
          "id",
          existingConversion.id
        );

        debug("Updated affiliate conversion:", existingConversion.id, orderRow.order_number || orderRow.id);
      } else {
        await insertWithoutSelect("affiliate_conversions", Object.assign({}, basePayload, {
          id: generateUuidLike(),
          created_at: getNowIso()
        }));

        debug("Inserted affiliate conversion for order:", orderRow.order_number || orderRow.id);
      }

      if (orderRow.affiliate_referral_session_id) {
        try {
          await updateWithoutSelect(
            "affiliate_referral_sessions",
            {
              is_converted: true,
              updated_at: getNowIso()
            },
            "id",
            orderRow.affiliate_referral_session_id
          );
        } catch (referralUpdateError) {
          errorLog("Failed marking affiliate referral session converted:", referralUpdateError);
        }
      }

      clearPendingConversionOrderId();
      return true;
    } catch (error) {
      errorLog("Affiliate conversion sync crashed:", error);
      return null;
    }
  }

  async function processPendingConversionIfNeeded() {
    const pendingOrderId = getPendingConversionOrderId();
    if (!pendingOrderId) return null;

    try {
      return await syncConversionForOrder(pendingOrderId);
    } catch (error) {
      errorLog("Processing pending affiliate conversion failed:", error);
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
        errorLog("Scheduled checkout affiliate sync failed:", error);
      });

      if (scheduledSyncAttempts < MAX_SCHEDULED_SYNC_ATTEMPTS) {
        syncTimeoutId = setTimeout(runAttempt, SYNC_RETRY_MS);
      } else {
        syncTimeoutId = null;
      }
    }

    runAttempt();
  }

  async function hydrateAttributionFromCheckoutSession() {
    const supabase = getSupabase();
    if (
      !supabase ||
      !window.AXIOM_CHECKOUT_SESSION ||
      typeof window.AXIOM_CHECKOUT_SESSION.ensureSession !== "function"
    ) {
      return null;
    }

    try {
      const sessionId = await window.AXIOM_CHECKOUT_SESSION.ensureSession();
      if (!sessionId) return null;

      let checkoutRow = null;

      try {
        if (typeof window.AXIOM_CHECKOUT_SESSION.getSession === "function") {
          checkoutRow = await window.AXIOM_CHECKOUT_SESSION.getSession(true);
        }
      } catch (error) {}

      if (!checkoutRow || !checkoutRow.id) {
        checkoutRow = await getLiveCheckoutRow(sessionId);
      }

      if (!checkoutRow) {
        return null;
      }

      const payload = buildAttributionFromCheckoutRow(checkoutRow);
      if (payload) {
        setStoredAttribution(payload);
        debug("Hydrated affiliate attribution from checkout session:", sessionId, payload);
        return payload;
      }

      return null;
    } catch (error) {
      errorLog("Checkout session attribution hydrate crashed:", error);
      return null;
    }
  }

  function bindAffiliateTrackingListeners() {
    if (window.__axiomAffiliateTrackingBound) {
      return;
    }

    window.__axiomAffiliateTrackingBound = true;

    window.addEventListener("storage", function () {
      syncAttributionIntoCheckoutSession().catch(function (error) {
        errorLog("Storage-triggered affiliate sync failed:", error);
      });
    });

    window.addEventListener("pageshow", function () {
      hydrateAttributionFromCheckoutSession()
        .catch(function (error) {
          errorLog("Pageshow checkout attribution hydrate failed:", error);
        })
        .finally(function () {
          syncAttributionIntoCheckoutSession().catch(function (error) {
            errorLog("Pageshow affiliate sync failed:", error);
          });

          processPendingConversionIfNeeded().catch(function (error) {
            errorLog("Pageshow pending affiliate conversion sync failed:", error);
          });
        });
    });

    window.addEventListener("axiom-cart-updated", function () {
      syncAttributionIntoCheckoutSession().catch(function (error) {
        errorLog("Cart-updated affiliate sync failed:", error);
      });
    });

    window.addEventListener("axiom-discount-updated", function (event) {
      const code =
        event && event.detail && event.detail.code
          ? normalizeCode(event.detail.code || "")
          : "";

      if (!code) return;

      syncDiscountCodeIntoAffiliateAttribution(code).catch(function (error) {
        errorLog("Discount-updated affiliate sync failed:", error);
      });
    });

    window.addEventListener("axiom-order-created", function (event) {
      const orderId = event && event.detail ? event.detail.orderId : null;
      if (!orderId) return;

      setPendingConversionOrderId(orderId);

      syncConversionForOrder(orderId).catch(function (error) {
        errorLog("Order-created affiliate conversion sync failed:", error);
      });
    });

    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "visible") {
        hydrateAttributionFromCheckoutSession()
          .catch(function (error) {
            errorLog("Visibility checkout attribution hydrate failed:", error);
          })
          .finally(function () {
            syncAttributionIntoCheckoutSession().catch(function (error) {
              errorLog("Visibility affiliate sync failed:", error);
            });

            processPendingConversionIfNeeded().catch(function (error) {
              errorLog("Visibility pending affiliate conversion sync failed:", error);
            });
          });
      }
    });
  }

  async function initAffiliateTracking() {
    if (booted) {
      return;
    }

    const supabase = await waitForSupabase(60, 150);

    if (!supabase) {
      warn("Affiliate tracking skipped: Supabase client is not available.");
      return;
    }

    booted = true;

    try {
      getVisitorId();

      const referralCode = getQueryParam("ref");

      if (referralCode) {
        await handleReferralCode(referralCode);
      } else {
        await restoreExistingAttribution();
      }

      await hydrateAttributionFromCheckoutSession();
      bindAffiliateTrackingListeners();
      await syncAttributionIntoCheckoutSession();
      await processPendingConversionIfNeeded();
      scheduleCheckoutAttributionSync();

      debug("Affiliate tracking initialized.");
    } catch (error) {
      errorLog("Affiliate tracking init failed:", error);
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
    processPendingConversionIfNeeded: processPendingConversionIfNeeded,
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
