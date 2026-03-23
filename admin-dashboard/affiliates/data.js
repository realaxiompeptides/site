(function () {
  async function fetchAffiliates() {
    if (!window.axiomSupabase) {
      throw new Error("axiomSupabase is not available.");
    }

    const { data, error } = await window.axiomSupabase
      .from("affiliate_admin_summary")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return Array.isArray(data) ? data : [];
  }

  async function updateAffiliateStatus(affiliateId, status) {
    if (!window.axiomSupabase) {
      throw new Error("axiomSupabase is not available.");
    }

    const { error } = await window.axiomSupabase.rpc("admin_update_affiliate_status", {
      p_affiliate_id: affiliateId,
      p_status: status
    });

    if (error) {
      throw error;
    }

    return true;
  }

  async function fetchAffiliateDetails(affiliateId) {
    if (!window.axiomSupabase) {
      throw new Error("axiomSupabase is not available.");
    }

    const [conversionsResult, claimsResult, payoutsResult] = await Promise.all([
      window.axiomSupabase
        .from("affiliate_conversions")
        .select("*")
        .eq("affiliate_id", affiliateId)
        .order("created_at", { ascending: false })
        .limit(10),

      window.axiomSupabase
        .from("affiliate_claim_requests")
        .select("*")
        .eq("affiliate_id", affiliateId)
        .order("created_at", { ascending: false })
        .limit(10),

      window.axiomSupabase
        .from("affiliate_payouts")
        .select("*")
        .eq("affiliate_id", affiliateId)
        .order("created_at", { ascending: false })
        .limit(10)
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
    if (!window.axiomSupabase) {
      throw new Error("axiomSupabase is not available.");
    }

    const { error } = await window.axiomSupabase.rpc("admin_update_affiliate_claim_status", {
      p_claim_request_id: claimId,
      p_status: status
    });

    if (error) {
      throw error;
    }

    return true;
  }

  async function recordPayout(payload) {
    if (!window.axiomSupabase) {
      throw new Error("axiomSupabase is not available.");
    }

    const { error } = await window.axiomSupabase.rpc("admin_record_affiliate_payout", {
      p_affiliate_id: payload.affiliateId,
      p_amount: payload.amount,
      p_payout_method: payload.method || null,
      p_payout_reference: payload.reference || null,
      p_notes: payload.notes || null
    });

    if (error) {
      throw error;
    }

    return true;
  }

  window.AXIOM_ADMIN_AFFILIATES_DATA = {
    fetchAffiliates: fetchAffiliates,
    updateAffiliateStatus: updateAffiliateStatus,
    fetchAffiliateDetails: fetchAffiliateDetails,
    updateClaimStatus: updateClaimStatus,
    recordPayout: recordPayout
  };
})();
