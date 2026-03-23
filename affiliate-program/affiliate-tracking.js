(function () {
  const STORAGE_KEY = "axiom_affiliate_attribution";
  const VISITOR_KEY = "axiom_visitor_id";
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

  function getVisitorId() {
    try {
      let visitorId = localStorage.getItem(VISITOR_KEY);

      if (!visitorId) {
        visitorId = generateUuidLike();
        localStorage.setItem(VISITOR_KEY, visitorId);
      }

      return visitorId;
    } catch (error) {
      console.error("Failed to get visitor id:", error);
      return generateUuidLike();
    }
  }

  function getCurrentUrl() {
    return window.location.pathname + window.location.search;
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

  function getStoredAttribution() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;

      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return null;

      if (!parsed.captured_at) return parsed;

      const capturedAt = new Date(parsed.captured_at).getTime();
      if (Number.isNaN(capturedAt)) return parsed;

      const ageMs = Date.now() - capturedAt;
      const maxAgeMs = SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;

      if (ageMs > maxAgeMs) {
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }

      return parsed;
    } catch (error) {
      console.error("Failed to read affiliate attribution:", error);
      return null;
    }
  }

  function setStoredAttribution(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error("Failed to store affiliate attribution:", error);
    }
  }

  function getQueryParam(name) {
    const params = new URLSearchParams(window.location.search);
    return (params.get(name) || "").trim();
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
      captured_at: new Date().toISOString()
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

    const insertResult = await supabase
      .from("affiliate_clicks")
      .insert({
        affiliate_id: affiliate.id,
        referral_code: affiliate.referral_code,
        visitor_id: visitorId,
        landing_page: getCurrentUrl(),
        current_page: getCurrentUrl(),
        referrer: getReferrer(),
        user_agent: getUserAgent()
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
          updated_at: new Date().toISOString()
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
        updated_at: new Date().toISOString()
      })
      .eq("id", attribution.affiliate_referral_session_id);

    if (result.error) {
      console.error("Failed updating affiliate referral session:", result.error);
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
  }

  async function restoreExistingAttribution() {
    const existing = getStoredAttribution();
    if (!existing) return;

    window.AXIOM_AFFILIATE_ATTRIBUTION = existing;
    await refreshTrackedSession(existing);
  }

  async function initAffiliateTracking() {
    const supabase = getSupabase();

    if (!supabase) {
      console.warn("Affiliate tracking skipped: axiomSupabase is not available.");
      return;
    }

    try {
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
    getVisitorId: getVisitorId,
    storageKey: STORAGE_KEY
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      initAffiliateTracking();
    }, { once: true });
  } else {
    initAffiliateTracking();
  }
})();
