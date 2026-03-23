(function () {
  const state = window.AXIOM_ADMIN_AFFILIATES_STATE;
  const utils = window.AXIOM_ADMIN_AFFILIATES_UTILS;

  async function loadAffiliates() {
    const refs = window.AXIOM_ADMIN_AFFILIATES_DOM.getRefs();

    if (!window.axiomSupabase || !refs.tableBody) return;

    try {
      refs.tableBody.innerHTML = `<tr><td colspan="10">Loading affiliates...</td></tr>`;

      const { data, error } = await window.axiomSupabase
        .from("affiliate_admin_summary")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      state.affiliates = Array.isArray(data) ? data : [];
      window.AXIOM_ADMIN_AFFILIATES_RENDER.applyFilters();
      window.AXIOM_ADMIN_AFFILIATES_RENDER.renderStats();
    } catch (error) {
      console.error("Failed to load affiliates:", error);

      state.affiliates = [];
      state.filteredAffiliates = [];
      window.AXIOM_ADMIN_AFFILIATES_RENDER.renderStats();

      if (refs.tableBody) {
        refs.tableBody.innerHTML = `
          <tr>
            <td colspan="10">Failed to load affiliates: ${utils.escapeHtml(error.message || "Unknown error")}</td>
          </tr>
        `;
      }
    }
  }

  async function fetchAffiliateDetailData(affiliateId) {
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

  window.AXIOM_ADMIN_AFFILIATES_DATA = {
    loadAffiliates,
    fetchAffiliateDetailData
  };
})();
