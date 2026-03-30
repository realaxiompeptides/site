(function () {
  const state = window.AXIOM_ADMIN_AFFILIATES_STATE;
  const domApi = window.AXIOM_ADMIN_AFFILIATES_DOM;
  const renderApi = window.AXIOM_ADMIN_AFFILIATES_RENDER;
  const actions = window.AXIOM_ADMIN_AFFILIATES_ACTIONS;

  function setAffiliateStatusTabActive(nextStatus) {
    const tabs = document.querySelectorAll("[data-affiliate-status-tab]");
    tabs.forEach(function (tab) {
      const tabStatus = String(tab.getAttribute("data-affiliate-status-tab") || "all")
        .trim()
        .toLowerCase();

      const isActive = tabStatus === String(nextStatus || "all").trim().toLowerCase();
      tab.classList.toggle("is-active", isActive);
      tab.classList.toggle("active", isActive);
      tab.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
  }

  function syncAffiliateStatusTabsFromSelect() {
    const statusFilter = document.getElementById("affiliateStatusFilter");
    const nextStatus = statusFilter ? statusFilter.value : "all";
    setAffiliateStatusTabActive(nextStatus || "all");
  }

  function showAffiliateDetailSection(nextSection) {
    const normalized = String(nextSection || "overview").trim().toLowerCase();
    const tabs = document.querySelectorAll("[data-affiliate-detail-tab]");
    const sections = document.querySelectorAll("[data-affiliate-detail-section]");

    tabs.forEach(function (tab) {
      const tabName = String(tab.getAttribute("data-affiliate-detail-tab") || "")
        .trim()
        .toLowerCase();

      const isActive = tabName === normalized;
      tab.classList.toggle("is-active", isActive);
      tab.classList.toggle("active", isActive);
      tab.setAttribute("aria-pressed", isActive ? "true" : "false");
    });

    sections.forEach(function (section) {
      const sectionName = String(section.getAttribute("data-affiliate-detail-section") || "")
        .trim()
        .toLowerCase();

      section.hidden = sectionName !== normalized;
    });
  }

  function ensureAffiliateDetailDefaultSection() {
    const hasSections = document.querySelector("[data-affiliate-detail-section]");
    const hasTabs = document.querySelector("[data-affiliate-detail-tab]");

    if (!hasSections || !hasTabs) return;
    showAffiliateDetailSection("overview");
  }

  async function boot() {
    if (!state || !domApi || !renderApi || !actions) {
      console.error("Affiliate admin failed to boot: missing required modules.");
      return;
    }

    const dom = typeof domApi.cache === "function" ? domApi.cache() : {};
    actions.dom = dom;

    const payoutRequestsTableBody =
      dom.payoutRequestsTableBody ||
      dom.payoutRequestsBody ||
      document.getElementById("affiliatePayoutRequestsTableBody");

    if (!dom.tableBody && !payoutRequestsTableBody) {
      console.warn("Affiliate admin failed to boot: no affiliate table or payout request table found yet.");
      return;
    }

    if (dom.refreshBtn && !dom.refreshBtn.dataset.bound) {
      dom.refreshBtn.dataset.bound = "true";
      dom.refreshBtn.addEventListener("click", async function () {
        await actions.loadAffiliates();
        syncAffiliateStatusTabsFromSelect();
      });
    }

    if (dom.refreshTopBtn && !dom.refreshTopBtn.dataset.bound) {
      dom.refreshTopBtn.dataset.bound = "true";
      dom.refreshTopBtn.addEventListener("click", async function () {
        await actions.loadAffiliates();
        syncAffiliateStatusTabsFromSelect();
      });
    }

    if (dom.refreshSidebarBtn && !dom.refreshSidebarBtn.dataset.bound) {
      dom.refreshSidebarBtn.dataset.bound = "true";
      dom.refreshSidebarBtn.addEventListener("click", async function () {
        await actions.loadAffiliates();
        syncAffiliateStatusTabsFromSelect();
      });
    }

    if (dom.searchInput && !dom.searchInput.dataset.bound) {
      dom.searchInput.dataset.bound = "true";
      dom.searchInput.addEventListener("input", function () {
        actions.applyFilters();
      });
    }

    if (dom.statusFilter && !dom.statusFilter.dataset.bound) {
      dom.statusFilter.dataset.bound = "true";
      dom.statusFilter.addEventListener("change", function () {
        actions.applyFilters();
        syncAffiliateStatusTabsFromSelect();
      });
    }

    if (dom.closeModalBtn && !dom.closeModalBtn.dataset.bound) {
      dom.closeModalBtn.dataset.bound = "true";
      dom.closeModalBtn.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();
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

    const compSettingsForm = document.getElementById("affiliateCompSettingsForm");
    if (compSettingsForm && !compSettingsForm.dataset.bound) {
      compSettingsForm.dataset.bound = "true";
      compSettingsForm.addEventListener("submit", async function (event) {
        event.preventDefault();
        event.stopPropagation();

        if (typeof actions.saveAffiliateCompSettings === "function") {
          await actions.saveAffiliateCompSettings();
        }
      });
    }

    const notesForm = document.getElementById("affiliateNotesForm");
    if (notesForm && !notesForm.dataset.bound) {
      notesForm.dataset.bound = "true";
      notesForm.addEventListener("submit", async function (event) {
        event.preventDefault();
        event.stopPropagation();

        if (typeof actions.saveAffiliateNotes === "function") {
          await actions.saveAffiliateNotes();
        }
      });
    }

    const payoutReviewModal = document.getElementById("affiliatePayoutReviewModal");
    const payoutReviewConfirmBtn = document.getElementById("affiliatePayoutConfirmPaidBtn");
    const payoutReviewCopyBtn = document.getElementById("affiliatePayoutCopyAddressBtn");

    if (payoutReviewConfirmBtn && !payoutReviewConfirmBtn.dataset.bound) {
      payoutReviewConfirmBtn.dataset.bound = "true";
      payoutReviewConfirmBtn.addEventListener("click", async function (event) {
        event.preventDefault();
        event.stopPropagation();

        if (typeof actions.confirmPayoutReviewPaid === "function") {
          await actions.confirmPayoutReviewPaid();
        }
      });
    }

    if (payoutReviewCopyBtn && !payoutReviewCopyBtn.dataset.bound) {
      payoutReviewCopyBtn.dataset.bound = "true";
      payoutReviewCopyBtn.addEventListener("click", async function (event) {
        event.preventDefault();
        event.stopPropagation();

        if (typeof actions.copyPayoutAddress === "function") {
          await actions.copyPayoutAddress();
        }
      });
    }

    if (!document.body.dataset.affiliateAdminDelegated) {
      document.body.dataset.affiliateAdminDelegated = "true";

      document.addEventListener("click", async function (event) {
        const refreshBtn = event.target.closest("#refreshAffiliatesBtn");
        const refreshTopBtn = event.target.closest("#refreshAffiliatesBtnTop");
        const refreshSidebarBtn = event.target.closest("#refreshAffiliatesSidebarBtn");

        const approveBtn =
          event.target.closest("[data-affiliate-approve]") ||
          event.target.closest("[data-action='approve'][data-affiliate-id]");

        const rejectBtn =
          event.target.closest("[data-affiliate-reject]") ||
          event.target.closest("[data-action='reject'][data-affiliate-id]");

        const suspendBtn =
          event.target.closest("[data-affiliate-suspend]") ||
          event.target.closest("[data-action='suspend'][data-affiliate-id]");

        const viewBtn =
          event.target.closest("[data-affiliate-view]") ||
          event.target.closest("[data-action='view'][data-affiliate-id]");

        const claimStatusBtn = event.target.closest("[data-claim-status][data-claim-id]");

        const statusTabBtn = event.target.closest("[data-affiliate-status-tab]");
        const detailTabBtn = event.target.closest("[data-affiliate-detail-tab]");

        const modalClose =
          event.target.closest("[data-affiliate-modal-close]") ||
          event.target.closest("#closeAffiliateDetailModal");

        const payoutReviewClose =
          event.target.closest("[data-payout-review-close]") ||
          event.target.closest("#closeAffiliatePayoutReviewModal");

        const payoutReviewBackdrop =
          event.target.closest("#affiliatePayoutReviewModal [data-payout-review-close]");

        if (refreshBtn || refreshTopBtn || refreshSidebarBtn) {
          event.preventDefault();
          await actions.loadAffiliates();
          syncAffiliateStatusTabsFromSelect();
          return;
        }

        if (statusTabBtn) {
          event.preventDefault();

          const nextStatus = String(
            statusTabBtn.getAttribute("data-affiliate-status-tab") || "all"
          ).trim().toLowerCase();

          const statusFilter = document.getElementById("affiliateStatusFilter");
          if (statusFilter) {
            statusFilter.value = nextStatus;
          }

          setAffiliateStatusTabActive(nextStatus);
          actions.applyFilters();
          return;
        }

        if (detailTabBtn) {
          event.preventDefault();

          const nextSection = String(
            detailTabBtn.getAttribute("data-affiliate-detail-tab") || "overview"
          ).trim().toLowerCase();

          showAffiliateDetailSection(nextSection);
          return;
        }

        if (approveBtn) {
          event.preventDefault();

          const affiliateId =
            approveBtn.getAttribute("data-affiliate-approve") ||
            approveBtn.getAttribute("data-affiliate-id");

          if (!affiliateId) return;

          await actions.updateStatus(affiliateId, "approved");
          syncAffiliateStatusTabsFromSelect();
          return;
        }

        if (rejectBtn) {
          event.preventDefault();

          const affiliateId =
            rejectBtn.getAttribute("data-affiliate-reject") ||
            rejectBtn.getAttribute("data-affiliate-id");

          if (!affiliateId) return;

          await actions.updateStatus(affiliateId, "rejected");
          syncAffiliateStatusTabsFromSelect();
          return;
        }

        if (suspendBtn) {
          event.preventDefault();

          const affiliateId =
            suspendBtn.getAttribute("data-affiliate-suspend") ||
            suspendBtn.getAttribute("data-affiliate-id");

          if (!affiliateId) return;

          await actions.updateStatus(affiliateId, "suspended");
          syncAffiliateStatusTabsFromSelect();
          return;
        }

        if (viewBtn) {
          event.preventDefault();

          const affiliateId =
            viewBtn.getAttribute("data-affiliate-view") ||
            viewBtn.getAttribute("data-affiliate-id");

          if (!affiliateId) return;

          await actions.openAffiliateDetails(affiliateId);
          ensureAffiliateDetailDefaultSection();
          return;
        }

        if (claimStatusBtn) {
          event.preventDefault();

          const claimId = claimStatusBtn.getAttribute("data-claim-id");
          const claimStatus = claimStatusBtn.getAttribute("data-claim-status");

          if (!claimId || !claimStatus) return;

          if (typeof actions.submitAffiliateClaimReview === "function") {
            await actions.submitAffiliateClaimReview(claimId, claimStatus);
          } else if (typeof actions.updateClaimStatus === "function") {
            await actions.updateClaimStatus(claimId, claimStatus);
          }

          return;
        }

        if (payoutReviewClose || payoutReviewBackdrop) {
          event.preventDefault();
          event.stopPropagation();

          if (typeof actions.closePayoutReviewModal === "function") {
            actions.closePayoutReviewModal();
          }

          return;
        }

        if (modalClose) {
          event.preventDefault();
          event.stopPropagation();
          actions.closeModal();
        }
      });

      document.addEventListener("keydown", function (event) {
        if (event.key === "Escape") {
          if (payoutReviewModal && !payoutReviewModal.hidden && typeof actions.closePayoutReviewModal === "function") {
            actions.closePayoutReviewModal();
            return;
          }

          actions.closeModal();
        }
      });
    }

    window.AXIOM_ADMIN_AFFILIATES = {
      init: boot,
      loadAffiliates: actions.loadAffiliates.bind(actions),
      applyFilters: actions.applyFilters.bind(actions),
      updateStatus: actions.updateStatus.bind(actions),
      openAffiliateDetails: async function (affiliateId) {
        await actions.openAffiliateDetails(affiliateId);
        ensureAffiliateDetailDefaultSection();
      },
      closeModal: actions.closeModal.bind(actions),
      updateClaimStatus: actions.updateClaimStatus.bind(actions),
      submitAffiliateClaimReview:
        typeof actions.submitAffiliateClaimReview === "function"
          ? actions.submitAffiliateClaimReview.bind(actions)
          : null,
      confirmPayoutReviewPaid:
        typeof actions.confirmPayoutReviewPaid === "function"
          ? actions.confirmPayoutReviewPaid.bind(actions)
          : null,
      closePayoutReviewModal:
        typeof actions.closePayoutReviewModal === "function"
          ? actions.closePayoutReviewModal.bind(actions)
          : null,
      copyPayoutAddress:
        typeof actions.copyPayoutAddress === "function"
          ? actions.copyPayoutAddress.bind(actions)
          : null,
      recordPayout: actions.recordPayout.bind(actions),
      saveAffiliateCompSettings:
        typeof actions.saveAffiliateCompSettings === "function"
          ? actions.saveAffiliateCompSettings.bind(actions)
          : null,
      saveAffiliateNotes:
        typeof actions.saveAffiliateNotes === "function"
          ? actions.saveAffiliateNotes.bind(actions)
          : null,
      showAffiliateDetailSection: showAffiliateDetailSection,
      setAffiliateStatusTabActive: setAffiliateStatusTabActive,
      get affiliates() {
        return state.affiliates;
      },
      get filteredAffiliates() {
        return state.filteredAffiliates;
      },
      get selectedAffiliate() {
        return state.selectedAffiliate;
      },
      get selectedAffiliateId() {
        return state.selectedAffiliateId;
      },
      get payoutRequests() {
        return state.payoutRequests || [];
      }
    };

    await actions.loadAffiliates();
    syncAffiliateStatusTabsFromSelect();
    ensureAffiliateDetailDefaultSection();
  }

  window.AXIOM_ADMIN_AFFILIATES_INIT = {
    boot: boot
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
