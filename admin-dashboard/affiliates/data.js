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
        *,
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

    const { error } = await supabase.rpc("admin_update_affiliate_status", {
      p_affiliate_id: affiliateId,
      p_status: status
    });

    if (error) {
      throw error;
    }

    return true;
  }

  async function fetchAffiliateDetails(affiliateId) {
    const supabase = getSupabase();

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

    const normalizedStatus = String(status || "").trim().toLowerCase();

    if (!claimId) {
      throw new Error("Missing claim request id.");
    }

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

  async function markClaimPaid(claimId) {
    const supabase = getSupabase();

    if (!claimId) {
      throw new Error("Missing claim request id.");
    }

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

    const normalizedCurrentStatus = String(claimRow.status || "").trim().toLowerCase();

    if (normalizedCurrentStatus === "paid") {
      return true;
    }

    if (typeof window.axiomSupabase.rpc === "function") {
      try {
        const { error: rpcError } = await supabase.rpc("admin_update_affiliate_claim_status", {
          p_claim_request_id: claimId,
          p_status: "paid"
        });

        if (!rpcError) {
          return true;
        }

        console.error("admin_update_affiliate_claim_status paid RPC failed, falling back to direct update:", rpcError);
      } catch (rpcFallbackError) {
        console.error("markClaimPaid RPC fallback error:", rpcFallbackError);
      }
    }

    const { error: updateError } = await supabase
      .from("affiliate_claim_requests")
      .update({
        status: "paid",
        updated_at: new Date().toISOString()
      })
      .eq("id", claimId);

    if (updateError) {
      throw updateError;
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
