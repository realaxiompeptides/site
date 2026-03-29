Object.assign(window.AXIOM_AFFILIATE_DASHBOARD, {
  async loadAffiliateProfile() {
    const supabase = this.getSupabase();

    if (!supabase || !this.currentUser) {
      this.affiliateProfile = null;
      this.affiliateProfileIds = [];
      return null;
    }

    const authUserId = this.currentUser.id ? String(this.currentUser.id).trim() : "";
    const authEmail = this.currentUser.email
      ? String(this.currentUser.email).trim().toLowerCase()
      : "";

    try {
      const candidateProfiles = [];

      if (authUserId) {
        const byAuthUserId = await supabase
          .from("affiliates")
          .select("*")
          .eq("auth_user_id", authUserId);

        if (byAuthUserId.error) {
          console.error(
            "[Affiliate Dashboard] loadAffiliateProfile by auth_user_id failed:",
            byAuthUserId.error
          );
        } else if (Array.isArray(byAuthUserId.data)) {
          candidateProfiles.push(...byAuthUserId.data);
        }
      }

      if (authEmail) {
        const byEmail = await supabase
          .from("affiliates")
          .select("*")
          .ilike("email", authEmail);

        if (byEmail.error) {
          console.error(
            "[Affiliate Dashboard] loadAffiliateProfile by email failed:",
            byEmail.error
          );
        } else if (Array.isArray(byEmail.data)) {
          candidateProfiles.push(...byEmail.data);
        }
      }

      const dedupedProfiles = [];
      const seenIds = new Set();

      candidateProfiles.forEach((profile) => {
        const id = profile && profile.id ? String(profile.id) : "";
        if (!id || seenIds.has(id)) return;
        seenIds.add(id);
        dedupedProfiles.push(profile);
      });

      if (!dedupedProfiles.length) {
        this.affiliateProfile = null;
        this.affiliateProfileIds = [];
        console.warn("[Affiliate Dashboard] No affiliate profile matched current user.");
        return null;
      }

      const scoreProfile = (profile) => {
        let score = 0;

        const profileAuthUserId =
          profile && profile.auth_user_id ? String(profile.auth_user_id).trim() : "";
        const profileEmail =
          profile && profile.email ? String(profile.email).trim().toLowerCase() : "";
        const profileStatus =
          profile && profile.status ? String(profile.status).trim().toLowerCase() : "";

        if (authUserId && profileAuthUserId === authUserId) score += 100;
        if (authEmail && profileEmail === authEmail) score += 40;
        if (profileStatus === "approved") score += 25;
        if (profileStatus === "pending") score += 10;
        if (profile && profile.referral_code) score += 5;
        if (profile && profile.updated_at) score += 2;

        return score;
      };

      dedupedProfiles.sort((a, b) => {
        const scoreDiff = scoreProfile(b) - scoreProfile(a);
        if (scoreDiff !== 0) return scoreDiff;

        const aTime = new Date(a.updated_at || a.created_at || 0).getTime();
        const bTime = new Date(b.updated_at || b.created_at || 0).getTime();
        return bTime - aTime;
      });

      let profile = dedupedProfiles[0] || null;

      if (profile && !profile.auth_user_id && authUserId) {
        try {
          const patched = await supabase
            .from("affiliates")
            .update({
              auth_user_id: authUserId,
              updated_at: new Date().toISOString()
            })
            .eq("id", profile.id)
            .select("*")
            .maybeSingle();

          if (patched.error) {
            console.error(
              "[Affiliate Dashboard] Failed linking profile to auth user:",
              patched.error
            );
          } else if (patched.data) {
            profile = patched.data;
          }
        } catch (patchError) {
          console.error(
            "[Affiliate Dashboard] Exception linking profile to auth user:",
            patchError
          );
        }
      }

      this.affiliateProfile = profile || null;
      this.affiliateProfileIds = dedupedProfiles
        .map((item) => (item && item.id ? String(item.id) : ""))
        .filter(Boolean);

      console.log("[Affiliate Dashboard] Loaded affiliate profile:", this.affiliateProfile);
      console.log("[Affiliate Dashboard] All matched affiliate ids:", this.affiliateProfileIds);

      return this.affiliateProfile;
    } catch (error) {
      console.error("[Affiliate Dashboard] Failed loading affiliate profile:", error);
      this.affiliateProfile = null;
      this.affiliateProfileIds = [];
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
        return status === "pending";
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

      const commissionAmount = Number(row.commission_amount || 0);

      if (reservedAmount > 0 && commissionAmount > 0) {
        row.display_status = "claimed";
        reservedAmount = Math.max(0, reservedAmount - commissionAmount);
      }
    });

    rows.forEach((row) => {
      if (!row.display_status) {
        row.display_status =
          String(row.commission_status || "").trim().toLowerCase() || "pending";
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

    const emptyStats = {
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

    if (!supabase) {
      return emptyStats;
    }

    if (!this.affiliateProfile || !this.affiliateProfile.id) {
      await this.loadAffiliateProfile();
    }

    if (!this.affiliateProfile || !this.affiliateProfile.id) {
      console.error("[Affiliate Dashboard] No affiliate profile found for current user.");
      return emptyStats;
    }

    try {
      const profileIdsRaw = Array.isArray(this.affiliateProfileIds)
        ? this.affiliateProfileIds
        : [];

      const affiliateIds = Array.from(
        new Set(
          [String(this.affiliateProfile.id), ...profileIdsRaw.map((id) => String(id))]
            .filter(Boolean)
        )
      );

      const [
        clicksResult,
        conversionsResult,
        payoutsResult,
        claimsResult
      ] = await Promise.all([
        supabase
          .from("affiliate_clicks")
          .select("id, affiliate_id")
          .in("affiliate_id", affiliateIds),

        supabase
          .from("affiliate_conversions")
          .select("*")
          .in("affiliate_id", affiliateIds)
          .order("created_at", { ascending: false }),

        supabase
          .from("affiliate_payouts")
          .select("*")
          .in("affiliate_id", affiliateIds)
          .order("paid_at", { ascending: false })
          .order("created_at", { ascending: false }),

        supabase
          .from("affiliate_claim_requests")
          .select("*")
          .in("affiliate_id", affiliateIds)
          .order("created_at", { ascending: false })
      ]);

      if (clicksResult.error) throw clicksResult.error;
      if (conversionsResult.error) throw conversionsResult.error;
      if (payoutsResult.error) throw payoutsResult.error;
      if (claimsResult.error) throw claimsResult.error;

      const dedupeById = (rows) => {
        const seen = new Set();
        return (Array.isArray(rows) ? rows : []).filter((row) => {
          const id = row && row.id ? String(row.id) : "";
          if (!id || seen.has(id)) return false;
          seen.add(id);
          return true;
        });
      };

      const clickRows = dedupeById(clicksResult.data);
      const conversionRows = dedupeById(conversionsResult.data);
      const payoutRows = dedupeById(payoutsResult.data);
      const claimRows = dedupeById(claimsResult.data);

      const clicks = clickRows.length;

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
          return String(item.display_status || item.commission_status || "")
            .trim()
            .toLowerCase() === "claimable";
        })
        .reduce((sum, item) => sum + Number(item.commission_amount || 0), 0);

      console.log("[Affiliate Dashboard] Stats loaded:", {
        affiliateIds,
        clicks,
        conversions: conversionRows.length,
        payouts: payoutRows.length,
        claims: claimRows.length,
        availableToClaim,
        paid
      });

      return {
        clicks,
        conversions: conversionRows.length,
        claimable: availableToClaim,
        pendingClaims,
        approvedClaims,
        rejectedClaims,
        availableToClaim,
        paid,
        recentCommissions: displayConversionRows.slice(0, 6),
        payouts: payoutRows.slice(0, 20),
        claims: claimRows.slice(0, 20)
      };
    } catch (error) {
      console.error("[Affiliate Dashboard] Fetch stats failed:", error);
      return emptyStats;
    }
  }
});
