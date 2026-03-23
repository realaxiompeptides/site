window.AXIOM_ADMIN_AFFILIATES_DOM = {
  cache() {
    return {
      tableBody: document.getElementById("affiliatesAdminTableBody"),
      searchInput: document.getElementById("affiliateSearchInput"),
      statusFilter: document.getElementById("affiliateStatusFilter"),
      refreshBtn: document.getElementById("refreshAffiliatesBtn"),

      statTotal: document.getElementById("affiliateStatTotal"),
      statPending: document.getElementById("affiliateStatPending"),
      statApproved: document.getElementById("affiliateStatApproved"),
      statClaimable: document.getElementById("affiliateStatClaimable"),

      modal: document.getElementById("affiliateDetailModal"),
      closeModalBtn: document.getElementById("closeAffiliateDetailModal"),
      recordPayoutForm: document.getElementById("affiliateRecordPayoutForm")
    };
  }
};
