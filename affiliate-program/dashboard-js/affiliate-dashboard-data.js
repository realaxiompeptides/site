Object.assign(window.AXIOM_AFFILIATE_DASHBOARD, {
  getDisplayCommissionRows(conversionRows, claimRows) {
    const rows = Array.isArray(conversionRows)
      ? conversionRows.map((row) => ({ ...row }))
      : [];

    const reservingClaims = (Array.isArray(claimRows) ? claimRows : [])
      .filter((claim) => {
        const status = String(claim.status || "").toLowerCase();
        return status === "pending" || status === "approved";
      })
      .sort((a, b) => {
        const aTime = new Date(a.created_at || 0).getTime();
        const bTime = new Date(b.created_at || 0).getTime();
        return aTime - bTime;
      });

    let reservedAmount = reservingClaims.reduce((sum, claim) => {
      return sum + Number(claim.amount || 0);
    }, 0);

    const claimableRowsOrdered = rows
      .filter((row) => String(row.commission_status || "").toLowerCase() === "claimable")
      .sort((a, b) => {
        const aTime = new Date(a.claimable_at || a.created_at || 0).getTime();
        const bTime = new Date(b.claimable_at || b.created_at || 0).getTime();
        return aTime - bTime;
      });

    claimableRowsOrdered.forEach((row) => {
      row.display_status = String(row.commission_status || "").toLowerCase();

      if (reservedAmount > 0) {
        row.display_status = "claimed";
        reservedAmount -= Number(row.commission_amount || 0);
      }
    });

    rows.forEach((row) => {
      if (!row.display_status) {
        row.display_status = String(row.commission_status || "").toLowerCase();
      }
    });

    return rows.sort((a, b) => {
      const aTime = new Date(a.created_at || 0).getTime();
      const bTime = new Date(b.created_at || 0).getTime();
      return bTime - aTime;
    });
  },

  async fetchStats() {
    const supabase = this.getSupabase();

    if (!supabase || !this.affiliateProfile || !this.affiliateProfile.id) {
      return {
        clicks: 0,
        conversions: 0,
        claimable: 0,
        pendingClaims: 0,
        approvedClaims: 0,
        rejectedClaims: 0,
        availableToClaim: 0,
        paid: 0,
        recentCommissions: [],
        payouts: [],
        claims: []
      };
    }

    try {
      const affiliateId = this.affiliateProfile.id;

      const results = await Promise.all([
        supabase
          .from("affiliate_clicks")
          .select("id", { count: "exact", head: true })
          .eq("affiliate_id", affiliateId),

        supabase
          .from("affiliate_conversions")
          .select("*")
          .eq("affiliate_id", affiliateId)
          .order("created_at", { ascending: false }),

        supabase
          .from("affiliate_payouts")
          .select("*")
          .eq("affiliate_id", affiliateId)
          .order("paid_at", { ascending: false })
          .order("created_at", { ascending: false }),

        supabase
          .from("affiliate_claim_requests")
          .select("*")
          .eq("affiliate_id", affiliateId)
          .order("created_at", { ascending: false })
      ]);

      const clicksResult = results[0];
      const conversionsResult = results[1];
      const payoutsResult = results[2];
      const claimsResult = results[3];

      if (clicksResult.error) throw clicksResult.error;
      if (conversionsResult.error) throw conversionsResult.error;
      if (payoutsResult.error) throw payoutsResult.error;
      if (claimsResult.error) throw claimsResult.error;

      const clicks = Number(clicksResult.count || 0);
      const conversionRows = Array.isArray(conversionsResult.data) ? conversionsResult.data : [];
      const payoutRows = Array.isArray(payoutsResult.data) ? payoutsResult.data : [];
      const claimRows = Array.isArray(claimsResult.data) ? claimsResult.data : [];

      const pendingClaims = claimRows
        .filter((item) => {
          const status = String(item.status || "").toLowerCase();
          return status === "pending" || status === "approved";
        })
        .reduce((sum, item) => sum + Number(item.amount || 0), 0);

      const approvedClaims = claimRows
        .filter((item) => String(item.status || "").toLowerCase() === "approved")
        .reduce((sum, item) => sum + Number(item.amount || 0), 0);

      const rejectedClaims = claimRows
        .filter((item) => String(item.status || "").toLowerCase() === "rejected")
        .reduce((sum, item) => sum + Number(item.amount || 0), 0);

      const paid = payoutRows
        .filter((item) => String(item.payout_status || "").toLowerCase() === "paid")
        .reduce((sum, item) => sum + Number(item.amount || 0), 0);

      const displayConversionRows = this.getDisplayCommissionRows(conversionRows, claimRows);

      const availableToClaim = displayConversionRows
        .filter((item) => String(item.display_status || item.commission_status || "").toLowerCase() === "claimable")
        .reduce((sum, item) => sum + Number(item.commission_amount || 0), 0);

      return {
        clicks: clicks,
        conversions: conversionRows.length,
        claimable: availableToClaim,
        pendingClaims: pendingClaims,
        approvedClaims: approvedClaims,
        rejectedClaims: rejectedClaims,
        availableToClaim: availableToClaim,
        paid: paid,
        recentCommissions: displayConversionRows.slice(0, 6),
        payouts: payoutRows.slice(0, 20),
        claims: claimRows.slice(0, 20)
      };
    } catch (error) {
      console.error("[Affiliate Dashboard] Fetch stats failed:", error);
      return {
        clicks: 0,
        conversions: 0,
        claimable: 0,
        pendingClaims: 0,
        approvedClaims: 0,
        rejectedClaims: 0,
        availableToClaim: 0,
        paid: 0,
        recentCommissions: [],
        payouts: [],
        claims: []
      };
    }
  }
});
