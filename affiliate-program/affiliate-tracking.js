(function () {
  const STORAGE_KEY = "axiom_affiliate_attribution";
  const SESSION_STORAGE_KEY = "axiom_affiliate_attribution_session";
  const VISITOR_KEY = "axiom_visitor_id";
  const VISITOR_SESSION_KEY = "axiom_visitor_id_session";
  const ATTR_COOKIE_KEY = "axiom_affiliate_attribution";
  const VISITOR_COOKIE_KEY = "axiom_visitor_id";
  const SESSION_TTL_DAYS = 30;

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

    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    if (isExpired(parsed.captured_at)) {
      clearStoredAttribution();
      return null;
    }

    return parsed;
  }

  function setStoredAttribution(data) {
    const payload = Object.assign({}, data || {});

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
  }

  function updateStoredAttributionPageData() {
    const existing = getStoredAttribution();
    if (!existing) return null;

    const nextPayload = Object.assign({}, existing, {
      current_page: getCurrentUrl(),
      referrer: getReferrer()
    });

    setStoredAttribution(nextPayload);
    window.AXIOM_AFFILIATE_ATTRIBUTION = nextPayload;

    return nextPayload;
  }

  function buildAttributionPayload(args) {
    return {
      affiliate_id: args.affiliate_id || null,
      affiliate_code: args.affiliate_code || "",
      affiliate_click_id: args.affiliate_click_id || null,
      affiliate_referral_session_id: args.affiliate_referral_session_id || null,
      landing_page: args.landing_page || getCurrentUrl(),
      current_page: getCurrentUrl(),
      referrer: getReferrer(),
      visitor_id: args.visitor_id || getVisitorId(),
      captured_at: args.captured_at || getNowIso()
    };
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
      const refreshedPayload = Object.assign({}, existing, {
        current_page: getCurrentUrl(),
        referrer: getReferrer(),
        visitor_id: visitorId
      });

      setStoredAttribution(refreshedPayload);
      window.AXIOM_AFFILIATE_ATTRIBUTION = refreshedPayload;
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
      visitor_id: visitorId
    });

    setStoredAttribution(payload);
    window.AXIOM_AFFILIATE_ATTRIBUTION = payload;
    maybeStripReferralParamFromUrl();
  }

  async function restoreExistingAttribution() {
    const existing = updateStoredAttributionPageData();
    if (!existing) return;

    window.AXIOM_AFFILIATE_ATTRIBUTION = existing;
    await refreshTrackedSession(existing);
  }

  function getAttributionForCheckout() {
    const stored = getStoredAttribution();
    if (!stored) return null;

    return {
      affiliate_id: stored.affiliate_id || null,
      affiliate_code: stored.affiliate_code || "",
      affiliate_click_id: stored.affiliate_click_id || null,
      affiliate_referral_session_id: stored.affiliate_referral_session_id || null,
      affiliate_landing_page: stored.landing_page || "",
      visitor_id: stored.visitor_id || getVisitorId()
    };
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
