(function () {
  function getRefs() {
    return {
      tableBody: document.getElementById("affiliatesAdminTableBody"),
      searchInput: document.getElementById("affiliateSearchInput"),
      statusFilter: document.getElementById("affiliateStatusFilter"),

      refreshBtn: document.getElementById("refreshAffiliatesBtn"),
      refreshTopBtn: document.getElementById("refreshAffiliatesBtnTop"),
      refreshSidebarBtn: document.getElementById("refreshAffiliatesSidebarBtn"),

      statTotal: document.getElementById("affiliateStatTotal"),
      statPending: document.getElementById("affiliateStatPending"),
      statApproved: document.getElementById("affiliateStatApproved"),
      statClaimable: document.getElementById("affiliateStatClaimable"),

      modal: document.getElementById("affiliateDetailModal"),
      closeModalBtn: document.getElementById("closeAffiliateDetailModal"),
      recordPayoutForm: document.getElementById("affiliateRecordPayoutForm")
    };
  }

  window.AXIOM_ADMIN_AFFILIATES_DOM = {
    getRefs
  };
})();
