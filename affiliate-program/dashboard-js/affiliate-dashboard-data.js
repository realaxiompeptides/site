Object.assign(window.AXIOM_AFFILIATE_DASHBOARD, {
  async loadAffiliateProfile() {
    const supabase = this.getSupabase();

    if (!this.currentUser || !this.currentUser.id || !supabase) {
      this.affiliateProfile = null;
      return;
    }

    try {
      const result = await supabase
        .from('affiliates')
        .select('*')
        .eq('auth_user_id', this.currentUser.id)
        .maybeSingle();

      if (result.error) {
        console.error('[Affiliate Dashboard] loadAffiliateProfile failed:', result.error);
        this.affiliateProfile = null;
        return null;
      }

      this.affiliateProfile = result.data || null;
      console.log('[Affiliate Dashboard] Loaded affiliate profile:', this.affiliateProfile);
      return this.affiliateProfile;
    } catch (error) {
      console.error('[Affiliate Dashboard] loadAffiliateProfile exception:', error);
      this.affiliateProfile = null;
      return null;
    }
  },

  async fetchStats() {
    const supabase = this.getSupabase();

    const emptyStats = {
      clicks: 0,
      conversions: 0,
      claimable: 0,
      pendingClaims: 0,
      availableToClaim: 0,
      paid: 0,
      recentCommissions: [],
      payouts: [],
      claims: []
    };

    if (!supabase || !this.affiliateProfile || !this.affiliateProfile.id) {
      return emptyStats;
    }

    const affiliateId = this.affiliateProfile.id;

    try {
      const [clicksResult, conversionsResult, claimsResult, payoutsResult] = await Promise.all([
        supabase
          .from('affiliate_clicks')
          .select('id', { count: 'exact', head: false })
          .eq('affiliate_id', affiliateId),

        supabase
          .from('affiliate_conversions')
          .select('*')
          .eq('affiliate_id', affiliateId)
          .order('created_at', { ascending: false }),

        supabase
          .from('affiliate_claim_requests')
          .select('*')
          .eq('affiliate_id', affiliateId)
          .order('created_at', { ascending: false }),

        supabase
          .from('affiliate_payouts')
          .select('*')
          .eq('affiliate_id', affiliateId)
          .order('created_at', { ascending: false })
      ]);

      if (clicksResult.error) throw clicksResult.error;
      if (conversionsResult.error) throw conversionsResult.error;
      if (claimsResult.error) throw claimsResult.error;
      if (payoutsResult.error) throw payoutsResult.error;

      const conversionRows = Array.isArray(conversionsResult.data) ? conversionsResult.data : [];
      const claimRows = Array.isArray(claimsResult.data) ? claimsResult.data : [];
      const payoutRows = Array.isArray(payoutsResult.data) ? payoutsResult.data : [];

      const claimable = conversionRows
        .filter((row) => String(row.commission_status || '').trim().toLowerCase() === 'claimable')
        .reduce((sum, row) => sum + Number(row.commission_amount || 0), 0);

      const pendingClaims = claimRows
        .filter((row) => {
          const status = String(row.status || '').trim().toLowerCase();
          return status === 'pending' || status === 'approved';
        })
        .reduce((sum, row) => sum + Number(row.amount || 0), 0);

      const paid = payoutRows
        .filter((row) => String(row.payout_status || '').trim().toLowerCase() === 'paid')
        .reduce((sum, row) => sum + Number(row.amount || 0), 0);

      const availableToClaim = Math.max(claimable - pendingClaims, 0);

      console.log('[Affiliate Dashboard] Stats loaded:', {
        affiliateId,
        clicks: Array.isArray(clicksResult.data) ? clicksResult.data.length : clicksResult.count || 0,
        conversions: conversionRows.length,
        claimable,
        pendingClaims,
        availableToClaim,
        paid
      });

      return {
        clicks: Array.isArray(clicksResult.data) ? clicksResult.data.length : clicksResult.count || 0,
        conversions: conversionRows.length,
        claimable,
        pendingClaims,
        availableToClaim,
        paid,
        recentCommissions: conversionRows.slice(0, 6),
        payouts: payoutRows.slice(0, 20),
        claims: claimRows.slice(0, 20)
      };
    } catch (error) {
      console.error('[Affiliate Dashboard] Fetch stats failed:', error);
      return emptyStats;
    }
  }
});
