(function () {
  function getSupabase() {
    if (!window.axiomSupabase) {
      throw new Error("axiomSupabase is not available.");
    }

    return window.axiomSupabase;
  }

  function toNumber(value, fallback = 0) {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
  }

  function normalizeText(value) {
    if (value == null) return null;
    const clean = String(value).trim();
    return clean ? clean : null;
  }

  function normalizeStatus(value, fallback = "") {
    const clean = String(value || "").trim().toLowerCase();
    return clean || fallback;
  }

  function buildPayoutReference(claimRow, options = {}) {
    return (
      normalizeText(options.reference) ||
      normalizeText(claimRow && claimRow.payout_address) ||
      (claimRow && claimRow.id ? "claim:" + String(claimRow.id) : null)
    );
  }

  function buildPayoutNotes(claimRow, options = {}) {
    const notesParts = [];

    const manualNotes = normalizeText(options.notes);
    const claimMessage = normalizeText(claimRow && claimRow.message);
    const payoutNetwork = normalizeText(claimRow && claimRow.payout_network);
    const payoutContact = normalizeText(
      (claimRow && claimRow.payout_contact) ||
      (claimRow && claimRow.backup_contact)
    );
    const discordContact = normalizeText(claimRow && claimRow.discord_contact);

    if (claimRow && claimRow.id) {
      notesParts.push("Claim ID: " + String(claimRow.id));
    }

    if (manualNotes) {
      notesParts.push(manualNotes);
    }

    if (claimMessage) {
      notesParts.push("Claim note: " + claimMessage);
    }

    if (payoutNetwork) {
      notesParts.push("Network: " + payoutNetwork);
    }

    if (payoutContact) {
      notesParts.push("Contact: " + payoutContact);
    }

    if (discordContact) {
      notesParts.push("Discord: " + discordContact);
    }

    return notesParts.length ? notesParts.join(" | ") : null;
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
        payout_method,
        payout_network,
        payout_address,
        payout_contact,
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

    const normalizedStatus = normalizeStatus(status, "");
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

    const normalizedStatus = normalizeStatus(status, "");
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

  async function ensurePayoutRowExists(supabase, claimRow, options = {}) {
    if (!claimRow || !claimRow.affiliate_id) {
      throw new Error("Claim row is missing affiliate information.");
    }

    const payoutMethod =
      normalizeText(options.method) ||
      normalizeText(claimRow.payout_method) ||
      "manual";

    const payoutReference = buildPayoutReference(claimRow, options);
    const payoutNotes = buildPayoutNotes(claimRow, options);

    let existingQuery = supabase
      .from("affiliate_payouts")
      .select("*")
      .eq("affiliate_id", claimRow.affiliate_id)
      .eq("amount", claimRow.amount)
      .order("created_at", { ascending: false })
      .limit(1);

    if (payoutReference) {
      existingQuery = existingQuery.eq("payout_reference", payoutReference);
    }

    const existingPayoutResult = await existingQuery;

    if (existingPayoutResult.error) {
      throw existingPayoutResult.error;
    }

    const existingRow =
      Array.isArray(existingPayoutResult.data) && existingPayoutResult.data.length
        ? existingPayoutResult.data[0]
        : null;

    if (existingRow) {
      if (String(existingRow.payout_status || "").trim().toLowerCase() !== "paid") {
        const { error: updateExistingError } = await supabase
          .from("affiliate_payouts")
          .update({
            payout_method: payoutMethod,
            payout_reference: payoutReference,
            notes: payoutNotes,
            payout_status: "paid",
            paid_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq("id", existingRow.id);

        if (updateExistingError) {
          throw updateExistingError;
        }
      }

      return true;
    }

    const { error: insertPayoutError } = await supabase
      .from("affiliate_payouts")
      .insert({
        affiliate_id: claimRow.affiliate_id,
        amount: claimRow.amount,
        payout_method: payoutMethod,
        payout_reference: payoutReference,
        notes: payoutNotes,
        payout_status: "paid",
        paid_at: new Date().toISOString()
      });

    if (insertPayoutError) {
      throw insertPayoutError;
    }

    return true;
  }

  async function markConversionsPaidForClaim(supabase, claimRow) {
    const targetAmount = toNumber(claimRow && claimRow.amount, 0);

    if (!claimRow || !claimRow.affiliate_id || targetAmount <= 0) {
      return true;
    }

    const conversionsResult = await supabase
      .from("affiliate_conversions")
      .select("id, commission_amount, commission_status, created_at")
      .eq("affiliate_id", claimRow.affiliate_id)
      .in("commission_status", ["claimable", "claimed"])
      .order("created_at", { ascending: true });

    if (conversionsResult.error) {
      throw conversionsResult.error;
    }

    const rows = Array.isArray(conversionsResult.data) ? conversionsResult.data : [];
    if (!rows.length) {
      return true;
    }

    let remaining = targetAmount;
    const idsToUpdate = [];

    rows.forEach(function (row) {
      const amount = toNumber(row.commission_amount, 0);

      if (amount <= 0) return;
      if (remaining + 0.005 >= amount) {
        idsToUpdate.push(row.id);
        remaining -= amount;
      }
    });

    if (!idsToUpdate.length) {
      return true;
    }

    const { error: updateConversionsError } = await supabase
      .from("affiliate_conversions")
      .update({
        commission_status: "paid",
        updated_at: new Date().toISOString()
      })
      .in("id", idsToUpdate);

    if (updateConversionsError) {
      throw updateConversionsError;
    }

    return true;
  }

  async function revertConversionsFromPaidForClaim(supabase, claimRow, fallbackStatus = "claimed") {
    const targetAmount = toNumber(claimRow && claimRow.amount, 0);

    if (!claimRow || !claimRow.affiliate_id || targetAmount <= 0) {
      return true;
    }

    const conversionsResult = await supabase
      .from("affiliate_conversions")
      .select("id, commission_amount, commission_status, created_at")
      .eq("affiliate_id", claimRow.affiliate_id)
      .eq("commission_status", "paid")
      .order("created_at", { ascending: false });

    if (conversionsResult.error) {
      throw conversionsResult.error;
    }

    const rows = Array.isArray(conversionsResult.data) ? conversionsResult.data : [];
    if (!rows.length) {
      return true;
    }

    let remaining = targetAmount;
    const idsToUpdate = [];

    rows.forEach(function (row) {
      const amount = toNumber(row.commission_amount, 0);

      if (amount <= 0) return;
      if (remaining + 0.005 >= amount) {
        idsToUpdate.push(row.id);
        remaining -= amount;
      }
    });

    if (!idsToUpdate.length) {
      return true;
    }

    const { error: updateConversionsError } = await supabase
      .from("affiliate_conversions")
      .update({
        commission_status: fallbackStatus,
        updated_at: new Date().toISOString()
      })
      .in("id", idsToUpdate);

    if (updateConversionsError) {
      throw updateConversionsError;
    }

    return true;
  }

  async function markClaimPaid(claimId, options = {}) {
    const supabase = getSupabase();

    if (!claimId) {
      throw new Error("Missing claim request id.");
    }

    const payoutMethod = normalizeText(options.method) || "manual";
    const payoutReference = normalizeText(options.reference);
    const payoutNotes = normalizeText(options.notes);

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

    const currentStatus = normalizeStatus(claimRow.status, "pending");

    if (currentStatus === "paid") {
      await ensurePayoutRowExists(supabase, claimRow, {
        method: payoutMethod,
        reference: payoutReference,
        notes: payoutNotes
      });
      await markConversionsPaidForClaim(supabase, claimRow);
      return true;
    }

    try {
      const { error: rpcError } = await supabase.rpc("admin_mark_affiliate_claim_paid", {
        p_claim_request_id: claimId,
        p_payout_method: payoutMethod,
        p_payout_reference: payoutReference,
        p_notes: payoutNotes
      });

      if (!rpcError) {
        const { data: refreshedClaim, error: refreshedClaimError } = await supabase
          .from("affiliate_claim_requests")
          .select("*")
          .eq("id", claimId)
          .maybeSingle();

        if (refreshedClaimError) {
          throw refreshedClaimError;
        }

        await ensurePayoutRowExists(supabase, refreshedClaim || claimRow, {
          method: payoutMethod,
          reference: payoutReference,
          notes: payoutNotes
        });

        await markConversionsPaidForClaim(supabase, refreshedClaim || claimRow);
        return true;
      }

      console.error("admin_mark_affiliate_claim_paid RPC failed, using fallback:", rpcError);
    } catch (rpcException) {
      console.error("admin_mark_affiliate_claim_paid RPC exception, using fallback:", rpcException);
    }

    const { error: updateClaimError } = await supabase
      .from("affiliate_claim_requests")
      .update({
        status: "paid",
        updated_at: new Date().toISOString()
      })
      .eq("id", claimId);

    if (updateClaimError) {
      throw updateClaimError;
    }

    const paidClaimRow = Object.assign({}, claimRow, {
      status: "paid",
      updated_at: new Date().toISOString()
    });

    await ensurePayoutRowExists(supabase, paidClaimRow, {
      method: payoutMethod,
      reference: payoutReference,
      notes: payoutNotes
    });

    await markConversionsPaidForClaim(supabase, paidClaimRow);

    return true;
  }

  async function markClaimUnpaid(claimId, options = {}) {
    const supabase = getSupabase();

    if (!claimId) {
      throw new Error("Missing claim request id.");
    }

    const revertToStatus = normalizeStatus(options.revertToStatus, "approved");

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

    const payoutReference = buildPayoutReference(claimRow, options);

    const { error: updateClaimError } = await supabase
      .from("affiliate_claim_requests")
      .update({
        status: revertToStatus,
        updated_at: new Date().toISOString()
      })
      .eq("id", claimId);

    if (updateClaimError) {
      throw updateClaimError;
    }

    let payoutQuery = supabase
      .from("affiliate_payouts")
      .update({
        payout_status: "cancelled",
        updated_at: new Date().toISOString()
      })
      .eq("affiliate_id", claimRow.affiliate_id)
      .eq("amount", claimRow.amount);

    if (payoutReference) {
      payoutQuery = payoutQuery.eq("payout_reference", payoutReference);
    }

    const { error: payoutUpdateError } = await payoutQuery;

    if (payoutUpdateError) {
      throw payoutUpdateError;
    }

    await revertConversionsFromPaidForClaim(supabase, claimRow, "claimed");

    return true;
  }

  async function recordPayout(payload) {
    const supabase = getSupabase();

    const affiliateId = payload && payload.affiliateId ? payload.affiliateId : null;
    const amount = toNumber(payload && payload.amount, 0);
    const method = normalizeText(payload && payload.method);
    const reference = normalizeText(payload && payload.reference);
    const notes = normalizeText(payload && payload.notes);

    if (!affiliateId) {
      throw new Error("Missing affiliate id.");
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("Enter a valid payout amount.");
    }

    try {
      const { error } = await supabase.rpc("admin_record_affiliate_payout", {
        p_affiliate_id: affiliateId,
        p_amount: amount,
        p_payout_method: method,
        p_payout_reference: reference,
        p_notes: notes
      });

      if (!error) {
        return true;
      }

      console.error("admin_record_affiliate_payout RPC failed, using fallback:", error);
    } catch (rpcException) {
      console.error("admin_record_affiliate_payout RPC exception, using fallback:", rpcException);
    }

    const { error: insertError } = await supabase
      .from("affiliate_payouts")
      .insert({
        affiliate_id: affiliateId,
        amount: amount,
        payout_method: method,
        payout_reference: reference,
        notes: notes,
        payout_status: "paid",
        paid_at: new Date().toISOString()
      });

    if (insertError) {
      throw insertError;
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
    markClaimUnpaid: markClaimUnpaid,
    recordPayout: recordPayout,
    updateAffiliateReferralCode: updateAffiliateReferralCode
  };
})();
