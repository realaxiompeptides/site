(function () {
  const state = window.AXIOM_ADMIN_AFFILIATES_STATE;
  const domApi = window.AXIOM_ADMIN_AFFILIATES_DOM;
  const renderApi = window.AXIOM_ADMIN_AFFILIATES_RENDER;
  const actions = window.AXIOM_ADMIN_AFFILIATES_ACTIONS;

  async function boot() {
    const dom = domApi.cache();
    actions.dom = dom;

    if (dom.refreshBtn && !dom.refreshBtn.dataset.bound) {
      dom.refreshBtn.dataset.bound = "true";
      dom.refreshBtn.addEventListener("click", async function () {
        await actions.loadAffiliates();
      });
    }

    if (dom.searchInput && !dom.searchInput.dataset.bound) {
      dom.searchInput.dataset.bound = "true";
      dom.searchInput.addEventListener("input", function () {
        renderApi.applyFilters(dom, state);
        renderApi.renderTable(dom, state);
      });
    }

    if (dom.statusFilter && !dom.statusFilter.dataset.bound) {
      dom.statusFilter.dataset.bound = "true";
      dom.statusFilter.addEventListener("change", function () {
        renderApi.applyFilters(dom, state);
        renderApi.renderTable(dom, state);
      });
    }

    if (dom.closeModalBtn && !dom.closeModalBtn.dataset.bound) {
      dom.closeModalBtn.dataset.bound = "true";
      dom.closeModalBtn.addEventListener("click", function () {
        actions.closeModal();
      });
    }

    if (dom.recordPayoutForm && !dom.recordPayoutForm.dataset.bound) {
      dom.recordPayoutForm.dataset.bound = "true";
      dom.recordPayoutForm.addEventListener("submit", async function (event) {
        event.preventDefault();
        await actions.recordPayout();
      });
    }

    if (!document.body.dataset.affiliateAdminDelegated) {
      document.body.dataset.affiliateAdminDelegated = "true";

      document.addEventListener("click", async function (event) {
        const approveBtn = event.target.closest("[data-affiliate-approve]");
        const rejectBtn = event.target.closest("[data-affiliate-reject]");
        const suspendBtn = event.target.closest("[data-affiliate-suspend]");
        const viewBtn = event.target.closest("[data-affiliate-view]");
        const claimStatusBtn = event.target.closest("[data-claim-status]");
        const modalClose = event.target.closest("[data-affiliate-modal-close]");

        if (approveBtn) {
          await actions.updateStatus(approveBtn.getAttribute("data-affiliate-approve"), "approved");
          return;
        }

        if (rejectBtn) {
          await actions.updateStatus(rejectBtn.getAttribute("data-affiliate-reject"), "rejected");
          return;
        }

        if (suspendBtn) {
          await actions.updateStatus(suspendBtn.getAttribute("data-affiliate-suspend"), "suspended");
          return;
        }

        if (viewBtn) {
          await actions.openAffiliateDetails(viewBtn.getAttribute("data-affiliate-view"));
          return;
        }

        if (claimStatusBtn) {
          await actions.updateClaimStatus(
            claimStatusBtn.getAttribute("data-claim-id"),
            claimStatusBtn.getAttribute("data-claim-status")
          );
          return;
        }

        if (modalClose) {
          actions.closeModal();
        }
      });
    }

    window.AXIOM_ADMIN_AFFILIATES = {
      loadAffiliates: actions.loadAffiliates.bind(actions),
      updateStatus: actions.updateStatus.bind(actions),
      openAffiliateDetails: actions.openAffiliateDetails.bind(actions),
      closeModal: actions.closeModal.bind(actions),
      updateClaimStatus: actions.updateClaimStatus.bind(actions),
      recordPayout: actions.recordPayout.bind(actions),
      affiliates: state.affiliates,
      filteredAffiliates: state.filteredAffiliates,
      selectedAffiliate: state.selectedAffiliate
    };

    await actions.loadAffiliates();
  }

  window.AXIOM_ADMIN_AFFILIATES_INIT = {
    boot
  };
})();
