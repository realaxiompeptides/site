Object.assign(window.AXIOM_AFFILIATE_DASHBOARD, {
  async renderDashboard() {
    if (this.isRenderingDashboard) {
      return;
    }

    this.isRenderingDashboard = true;

    try {
      if (!this.affiliateProfile || !this.affiliateProfile.id) {
        await this.loadAffiliateProfile();
      }

      const statsRaw = await this.fetchStats();
      const stats = {
        clicks: this.toNumber(statsRaw && statsRaw.clicks, 0),
        conversions: this.toNumber(statsRaw && statsRaw.conversions, 0),
        availableToClaim: this.toNumber(statsRaw && statsRaw.availableToClaim, 0),
        paid: this.toNumber(statsRaw && statsRaw.paid, 0),
        pendingClaims: this.toNumber(statsRaw && statsRaw.pendingClaims, 0),
        approvedClaims: this.toNumber(statsRaw && statsRaw.approvedClaims, 0),
        rejectedClaims: this.toNumber(statsRaw && statsRaw.rejectedClaims, 0),
        recentCommissions: Array.isArray(statsRaw && statsRaw.recentCommissions)
          ? statsRaw.recentCommissions
          : [],
        payouts: Array.isArray(statsRaw && statsRaw.payouts)
          ? statsRaw.payouts
          : [],
        claims: Array.isArray(statsRaw && statsRaw.claims)
          ? statsRaw.claims
          : []
      };

      const profile = this.affiliateProfile || null;

      const email =
        (profile && profile.email) ||
        (this.currentUser && this.currentUser.email) ||
        "—";

      const fullName =
        (profile && profile.full_name) ||
        (this.currentUser &&
          this.currentUser.user_metadata &&
          this.currentUser.user_metadata.full_name) ||
        "—";

      const status = (profile && profile.status) || "pending";
      const referralCode = (profile && profile.referral_code) || "—";

      this.setText("affiliateDashboardEmail", email);
      this.setText("affiliateDashboardEmailRow", email);
      this.setText("affiliateDashboardFullName", fullName);
      this.setText("affiliateDashboardStatus", status);
      this.setText("affiliateDashboardCode", referralCode);

      this.setText(
        "affiliateDashboardCommissionRate",
        profile ? String(Number(profile.commission_value || 0)) + "%" : "—"
      );

      this.setText(
        "affiliateDashboardDiscountRate",
        profile ? String(Number(profile.discount_value || 0)) + "%" : "—"
      );

      this.syncReferralCodeUi((profile && profile.referral_code) || "");
      this.setReferralCodeStatus("", "");

      this.setText("affiliateClicksCount", String(stats.clicks));
      this.setText("affiliateConversionsCount", String(stats.conversions));
      this.setText("affiliateClaimableAmount", this.formatCurrency(stats.availableToClaim));
      this.setText("affiliatePaidAmount", this.formatCurrency(stats.paid));
      this.setText("affiliatePendingClaimsAmount", this.formatCurrency(stats.pendingClaims));
      this.setText("affiliateApprovedClaimsAmount", this.formatCurrency(stats.approvedClaims));
      this.setText("affiliateRejectedClaimsAmount", this.formatCurrency(stats.rejectedClaims));

      const claimAmountInput = this.getClaimAmountInput();
      if (claimAmountInput) {
        const maxClaimable = this.toNumber(stats.availableToClaim, 0);

        claimAmountInput.max = String(maxClaimable.toFixed(2));
        claimAmountInput.placeholder = maxClaimable > 0 ? maxClaimable.toFixed(2) : "0.00";
        claimAmountInput.disabled = maxClaimable <= 0;

        if (maxClaimable > 0 && !claimAmountInput.value) {
          claimAmountInput.value = maxClaimable.toFixed(2);
        }

        if (maxClaimable <= 0) {
          claimAmountInput.value = "";
        }
      }

      const claimNoteInput = this.getClaimNoteInput();
      if (claimNoteInput) {
        claimNoteInput.disabled = this.toNumber(stats.availableToClaim, 0) <= 0;
      }

      const payoutMethodInput = this.getClaimPayoutMethodInput();
      if (payoutMethodInput) {
        payoutMethodInput.disabled = this.toNumber(stats.availableToClaim, 0) <= 0;
      }

      const payoutNetworkInput = this.getClaimPayoutNetworkInput();
      if (payoutNetworkInput) {
        payoutNetworkInput.disabled = this.toNumber(stats.availableToClaim, 0) <= 0;
      }

      const payoutAddressInput = this.getClaimPayoutAddressInput();
      if (payoutAddressInput) {
        payoutAddressInput.disabled = this.toNumber(stats.availableToClaim, 0) <= 0;
      }

      const payoutContactInput = this.getClaimPayoutContactInput();
      if (payoutContactInput) {
        payoutContactInput.disabled = this.toNumber(stats.availableToClaim, 0) <= 0;
      }

      if (typeof this.setClaimButtonState === "function") {
        if (this.toNumber(stats.availableToClaim, 0) <= 0) {
          this.setClaimButtonState("disabled");
        } else {
          this.setClaimButtonState("ready");
        }
      }

      const claimAvailableEl = document.getElementById("affiliateClaimAvailableAmount");
      if (claimAvailableEl) {
        claimAvailableEl.textContent = this.formatCurrency(stats.availableToClaim);
      }

      const claimReservedEl = document.getElementById("affiliateClaimReservedAmount");
      if (claimReservedEl) {
        claimReservedEl.textContent = this.formatCurrency(
          this.toNumber(stats.pendingClaims, 0) + this.toNumber(stats.approvedClaims, 0)
        );
      }

      const claimHelperText = document.getElementById("affiliateClaimHelperText");
      if (claimHelperText) {
        const reservedTotal =
          this.toNumber(stats.pendingClaims, 0) + this.toNumber(stats.approvedClaims, 0);

        claimHelperText.textContent =
          reservedTotal > 0
            ? "Pending and approved claim requests are temporarily reserved until reviewed or paid."
            : "You can only submit up to your currently available claimable balance.";
      }

      const generatedLinkInput = document.getElementById("affiliateGeneratedLink");
      if (generatedLinkInput) {
        generatedLinkInput.value =
          profile && profile.referral_code
            ? this.buildAffiliateTrackingUrl("/", profile.referral_code)
            : "";
      }

      const copyGeneratedLinkBtn = document.getElementById("affiliateCopyGeneratedLinkBtn");
      if (copyGeneratedLinkBtn && generatedLinkInput) {
        copyGeneratedLinkBtn.setAttribute("data-affiliate-copy", generatedLinkInput.value || "");
      }

      if (typeof this.updateClaimPayoutFieldVisibility === "function") {
        this.updateClaimPayoutFieldVisibility();
      }

      console.log("[Affiliate Dashboard] Rendering with:", {
        profile,
        clicks: stats.clicks,
        conversions: stats.conversions,
        claimable: stats.availableToClaim,
        payoutsCount: stats.payouts.length,
        claimsCount: stats.claims.length,
        recentCommissionsCount: stats.recentCommissions.length
      });

      this.renderRecentCommissions(stats.recentCommissions);
      this.renderPayouts(stats.payouts);
      this.renderClaims(stats.claims);
    } catch (error) {
      console.error(
        "[Affiliate Dashboard] Render failed:",
        error?.message || error,
        error?.stack || ""
      );
      this.setMessage("Failed to load affiliate dashboard data.", "error");
    } finally {
      this.isRenderingDashboard = false;
    }
  },

  renderRecentCommissions(rows) {
    const mount = document.getElementById("affiliateRecentCommissionsList");
    if (!mount) return;

    const safeRows = Array.isArray(rows) ? rows : [];

    if (!safeRows.length) {
      mount.innerHTML = '<div class="affiliate-empty-state">No commissions yet.</div>';
      return;
    }

    mount.innerHTML = safeRows
      .map((row) => {
        const statusText =
          typeof this.getCommissionStatusLabel === "function"
            ? this.getCommissionStatusLabel(
                row.display_status || row.commission_status || "pending"
              )
            : String(row.display_status || row.commission_status || "pending");

        return (
          '<div class="affiliate-data-row">' +
          "<span>Order #" +
          this.escapeHtml(row.order_number || "—") +
          " · " +
          this.escapeHtml(statusText) +
          "</span>" +
          "<strong>" +
          this.formatCurrency(row.commission_amount || 0) +
          "</strong>" +
          "</div>"
        );
      })
      .join("");
  },

  renderPayouts(rows) {
    const mount = document.getElementById("affiliatePayoutsList");
    if (!mount) return;

    const safeRows = Array.isArray(rows) ? rows : [];

    console.log("[Affiliate Dashboard] renderPayouts rows:", safeRows);

    if (!safeRows.length) {
      mount.innerHTML = '<div class="affiliate-empty-state">No payouts yet.</div>';
      return;
    }

    mount.innerHTML = safeRows
      .map((row) => {
        const statusLabel =
          typeof this.getPayoutStatusLabel === "function"
            ? this.getPayoutStatusLabel(row.payout_status)
            : this.escapeHtml(row.payout_status || "pending");

        const statusClass =
          typeof this.getPayoutStatusClass === "function"
            ? this.getPayoutStatusClass(row.payout_status)
            : "";

        const dateText = this.escapeHtml(this.formatDate(row.paid_at || row.created_at));
        const amount = this.formatCurrency(row.amount || 0);
        const methodText = row.payout_method ? this.escapeHtml(row.payout_method) : "Payout";
        const referenceText = row.payout_reference ? this.escapeHtml(row.payout_reference) : "";
        const notesText = row.notes ? this.escapeHtml(row.notes) : "";

        return (
          '<div class="affiliate-data-row affiliate-data-row--stacked">' +
          '<div class="affiliate-data-row-main">' +
          "<span>" +
          dateText +
          "</span>" +
          "<strong>" +
          amount +
          "</strong>" +
          "</div>" +
          '<div class="affiliate-data-row-sub">' +
          '<span class="affiliate-status-badge ' +
          statusClass +
          '">' +
          statusLabel +
          "</span>" +
          '<span class="affiliate-data-note">' +
          methodText +
          (referenceText ? " · " + referenceText : "") +
          "</span>" +
          (notesText
            ? '<span class="affiliate-data-note">' + notesText + "</span>"
            : "") +
          "</div>" +
          "</div>"
        );
      })
      .join("");
  },

  renderClaims(rows) {
    const mount = document.getElementById("affiliateClaimsList");
    if (!mount) return;

    const summaryEl = document.getElementById("affiliateClaimsSummary");
    const safeRows = Array.isArray(rows) ? rows : [];

    console.log("[Affiliate Dashboard] renderClaims rows:", safeRows);

    if (summaryEl) {
      if (!safeRows.length) {
        summaryEl.textContent = "No claim requests submitted yet.";
      } else {
        const reservedCount = safeRows.filter((row) => {
          const status = String(row.status || "").trim().toLowerCase();
          return status === "pending" || status === "approved";
        }).length;

        summaryEl.textContent =
          reservedCount > 0
            ? "Pending and approved claim requests stay reserved until they are reviewed or paid."
            : "Your past and current claim requests are shown below.";
      }
    }

    if (!safeRows.length) {
      mount.innerHTML = '<div class="affiliate-empty-state">No claim requests yet.</div>';
      return;
    }

    mount.innerHTML = safeRows
      .map((row) => {
        const statusLabel =
          typeof this.getClaimStatusLabel === "function"
            ? this.getClaimStatusLabel(row.status)
            : this.escapeHtml(row.status || "pending");

        const statusClass =
          typeof this.getClaimStatusClass === "function"
            ? this.getClaimStatusClass(row.status)
            : "";

        const dateText = this.escapeHtml(this.formatDate(row.created_at));
        const amount = this.formatCurrency(row.amount || 0);
        const noteText = row.message ? this.escapeHtml(row.message) : "";
        const payoutMethodText = row.payout_method ? this.escapeHtml(row.payout_method) : "";
        const payoutNetworkText = row.payout_network ? this.escapeHtml(row.payout_network) : "";
        const payoutAddressText = row.payout_address ? this.escapeHtml(row.payout_address) : "";
        const payoutContactText = row.payout_contact ? this.escapeHtml(row.payout_contact) : "";

        return (
          '<div class="affiliate-data-row affiliate-data-row--stacked">' +
          '<div class="affiliate-data-row-main">' +
          "<span>" +
          dateText +
          "</span>" +
          "<strong>" +
          amount +
          "</strong>" +
          "</div>" +
          '<div class="affiliate-data-row-sub">' +
          '<span class="affiliate-status-badge ' +
          statusClass +
          '">' +
          statusLabel +
          "</span>" +
          (noteText
            ? '<span class="affiliate-data-note">Note: ' + noteText + "</span>"
            : "") +
          (payoutMethodText
            ? '<span class="affiliate-data-note">Method: ' + payoutMethodText + "</span>"
            : "") +
          (payoutNetworkText
            ? '<span class="affiliate-data-note">Network: ' + payoutNetworkText + "</span>"
            : "") +
          (payoutAddressText
            ? '<span class="affiliate-data-note">Address: ' + payoutAddressText + "</span>"
            : "") +
          (payoutContactText
            ? '<span class="affiliate-data-note">Contact: ' + payoutContactText + "</span>"
            : "") +
          "</div>" +
          "</div>"
        );
      })
      .join("");
  }
});
