Object.assign(window.AXIOM_AFFILIATE_DASHBOARD, {
  async loadAffiliateProfile() {
    const supabase = this.getSupabase();

    if (!supabase || !this.currentUser) {
      this.affiliateProfile = null;
      return null;
    }

    const authUserId = this.currentUser.id ? String(this.currentUser.id) : "";
    const authEmail = this.currentUser.email ? String(this.currentUser.email).trim().toLowerCase() : "";

    try {
      let profile = null;

      if (authUserId) {
        const byAuthUserId = await supabase
          .from("affiliates")
          .select("*")
          .eq("auth_user_id", authUserId)
          .maybeSingle();

        if (byAuthUserId.error) {
          console.error("[Affiliate Dashboard] loadAffiliateProfile by auth_user_id failed:", byAuthUserId.error);
        } else if (byAuthUserId.data) {
          profile = byAuthUserId.data;
        }
      }

      if (!profile && authEmail) {
        const byEmail = await supabase
          .from("affiliates")
          .select("*")
          .ilike("email", authEmail)
          .maybeSingle();

        if (byEmail.error) {
          console.error("[Affiliate Dashboard] loadAffiliateProfile by email failed:", byEmail.error);
        } else if (byEmail.data) {
          profile = byEmail.data;

          if (!profile.auth_user_id && authUserId) {
            const patchResult = await supabase
              .from("affiliates")
              .update({
                auth_user_id: authUserId,
                updated_at: new Date().toISOString()
              })
              .eq("id", profile.id)
              .select("*")
              .maybeSingle();

            if (patchResult.error) {
              console.error("[Affiliate Dashboard] Failed linking affiliate profile to auth user:", patchResult.error);
            } else if (patchResult.data) {
              profile = patchResult.data;
            }
          }
        }
      }

      this.affiliateProfile = profile || null;
      return this.affiliateProfile;
    } catch (error) {
      console.error("[Affiliate Dashboard] Failed loading affiliate profile:", error);
      this.affiliateProfile = null;
      return null;
    }
  },

  getDisplayCommissionRows(conversionRows, claimRows) {
    const rows = Array.isArray(conversionRows)
      ? conversionRows.map((row) => ({ ...row }))
      : [];

    const reservingClaims = (Array.isArray(claimRows) ? claimRows : [])
      .filter((claim) => {
        const status = String(claim.status || "").trim().toLowerCase();
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
      .filter((row) => String(row.commission_status || "").trim().toLowerCase() === "claimable")
      .sort((a, b) => {
        const aTime = new Date(a.claimable_at || a.created_at || 0).getTime();
        const bTime = new Date(b.claimable_at || b.created_at || 0).getTime();
        return aTime - bTime;
      });

    claimableRowsOrdered.forEach((row) => {
      row.display_status = "claimable";

      if (reservedAmount > 0) {
        row.display_status = "claimed";
        reservedAmount -= Number(row.commission_amount || 0);
      }
    });

    rows.forEach((row) => {
      if (!row.display_status) {
        row.display_status = String(row.commission_status || "").trim().toLowerCase();
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

    if (!supabase) {
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

    if (!this.affiliateProfile || !this.affiliateProfile.id) {
      await this.loadAffiliateProfile();
    }

    if (!this.affiliateProfile || !this.affiliateProfile.id) {
      console.error("[Affiliate Dashboard] No affiliate profile found for current user.");
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
      const affiliateId = String(this.affiliateProfile.id);

      const [
        clicksResult,
        conversionsResult,
        payoutsResult,
        claimsResult
      ] = await Promise.all([
        supabase
          .from("affiliate_clicks")
          .select("id", { count: "exact", head: true })
          .eq("affiliate_id", affiliateId),

        supabase
          .from("affiliate_conversions")
          .select(`
            id,
            affiliate_id,
            referral_code,
            affiliate_click_id,
            affiliate_referral_session_id,
            checkout_session_id,
            order_id,
            order_number,
            customer_email,
            subtotal,
            total_amount,
            discount_amount,
            commission_amount,
            commission_status,
            claimable_at,
            created_at,
            updated_at
          `)
          .eq("affiliate_id", affiliateId)
          .order("created_at", { ascending: false }),

        supabase
          .from("affiliate_payouts")
          .select(`
            id,
            affiliate_id,
            amount,
            payout_method,
            payout_reference,
            notes,
            payout_status,
            created_at,
            updated_at,
            paid_at
          `)
          .eq("affiliate_id", affiliateId)
          .order("paid_at", { ascending: false })
          .order("created_at", { ascending: false }),

        supabase
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
            payout_method,
            payout_address,
            payout_network,
            payout_contact
          `)
          .eq("affiliate_id", affiliateId)
          .order("created_at", { ascending: false })
      ]);

      if (clicksResult.error) throw clicksResult.error;
      if (conversionsResult.error) throw conversionsResult.error;
      if (payoutsResult.error) throw payoutsResult.error;
      if (claimsResult.error) throw claimsResult.error;

      const clicks = Number(clicksResult.count || 0);
      const conversionRows = Array.isArray(conversionsResult.data) ? conversionsResult.data : [];
      const payoutRows = Array.isArray(payoutsResult.data) ? payoutsResult.data : [];
      const claimRows = Array.isArray(claimsResult.data) ? claimsResult.data : [];

      const pendingClaims = claimRows
        .filter((item) => String(item.status || "").trim().toLowerCase() === "pending")
        .reduce((sum, item) => sum + Number(item.amount || 0), 0);

      const approvedClaims = claimRows
        .filter((item) => String(item.status || "").trim().toLowerCase() === "approved")
        .reduce((sum, item) => sum + Number(item.amount || 0), 0);

      const rejectedClaims = claimRows
        .filter((item) => String(item.status || "").trim().toLowerCase() === "rejected")
        .reduce((sum, item) => sum + Number(item.amount || 0), 0);

      const paid = payoutRows
        .filter((item) => String(item.payout_status || "").trim().toLowerCase() === "paid")
        .reduce((sum, item) => sum + Number(item.amount || 0), 0);

      const displayConversionRows = this.getDisplayCommissionRows(conversionRows, claimRows);

      const availableToClaim = displayConversionRows
        .filter((item) => {
          return String(item.display_status || item.commission_status || "").trim().toLowerCase() === "claimable";
        })
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
