Object.assign(window.AXIOM_AFFILIATE_DASHBOARD, {
  async renderDashboard() {
    const profile = this.affiliateProfile;
    const email = (this.currentUser && this.currentUser.email) || '—';
    const fullName =
      (profile && profile.full_name) ||
      (this.currentUser &&
        this.currentUser.user_metadata &&
        this.currentUser.user_metadata.full_name) ||
      '—';

    this.setText('affiliateDashboardEmail', email);
    this.setText('affiliateDashboardStatus', profile ? profile.status : 'pending');
    this.setText('affiliateDashboardFullName', fullName);
    this.setText('affiliateDashboardEmailRow', email);
    this.setText('affiliateDashboardCode', profile ? profile.referral_code : '—');
    this.setText(
      'affiliateDashboardCommissionRate',
      profile ? String(profile.commission_value || 0) + '%' : '—'
    );
    this.setText(
      'affiliateDashboardDiscountRate',
      profile ? String(profile.discount_value || 0) + '%' : '—'
    );

    this.syncReferralCodeUi(profile ? profile.referral_code || '' : '');

    const stats = await this.fetchStats();

    this.setText('affiliateClicksCount', this.formatNumber(stats.clicks || 0));
    this.setText('affiliateConversionsCount', this.formatNumber(stats.conversions || 0));
    this.setText('affiliateClaimableAmount', this.formatMoney(stats.availableToClaim || 0));
    this.setText('affiliatePaidAmount', this.formatMoney(stats.paid || 0));

    const claimAvailableEl = document.getElementById('affiliateClaimAvailableAmount');
    if (claimAvailableEl) {
      claimAvailableEl.textContent = this.formatMoney(stats.availableToClaim || 0);
    }

    const claimReservedEl = document.getElementById('affiliateClaimReservedAmount');
    if (claimReservedEl) {
      claimReservedEl.textContent = this.formatMoney(stats.pendingClaims || 0);
    }

    const claimAmountInput = this.getClaimAmountInput();
    if (claimAmountInput) {
      claimAmountInput.max = String(Number(stats.availableToClaim || 0).toFixed(2));
      claimAmountInput.placeholder =
        Number(stats.availableToClaim || 0) > 0
          ? Number(stats.availableToClaim || 0).toFixed(2)
          : '0.00';
      claimAmountInput.disabled = Number(stats.availableToClaim || 0) <= 0;

      if (Number(stats.availableToClaim || 0) > 0 && !claimAmountInput.value) {
        claimAmountInput.value = Number(stats.availableToClaim || 0).toFixed(2);
      }

      if (Number(stats.availableToClaim || 0) <= 0) {
        claimAmountInput.value = '';
      }
    }

    const claimNoteInput = this.getClaimNoteInput();
    if (claimNoteInput) {
      claimNoteInput.disabled = Number(stats.availableToClaim || 0) <= 0;
    }

    const payoutMethodInput = this.getClaimPayoutMethodInput();
    if (payoutMethodInput) {
      payoutMethodInput.disabled = Number(stats.availableToClaim || 0) <= 0;
    }

    const payoutNetworkInput = this.getClaimPayoutNetworkInput();
    if (payoutNetworkInput) {
      payoutNetworkInput.disabled = Number(stats.availableToClaim || 0) <= 0;
    }

    const payoutAddressInput = this.getClaimPayoutAddressInput();
    if (payoutAddressInput) {
      payoutAddressInput.disabled = Number(stats.availableToClaim || 0) <= 0;
    }

    const payoutContactInput = this.getClaimPayoutContactInput();
    if (payoutContactInput) {
      payoutContactInput.disabled = Number(stats.availableToClaim || 0) <= 0;
    }

    if (Number(stats.availableToClaim || 0) <= 0) {
      this.setClaimButtonState('disabled');
    } else {
      this.setClaimButtonState('ready');
    }

    this.updateClaimPayoutFieldVisibility();
    this.generateTrackingLink();
    this.renderRecentCommissions(stats.recentCommissions || []);
    this.renderPayouts(stats.payouts || []);
    this.renderClaims(stats.claims || []);
  },

  renderRecentCommissions(rows) {
    const mount = document.getElementById('affiliateRecentCommissionsList');
    if (!mount) return;

    if (!Array.isArray(rows) || !rows.length) {
      mount.innerHTML = '<div class="affiliate-empty-state">No commissions yet.</div>';
      return;
    }

    mount.innerHTML = rows
      .map((row) => {
        return (
          '<div class="affiliate-data-row">' +
            '<span>Order #' + this.escapeHtml(row.order_number || '—') + '</span>' +
            '<strong>' + this.formatMoney(row.commission_amount || 0) + '</strong>' +
          '</div>'
        );
      })
      .join('');
  },

  renderPayouts(rows) {
    const mount = document.getElementById('affiliatePayoutsList');
    if (!mount) return;

    if (!Array.isArray(rows) || !rows.length) {
      mount.innerHTML = '<div class="affiliate-empty-state">No payouts yet.</div>';
      return;
    }

    mount.innerHTML = rows
      .map((row) => {
        return (
          '<div class="affiliate-data-row affiliate-data-row--stacked">' +
            '<div class="affiliate-data-row-main">' +
              '<span>' + this.escapeHtml(this.formatDate(row.paid_at || row.created_at)) + '</span>' +
              '<strong>' + this.formatMoney(row.amount || 0) + '</strong>' +
            '</div>' +
            '<div class="affiliate-data-row-sub">' +
              '<span class="affiliate-data-note">' +
                this.escapeHtml(row.payout_method || 'Payout') +
              '</span>' +
            '</div>' +
          '</div>'
        );
      })
      .join('');
  },

  renderClaims(rows) {
    const mount = document.getElementById('affiliateClaimsList');
    const summaryEl = document.getElementById('affiliateClaimsSummary');

    if (summaryEl) {
      summaryEl.textContent =
        Array.isArray(rows) && rows.length
          ? 'Your past and current claim requests are shown below.'
          : 'No claim requests submitted yet.';
    }

    if (!mount) return;

    if (!Array.isArray(rows) || !rows.length) {
      mount.innerHTML = '<div class="affiliate-empty-state">No claim requests yet.</div>';
      return;
    }

    mount.innerHTML = rows
      .map((row) => {
        return (
          '<div class="affiliate-data-row affiliate-data-row--stacked">' +
            '<div class="affiliate-data-row-main">' +
              '<span>' + this.escapeHtml(this.formatDate(row.created_at)) + '</span>' +
              '<strong>' + this.formatMoney(row.amount || 0) + '</strong>' +
            '</div>' +
            '<div class="affiliate-data-row-sub">' +
              '<span class="affiliate-data-note">' + this.escapeHtml(row.status || 'pending') + '</span>' +
            '</div>' +
          '</div>'
        );
      })
      .join('');
  }
});
