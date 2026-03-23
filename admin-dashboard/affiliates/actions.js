(function () {
  const state = window.AXIOM_ADMIN_AFFILIATES_STATE;

  function openModal() {
    const refs = window.AXIOM_ADMIN_AFFILIATES_DOM.getRefs();

    if (refs.modal) {
      refs.modal.hidden = false;
      refs.modal.style.display = "block";
      refs.modal.style.pointerEvents = "auto";
      refs.modal.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
    }
  }

  function closeModal() {
    const refs = window.AXIOM_ADMIN_AFFILIATES_DOM.getRefs();

    if (refs.modal) {
      refs.modal.hidden = true;
      refs.modal.style.display = "";
      refs.modal.style.pointerEvents = "";
      refs.modal.setAttribute("aria-hidden", "true");
    }

    document.body.style.overflow = "";
  }

  async function openAffiliateDetails(affiliateId) {
    if (!affiliateId || !window.axiomSupabase) return;

    try {
      const summary =
        state.affiliates.find((item) => String(item.id) === String(affiliateId)) || null;

      state.selectedAffiliate = summary;

      const detailData = await window.AXIOM_ADMIN_AFFILIATES_DATA.fetchAffiliateDetailData(affiliateId);
      window.AXIOM_ADMIN_AFFILIATES_RENDER.renderAffiliateDetail(summary, detailData);
      openModal();
    } catch (error) {
      console.error("Failed to load affiliate details:", error);
      alert(error.message || "Failed to load affiliate details.");
    }
  }

  async function updateStatus(affiliateId, status) {
    if (!affiliateId || !status || !window.axiomSupabase) return;

    try {
      const { error } = await window.axiomSupabase.rpc("admin_update_affiliate_status", {
        p_affiliate_id: affiliateId,
        p_status: status
      });

      if (error) throw error;

      await window.AXIOM_ADMIN_AFFILIATES_DATA.loadAffiliates();

      if (state.selectedAffiliate && String(state.selectedAffiliate.id) === String(affiliateId)) {
        await openAffiliateDetails(affiliateId);
      }

      alert(`Affiliate ${status} successfully.`);
    } catch (error) {
      console.error("Failed to update affiliate status:", error);
      alert(error.message || "Failed to update affiliate status.");
    }
  }

  async function updateClaimStatus(claimId, status) {
    if (!claimId || !status || !window.axiomSupabase) return;

    try {
      const { error } = await window.axiomSupabase.rpc("admin_update_affiliate_claim_status", {
        p_claim_request_id: claimId,
        p_status: status
      });

      if (error) throw error;

      await window.AXIOM_ADMIN_AFFILIATES_DATA.loadAffiliates();

      if (state.selectedAffiliate?.id) {
        await openAffiliateDetails(state.selectedAffiliate.id);
      }

      alert(`Claim ${status} successfully.`);
    } catch (error) {
      console.error("Failed to update claim request:", error);
      alert(error.message || "Failed to update claim request.");
    }
  }

  async function recordPayout() {
    const affiliateId = document.getElementById("affiliatePayoutAffiliateId")?.value || "";
    const amount = Number(document.getElementById("affiliatePayoutAmount")?.value || 0);
    const method = document.getElementById("affiliatePayoutMethod")?.value.trim() || "";
    const reference = document.getElementById("affiliatePayoutReference")?.value.trim() || "";
    const notes = document.getElementById("affiliatePayoutNotes")?.value.trim() || "";

    if (!affiliateId) {
      alert("Missing affiliate.");
      return;
    }

    if (!amount || amount <= 0) {
      alert("Enter a valid payout amount.");
      return;
    }

    try {
      const { error } = await window.axiomSupabase.rpc("admin_record_affiliate_payout", {
        p_affiliate_id: affiliateId,
        p_amount: amount,
        p_payout_method: method || null,
        p_payout_reference: reference || null,
        p_notes: notes || null
      });

      if (error) throw error;

      const refs = window.AXIOM_ADMIN_AFFILIATES_DOM.getRefs();
      if (refs.recordPayoutForm) refs.recordPayoutForm.reset();

      const payoutAffiliateId = document.getElementById("affiliatePayoutAffiliateId");
      if (payoutAffiliateId) payoutAffiliateId.value = affiliateId;

      await window.AXIOM_ADMIN_AFFILIATES_DATA.loadAffiliates();

      if (state.selectedAffiliate?.id) {
        await openAffiliateDetails(state.selectedAffiliate.id);
      }

      alert("Payout recorded successfully.");
    } catch (error) {
      console.error("Failed to record payout:", error);
      alert(error.message || "Failed to record payout.");
    }
  }

  function bindDelegatedEvents() {
    if (document.body.dataset.affiliateAdminGlobalBound === "true") return;
    document.body.dataset.affiliateAdminGlobalBound = "true";

    document.addEventListener("click", async (event) => {
      const refreshBtn = event.target.closest("#refreshAffiliatesBtn");
      const refreshTopBtn = event.target.closest("#refreshAffiliatesBtnTop");
      const refreshSidebarBtn = event.target.closest("#refreshAffiliatesSidebarBtn");

      const viewBtn = event.target.closest("[data-action='view'][data-affiliate-id]");
      const approveBtn = event.target.closest("[data-action='approve'][data-affiliate-id]");
      const rejectBtn = event.target.closest("[data-action='reject'][data-affiliate-id]");
      const suspendBtn = event.target.closest("[data-action='suspend'][data-affiliate-id]");

      const closeBtn = event.target.closest("#closeAffiliateDetailModal");
      const backdropClose = event.target.closest("[data-affiliate-modal-close]");

      const claimStatusBtn = event.target.closest("[data-claim-id][data-claim-status]");

      if (refreshBtn || refreshTopBtn || refreshSidebarBtn) {
        event.preventDefault();
        await window.AXIOM_ADMIN_AFFILIATES_DATA.loadAffiliates();
        return;
      }

      if (closeBtn || backdropClose) {
        event.preventDefault();
        event.stopPropagation();
        closeModal();
        return;
      }

      if (viewBtn) {
        event.preventDefault();
        const affiliateId = viewBtn.getAttribute("data-affiliate-id");
        if (!affiliateId) return;
        await openAffiliateDetails(affiliateId);
        return;
      }

      if (approveBtn) {
        event.preventDefault();
        const affiliateId = approveBtn.getAttribute("data-affiliate-id");
        if (!affiliateId) return;

        const confirmed = window.confirm("Approve this affiliate?");
        if (!confirmed) return;

        await updateStatus(affiliateId, "approved");
        return;
      }

      if (rejectBtn) {
        event.preventDefault();
        const affiliateId = rejectBtn.getAttribute("data-affiliate-id");
        if (!affiliateId) return;

        const confirmed = window.confirm("Reject this affiliate?");
        if (!confirmed) return;

        await updateStatus(affiliateId, "rejected");
        return;
      }

      if (suspendBtn) {
        event.preventDefault();
        const affiliateId = suspendBtn.getAttribute("data-affiliate-id");
        if (!affiliateId) return;

        const confirmed = window.confirm("Suspend this affiliate?");
        if (!confirmed) return;

        await updateStatus(affiliateId, "suspended");
        return;
      }

      if (claimStatusBtn) {
        event.preventDefault();
        const claimId = claimStatusBtn.getAttribute("data-claim-id");
        const status = claimStatusBtn.getAttribute("data-claim-status");
        if (!claimId || !status) return;

        await updateClaimStatus(claimId, status);
        return;
      }
    });

    document.addEventListener("submit", async (event) => {
      const payoutForm = event.target.closest("#affiliateRecordPayoutForm");
      if (!payoutForm) return;

      event.preventDefault();
      await recordPayout();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeModal();
      }
    });
  }

  window.AXIOM_ADMIN_AFFILIATES_ACTIONS = {
    openAffiliateDetails,
    updateStatus,
    updateClaimStatus,
    recordPayout,
    closeModal,
    bindDelegatedEvents
  };
})();
