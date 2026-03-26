(function () {
  function getSupabase() {
    if (!window.axiomSupabase) {
      throw new Error("axiomSupabase is not available.");
    }

    return window.axiomSupabase;
  }

  async function fetchAffiliates() {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from("affiliate_admin_summary")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return Array.isArray(data) ? data : [];
  }

  async function fetchPayoutRequests() {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from("affiliate_claim_requests")
      .select(`
        id,
        affiliate_id,
        amount,
        message,
        discord_contact,
        status,
        created_at,
        updated_at,
        affiliates (
          id,
          email,
          full_name,
          referral_code,
          status
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return Array.isArray(data) ? data : [];
  }

  async function updateAffiliateStatus(affiliateId, status) {
    const supabase = getSupabase();

    if (!affiliateId) {
      throw new Error("Missing affiliate id.");
    }

    const normalizedStatus = String(status || "").trim().toLowerCase();

    if (!normalizedStatus) {
      throw new Error("Missing affiliate status.");
    }

    const { error } = await supabase.rpc("admin_update_affiliate_status", {
      p_affiliate_id: affiliateId,
      p_status: normalizedStatus
    });

    if (error) {
      throw error;
    }

    return true;
  }

  async function fetchAffiliateDetails(affiliateId) {
    const supabase = getSupabase();

    if (!affiliateId) {
      throw new Error("Missing affiliate id.");
    }

    const [conversionsResult, claimsResult, payoutsResult] = await Promise.all([
      supabase
        .from("affiliate_conversions")
        .select("*")
        .eq("affiliate_id", affiliateId)
        .order("created_at", { ascending: false })
        .limit(25),

      supabase
        .from("affiliate_claim_requests")
        .select("*")
        .eq("affiliate_id", affiliateId)
        .order("created_at", { ascending: false })
        .limit(25),

      supabase
        .from("affiliate_payouts")
        .select("*")
        .eq("affiliate_id", affiliateId)
        .order("created_at", { ascending: false })
        .limit(25)
    ]);

    if (conversionsResult.error) throw conversionsResult.error;
    if (claimsResult.error) throw claimsResult.error;
    if (payoutsResult.error) throw payoutsResult.error;

    return {
      conversions: Array.isArray(conversionsResult.data) ? conversionsResult.data : [],
      claims: Array.isArray(claimsResult.data) ? claimsResult.data : [],
      payouts: Array.isArray(payoutsResult.data) ? payoutsResult.data : []
    };
  }

  async function updateClaimStatus(claimId, status) {
    const supabase = getSupabase();

    if (!claimId) {
      throw new Error("Missing claim request id.");
    }

    const normalizedStatus = String(status || "").trim().toLowerCase();

    if (!normalizedStatus) {
      throw new Error("Missing claim status.");
    }

    const mappedStatus = normalizedStatus === "denied" ? "rejected" : normalizedStatus;

    const { error } = await supabase.rpc("admin_update_affiliate_claim_status", {
      p_claim_request_id: claimId,
      p_status: mappedStatus
    });

    if (error) {
      throw error;
    }

    return true;
  }

  async function markClaimPaid(claimId, options = {}) {
    const supabase = getSupabase();

    if (!claimId) {
      throw new Error("Missing claim request id.");
    }

    const payoutMethod = options.method || "manual";
    const payoutReference = options.reference || null;
    const payoutNotes = options.notes || null;

    const { data: claimRow, error: claimError } = await supabase
      .from("affiliate_claim_requests")
      .select("*")
      .eq("id", claimId)
      .maybeSingle();

    if (claimError) {
      throw claimError;
    }

    if (!claimRow) {
      throw new Error("Claim request not found.");
    }

    const currentStatus = String(claimRow.status || "").trim().toLowerCase();

    if (currentStatus === "paid") {
      return true;
    }

    const { error: rpcError } = await supabase.rpc("admin_mark_affiliate_claim_paid", {
      p_claim_request_id: claimId,
      p_payout_method: payoutMethod,
      p_payout_reference: payoutReference,
      p_notes: payoutNotes
    });

    if (rpcError) {
      throw rpcError;
    }

    return true;
  }

  async function recordPayout(payload) {
    const supabase = getSupabase();

    const affiliateId = payload?.affiliateId || null;
    const amount = Number(payload?.amount || 0);
    const method = payload?.method || null;
    const reference = payload?.reference || null;
    const notes = payload?.notes || null;

    if (!affiliateId) {
      throw new Error("Missing affiliate id.");
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("Enter a valid payout amount.");
    }

    const { error } = await supabase.rpc("admin_record_affiliate_payout", {
      p_affiliate_id: affiliateId,
      p_amount: amount,
      p_payout_method: method,
      p_payout_reference: reference,
      p_notes: notes
    });

    if (error) {
      throw error;
    }

    return true;
  }

  async function updateAffiliateReferralCode(affiliateId, newCode) {
    const supabase = getSupabase();

    const cleanCode = String(newCode || "").trim().toUpperCase();

    if (!affiliateId) {
      throw new Error("Missing affiliate id.");
    }

    if (!cleanCode) {
      throw new Error("Referral code is required.");
    }

    const { data, error } = await supabase.rpc("admin_update_affiliate_referral_code", {
      p_affiliate_id: affiliateId,
      p_new_referral_code: cleanCode
    });

    if (error) {
      throw error;
    }

    return Array.isArray(data) && data.length ? data[0] : true;
  }

  window.AXIOM_ADMIN_AFFILIATES_DATA = {
    fetchAffiliates: fetchAffiliates,
    fetchPayoutRequests: fetchPayoutRequests,
    updateAffiliateStatus: updateAffiliateStatus,
    fetchAffiliateDetails: fetchAffiliateDetails,
    updateClaimStatus: updateClaimStatus,
    markClaimPaid: markClaimPaid,
    recordPayout: recordPayout,
    updateAffiliateReferralCode: updateAffiliateReferralCode
  };
})();
