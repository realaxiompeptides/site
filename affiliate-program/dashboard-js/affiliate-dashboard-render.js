Object.assign(window.AXIOM_AFFILIATE_DASHBOARD, {
  async renderDashboard() {
    if (this.isRenderingDashboard) {
      return;
    }

    this.isRenderingDashboard = true;

    try {
      const profile = this.affiliateProfile;
      const email = (this.currentUser && this.currentUser.email) || "—";
      const fullName =
        (profile && profile.full_name) ||
        (this.currentUser &&
          this.currentUser.user_metadata &&
          this.currentUser.user_metadata.full_name) ||
        "—";

      this.setText("affiliateDashboardEmail", email);
      this.setText("affiliateDashboardEmailRow", email);
      this.setText("affiliateDashboardFullName", fullName);
      this.setText("affiliateDashboardStatus", (profile && profile.status) || "pending");
      this.setText("affiliateDashboardCode", (profile && profile.referral_code) || "—");
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

      const stats = await this.fetchStats();

      console.log("[Affiliate Dashboard] renderDashboard stats:", stats);

      this.setText("affiliateClicksCount", String(stats.clicks || 0));
      this.setText("affiliateConversionsCount", String(stats.conversions || 0));
      this.setText("affiliateClaimableAmount", this.formatMoney(stats.availableToClaim || 0));
      this.setText("affiliatePaidAmount", this.formatMoney(stats.paid || 0));
      this.setText("affiliatePendingClaimsAmount", this.formatMoney(stats.pendingClaims || 0));
      this.setText("affiliateApprovedClaimsAmount", this.formatMoney(stats.approvedClaims || 0));
      this.setText("affiliateRejectedClaimsAmount", this.formatMoney(stats.rejectedClaims || 0));

      const claimAmountInput = this.getClaimAmountInput();
      if (claimAmountInput) {
        claimAmountInput.max = String(this.toNumber(stats.availableToClaim, 0).toFixed(2));
        claimAmountInput.placeholder =
          this.toNumber(stats.availableToClaim, 0) > 0
            ? this.toNumber(stats.availableToClaim, 0).toFixed(2)
            : "0.00";
        claimAmountInput.disabled = this.toNumber(stats.availableToClaim, 0) <= 0;

        if (this.toNumber(stats.availableToClaim, 0) > 0 && !claimAmountInput.value) {
          claimAmountInput.value = this.toNumber(stats.availableToClaim, 0).toFixed(2);
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

      const backupContactInput = this.getClaimBackupContactInput();
      if (backupContactInput) {
        backupContactInput.disabled = this.toNumber(stats.availableToClaim, 0) <= 0;
      }

      if (this.toNumber(stats.availableToClaim, 0) <= 0) {
        this.setClaimButtonState("disabled");
      } else {
        this.setClaimButtonState("ready");
      }

      const claimAvailableEl = document.getElementById("affiliateClaimAvailableAmount");
      if (claimAvailableEl) {
        claimAvailableEl.textContent = this.formatMoney(stats.availableToClaim || 0);
      }

      const claimReservedEl = document.getElementById("affiliateClaimReservedAmount");
      if (claimReservedEl) {
        claimReservedEl.textContent = this.formatMoney(
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

      const defaultLink =
        profile && profile.referral_code
          ? this.buildAffiliateUrl("/")
          : "";

      const generatedLinkInput = document.getElementById("affiliateGeneratedLink");
      if (generatedLinkInput) {
        generatedLinkInput.value = defaultLink;
      }

      this.updateClaimPayoutFieldVisibility();
      this.renderRecentCommissions(stats.recentCommissions || []);
      this.renderPayouts(stats.payouts || []);
      this.renderClaims(stats.claims || []);
    } catch (error) {
      console.error("[Affiliate Dashboard] Render failed:", error);
      this.setMessage("Failed to load affiliate dashboard data.", "error");
    } finally {
      this.isRenderingDashboard = false;
    }
  },

  renderRecentCommissions(rows) {
    const mount = document.getElementById("affiliateRecentCommissionsList");
    if (!mount) {
      console.error("[Affiliate Dashboard] Missing #affiliateRecentCommissionsList");
      return;
    }

    if (!rows || !rows.length) {
      mount.innerHTML = '<div class="affiliate-empty-state">No commissions yet.</div>';
      return;
    }

    mount.innerHTML = rows
      .map((row) => {
        const statusText = this.getCommissionStatusLabel(
          row.display_status || row.commission_status || "pending"
        );

        return (
          '<div class="affiliate-data-row">' +
            "<span>Order #" + (row.order_number || "—") + " · " + statusText + "</span>" +
            "<strong>" + this.formatMoney(row.commission_amount || 0) + "</strong>" +
          "</div>"
        );
      })
      .join("");
  },

  renderPayouts(rows) {
    const mount = document.getElementById("affiliatePayoutsList");
    if (!mount) {
      console.error("[Affiliate Dashboard] Missing #affiliatePayoutsList");
      return;
    }

    if (!rows || !rows.length) {
      mount.innerHTML = '<div class="affiliate-empty-state">No payouts yet.</div>';
      return;
    }

    mount.innerHTML = rows
      .map((row) => {
        const statusLabel = this.getPayoutStatusLabel(row.payout_status);
        const statusClass = this.getPayoutStatusClass(row.payout_status);
        const dateText = this.escapeHtml(this.formatDate(row.paid_at || row.created_at));
        const amount = this.formatMoney(row.amount || 0);
        const methodText = row.payout_method ? this.escapeHtml(row.payout_method) : "Payout";
        const referenceText = row.payout_reference ? this.escapeHtml(row.payout_reference) : "";
        const notesText = row.notes ? this.escapeHtml(row.notes) : "";

        return (
          '<div class="affiliate-data-row affiliate-data-row--stacked">' +
            '<div class="affiliate-data-row-main">' +
              "<span>" + dateText + "</span>" +
              "<strong>" + amount + "</strong>" +
            "</div>" +
            '<div class="affiliate-data-row-sub">' +
              '<span class="affiliate-status-badge ' + statusClass + '">' + statusLabel + "</span>" +
              '<span class="affiliate-data-note">' + methodText + (referenceText ? " · " + referenceText : "") + "</span>" +
              (notesText ? '<span class="affiliate-data-note">' + notesText + "</span>" : "") +
            "</div>" +
          "</div>"
        );
      })
      .join("");
  },

  renderClaims(rows) {
    const mount = document.getElementById("affiliateClaimsList");
    const summaryEl = document.getElementById("affiliateClaimsSummary");

    if (!mount) {
      console.error("[Affiliate Dashboard] Missing #affiliateClaimsList");
      return;
    }

    if (summaryEl) {
      if (!rows || !rows.length) {
        summaryEl.textContent = "No claim requests submitted yet.";
      } else {
        const reservedCount = rows.filter((row) => {
          const status = String(row.status || "").trim().toLowerCase();
          return status === "pending" || status === "approved";
        }).length;

        summaryEl.textContent =
          reservedCount > 0
            ? "Pending and approved claim requests stay reserved until they are reviewed or paid."
            : "Your past and current claim requests are shown below.";
      }
    }

    if (!rows || !rows.length) {
      mount.innerHTML = '<div class="affiliate-empty-state">No claim requests yet.</div>';
      return;
    }

    mount.innerHTML = rows
      .map((row) => {
        const statusLabel = this.getClaimStatusLabel(row.status);
        const statusClass = this.getClaimStatusClass(row.status);
        const dateText = this.escapeHtml(this.formatDate(row.created_at));
        const amount = this.formatMoney(row.amount || 0);
        const noteText = row.message ? this.escapeHtml(row.message) : "";
        const payoutMethodText = row.payout_method ? this.escapeHtml(row.payout_method) : "";
        const payoutNetworkText = row.payout_network ? this.escapeHtml(row.payout_network) : "";
        const payoutAddressText = row.payout_address ? this.escapeHtml(row.payout_address) : "";
        const payoutContactText = row.payout_contact ? this.escapeHtml(row.payout_contact) : "";

        return (
          '<div class="affiliate-data-row affiliate-data-row--stacked">' +
            '<div class="affiliate-data-row-main">' +
              "<span>" + dateText + "</span>" +
              "<strong>" + amount + "</strong>" +
            "</div>" +
            '<div class="affiliate-data-row-sub">' +
              '<span class="affiliate-status-badge ' + statusClass + '">' + statusLabel + "</span>' +
              (noteText ? '<span class="affiliate-data-note">Note: ' + noteText + "</span>" : "") +
              (payoutMethodText ? '<span class="affiliate-data-note">Method: ' + payoutMethodText + "</span>" : "") +
              (payoutNetworkText ? '<span class="affiliate-data-note">Network: ' + payoutNetworkText + "</span>" : "") +
              (payoutAddressText ? '<span class="affiliate-data-note">Address: ' + payoutAddressText + "</span>" : "") +
              (payoutContactText ? '<span class="affiliate-data-note">Contact: ' + payoutContactText + "</span>" : "") +
            "</div>" +
          "</div>"
        );
      })
      .join("");
  }
});
