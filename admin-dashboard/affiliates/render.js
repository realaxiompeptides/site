(function () {
  const state = window.AXIOM_ADMIN_AFFILIATES_STATE;
  const domApi = window.AXIOM_ADMIN_AFFILIATES_DOM;
  const utils = window.AXIOM_ADMIN_AFFILIATES_UTILS;

  function safeArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function safeText(value, fallback) {
    if (value === undefined || value === null || value === "") {
      return fallback;
    }
    return value;
  }

  function getSummaryValue(summary, keys, fallback = 0) {
    for (let i = 0; i < keys.length; i += 1) {
      const key = keys[i];
      if (summary && summary[key] !== undefined && summary[key] !== null) {
        return summary[key];
      }
    }
    return fallback;
  }

  function getAffiliateClaimable(item) {
    if (!item) return 0;

    return Number(
      item.available_to_claim ??
      item.availableToClaim ??
      item.claimable ??
      item.claimable_commission ??
      item.claimable_amount ??
      0
    ) || 0;
  }

  function getAffiliateReserved(item) {
    if (!item) return 0;

    return Number(
      item.pending_claim_amount ??
      item.pending_claims_amount ??
      item.reserved_claim_amount ??
      0
    ) || 0;
  }

  function getAffiliateClicks(item) {
    if (!item) return 0;

    return Number(
      item.total_clicks_live ??
      item.total_clicks ??
      0
    ) || 0;
  }

  function getAffiliateConversions(item) {
    if (!item) return 0;

    return Number(
      item.total_conversions_live ??
      item.total_conversions ??
      0
    ) || 0;
  }

  function getAffiliateEarned(item) {
    if (!item) return 0;

    return Number(
      item.total_commission_earned_live ??
      item.total_commission_earned ??
      item.total_earned ??
      item.earned_amount ??
      item.commission_amount ??
      0
    ) || 0;
  }

  function getAffiliatePaid(item) {
    if (!item) return 0;

    return Number(
      item.total_commission_paid_live ??
      item.total_commission_paid ??
      0
    ) || 0;
  }

  function getPendingClaimRequestCount(item) {
    if (!item) return 0;

    const rawCount =
      item.pending_claim_requests ??
      item.pending_claim_count ??
      item.pending_requests_count;

    if (rawCount !== undefined && rawCount !== null) {
      return Number(rawCount) || 0;
    }

    const payoutRequests = safeArray(state.payoutRequests);

    return payoutRequests.filter(function (row) {
      const rowAffiliateId =
        row?.affiliate_id ||
        row?.affiliates?.id ||
        row?.affiliate?.id ||
        "";

      const rowStatus = String(row?.status || "").trim().toLowerCase();

      return String(rowAffiliateId) === String(item.id) &&
        (rowStatus === "pending" || rowStatus === "approved");
    }).length;
  }

  function getPendingPayoutRequestsTotal() {
    const rows = safeArray(state.payoutRequests);

    return rows.filter(function (row) {
      const status = String(row?.status || "").trim().toLowerCase();
      return status === "pending";
    }).length;
  }

  function getPayoutRequestAffiliate(row) {
    return row?.affiliates || row?.affiliate || {};
  }

  function getClaimPaymentDetailsHtml(row) {
    const payoutMethod = utils.escapeHtml(
      safeText(row?.payout_method || row?.payoutMethod, "—")
    );
    const payoutNetwork = utils.escapeHtml(
      safeText(row?.payout_network || row?.payoutNetwork, "—")
    );
    const payoutAddress = utils.escapeHtml(
      safeText(row?.payout_address || row?.payoutAddress, "—")
    );
    const backupContact = utils.escapeHtml(
      safeText(
        row?.backup_contact ||
        row?.backupContact ||
        row?.payout_contact ||
        row?.payoutContact,
        "—"
      )
    );

    return (
      '<div class="affiliates-admin-detail-row"><span>Payout Method</span><strong>' + payoutMethod + '</strong></div>' +
      '<div class="affiliates-admin-detail-row"><span>Network</span><strong>' + payoutNetwork + '</strong></div>' +
      '<div class="affiliates-admin-detail-row"><span>Wallet / Address</span><strong>' + payoutAddress + '</strong></div>' +
      '<div class="affiliates-admin-detail-row"><span>Backup Contact</span><strong>' + backupContact + '</strong></div>'
    );
  }

  function getPayoutRequestActionsHtml(row) {
    const claimId = utils.escapeHtml(row?.id || "");
    const statusRaw = String(row?.status || "pending").trim().toLowerCase();

    if (statusRaw === "pending") {
      return (
        '<div class="affiliates-admin-actions">' +
          '<button type="button" class="affiliates-admin-action-btn affiliates-admin-action-btn-approve" data-claim-id="' + claimId + '" data-claim-status="approved">Approve</button>' +
          '<button type="button" class="affiliates-admin-action-btn affiliates-admin-action-btn-reject" data-claim-id="' + claimId + '" data-claim-status="rejected">Reject</button>' +
        "</div>"
      );
    }

    if (statusRaw === "approved") {
      return (
        '<div class="affiliates-admin-actions">' +
          '<button type="button" class="affiliates-admin-action-btn affiliates-admin-action-btn-approve" data-claim-id="' + claimId + '" data-claim-status="paid">Mark Paid</button>' +
          '<button type="button" class="affiliates-admin-action-btn affiliates-admin-action-btn-reject" data-claim-id="' + claimId + '" data-claim-status="rejected">Reject</button>' +
        "</div>"
      );
    }

    if (statusRaw === "paid") {
      return (
        '<div class="affiliates-admin-actions">' +
          '<button type="button" class="affiliates-admin-action-btn" data-claim-id="' + claimId + '" data-claim-status="approved">Mark Unpaid</button>' +
        "</div>"
      );
    }

    if (statusRaw === "rejected") {
      return (
        '<div class="affiliates-admin-actions">' +
          '<button type="button" class="affiliates-admin-action-btn" data-claim-id="' + claimId + '" data-claim-status="approved">Restore</button>' +
        "</div>"
      );
    }

    return '<span class="affiliates-admin-muted">—</span>';
  }

  function renderStats() {
    const dom = domApi.get();
    const summary = state.summary || {
      total: 0,
      pending: 0,
      approved: 0,
      claimable: 0
    };

    const totalValue = getSummaryValue(summary, ["total", "total_affiliates"], 0);
    const approvedValue = getSummaryValue(summary, ["approved", "approved_affiliates"], 0);
    const claimableValue = getSummaryValue(
      summary,
      ["claimable", "claimable_total", "total_claimable", "available_to_claim_total"],
      0
    );

    const pendingPayoutRequests = getPendingPayoutRequestsTotal();

    domApi.setText(dom.statTotal, String(Number(totalValue) || 0));
    domApi.setText(dom.statPending, String(Number(pendingPayoutRequests) || 0));
    domApi.setText(dom.statApproved, String(Number(approvedValue) || 0));
    domApi.setText(dom.statClaimable, utils.formatCurrency(Number(claimableValue) || 0));
  }

  function renderLoading() {
    const dom = domApi.get();

    if (dom.tableBody) {
      domApi.setHTML(dom.tableBody, '<tr><td colspan="11">Loading affiliates...</td></tr>');
    }

    const payoutRequestsTableBody =
      dom.payoutRequestsTableBody ||
      dom.payoutRequestsBody ||
      document.getElementById("affiliatePayoutRequestsTableBody");

    if (payoutRequestsTableBody) {
      domApi.setHTML(
        payoutRequestsTableBody,
        '<tr><td colspan="6">Loading payout requests...</td></tr>'
      );
    }
  }

  function renderError(message) {
    const dom = domApi.get();

    if (dom.tableBody) {
      domApi.setHTML(
        dom.tableBody,
        '<tr><td colspan="11">Failed to load affiliates: ' +
          utils.escapeHtml(message || "Unknown error") +
          '</td></tr>'
      );
    }

    const payoutRequestsTableBody =
      dom.payoutRequestsTableBody ||
      dom.payoutRequestsBody ||
      document.getElementById("affiliatePayoutRequestsTableBody");

    if (payoutRequestsTableBody) {
      domApi.setHTML(
        payoutRequestsTableBody,
        '<tr><td colspan="6">Failed to load payout requests: ' +
          utils.escapeHtml(message || "Unknown error") +
          '</td></tr>'
      );
    }
  }

  function renderEmpty() {
    const dom = domApi.get();
    if (!dom.tableBody) return;
    domApi.setHTML(dom.tableBody, '<tr><td colspan="11">No affiliates found.</td></tr>');
  }

  function renderTable() {
    const dom = domApi.get();
    const rows = safeArray(state.filteredAffiliates);

    if (!dom.tableBody) return;

    if (!rows.length) {
      renderEmpty();
      return;
    }

    domApi.setHTML(
      dom.tableBody,
      rows
        .map(function (item) {
          const statusValue = utils.escapeHtml(item.status || "pending");
          const statusClass = "affiliate-admin-status-" + statusValue;
          const clicks = getAffiliateClicks(item);
          const conversions = getAffiliateConversions(item);
          const earned = getAffiliateEarned(item);
          const claimable = getAffiliateClaimable(item);
          const pendingClaimRequests = getPendingClaimRequestCount(item);
          const affiliateId = utils.escapeHtml(item.id || "");

          return (
            '<tr>' +
              '<td data-label="Name">' + utils.escapeHtml(item.full_name || "—") + '</td>' +
              '<td data-label="Email">' + utils.escapeHtml(item.email || "—") + '</td>' +
              '<td data-label="Discord">' + utils.escapeHtml(item.discord_username || "—") + '</td>' +
              '<td data-label="Status"><span class="affiliate-admin-status ' + statusClass + '">' + statusValue + '</span></td>' +
              '<td data-label="Code">' + utils.escapeHtml(item.referral_code || "—") + '</td>' +
              '<td data-label="Clicks">' + clicks + '</td>' +
              '<td data-label="Conversions">' + conversions + '</td>' +
              '<td data-label="Earned">' + utils.formatCurrency(earned) + '</td>' +
              '<td data-label="Claimable">' + utils.formatCurrency(claimable) + '</td>' +
              '<td data-label="Pending Claims">' + pendingClaimRequests + '</td>' +
              '<td data-label="Actions">' +
                '<div class="affiliates-admin-actions">' +
                  '<button type="button" class="affiliates-admin-action-btn" data-action="view" data-affiliate-id="' + affiliateId + '">View</button>' +
                  '<button type="button" class="affiliates-admin-action-btn affiliates-admin-action-btn-approve" data-action="approve" data-affiliate-id="' + affiliateId + '">Approve</button>' +
                  '<button type="button" class="affiliates-admin-action-btn affiliates-admin-action-btn-reject" data-action="reject" data-affiliate-id="' + affiliateId + '">Reject</button>' +
                  '<button type="button" class="affiliates-admin-action-btn affiliates-admin-action-btn-suspend" data-action="suspend" data-affiliate-id="' + affiliateId + '">Suspend</button>' +
                '</div>' +
              '</td>' +
            '</tr>'
          );
        })
        .join("")
    );
  }

  function setDetailText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function renderPayoutRequests() {
    const dom = domApi.get();
    const tableBody =
      dom.payoutRequestsTableBody ||
      dom.payoutRequestsBody ||
      document.getElementById("affiliatePayoutRequestsTableBody");

    if (!tableBody) return;

    const rows = safeArray(state.payoutRequests);

    if (!rows.length) {
      tableBody.innerHTML = '<tr><td colspan="6">No payout requests found.</td></tr>';
      return;
    }

    tableBody.innerHTML = rows
      .map(function (row) {
        const affiliate = getPayoutRequestAffiliate(row);
        const statusRaw = String(row.status || "pending").trim().toLowerCase();
        const statusLabel = utils.escapeHtml(statusRaw || "pending");
        const statusClass = "affiliate-admin-status-" + statusRaw;

        return (
          '<tr>' +
            '<td>' + utils.escapeHtml(affiliate.full_name || affiliate.email || "—") + '</td>' +
            '<td>' + utils.escapeHtml(affiliate.email || "—") + '</td>' +
            '<td>' + utils.formatCurrency(Number(row.amount || 0)) + '</td>' +
            '<td><span class="affiliate-admin-status ' + statusClass + '">' + statusLabel + '</span></td>' +
            '<td>' + utils.formatDate(row.created_at) + '</td>' +
            '<td>' + getPayoutRequestActionsHtml(row) + '</td>' +
          '</tr>'
        );
      })
      .join("");
  }

  function renderAffiliateDetail(summary, detailData) {
    const safeSummary = summary || {};
    const safeDetailData = detailData || {
      conversions: [],
      claims: [],
      payouts: []
    };

    setDetailText("affiliateDetailName", safeSummary.full_name || "Affiliate");
    setDetailText("affiliateDetailNameInline", safeSummary.full_name || "Affiliate");
    setDetailText("affiliateDetailEmail", safeSummary.email || "—");
    setDetailText("affiliateDetailDiscord", safeSummary.discord_username || "—");
    setDetailText("affiliateDetailStatus", safeSummary.status || "—");
    setDetailText("affiliateDetailCode", safeSummary.referral_code || "—");
    setDetailText(
      "affiliateDetailCommission",
      safeSummary
        ? (
            Number(safeSummary.commission_value || 0) +
            (String(safeSummary.commission_type || "percent").toLowerCase() === "fixed" ? " fixed" : "%")
          )
        : "—"
    );
    setDetailText(
      "affiliateDetailDiscount",
      safeSummary
        ? (
            Number(safeSummary.discount_value || 0) +
            (String(safeSummary.discount_type || "percent").toLowerCase() === "fixed" ? " fixed" : "%")
          )
        : "—"
    );
    setDetailText("affiliateDetailClicks", String(getAffiliateClicks(safeSummary)));
    setDetailText("affiliateDetailConversions", String(getAffiliateConversions(safeSummary)));
    setDetailText("affiliateDetailClaimable", utils.formatCurrency(getAffiliateClaimable(safeSummary)));
    setDetailText("affiliateDetailReserved", utils.formatCurrency(getAffiliateReserved(safeSummary)));
    setDetailText("affiliateDetailEarned", utils.formatCurrency(getAffiliateEarned(safeSummary)));
    setDetailText("affiliateDetailPaid", utils.formatCurrency(getAffiliatePaid(safeSummary)));
    setDetailText("affiliateDetailCreatedAt", utils.formatDate(safeSummary.created_at));

    const payoutAffiliateId = document.getElementById("affiliatePayoutAffiliateId");
    if (payoutAffiliateId) payoutAffiliateId.value = safeSummary.id || "";

    const compAffiliateId = document.getElementById("affiliateCompSettingsAffiliateId");
    const commissionTypeInput = document.getElementById("affiliateCommissionType");
    const commissionValueInput = document.getElementById("affiliateCommissionValue");
    const discountTypeInput = document.getElementById("affiliateDiscountType");
    const discountValueInput = document.getElementById("affiliateDiscountValue");
    const compMessage = document.getElementById("affiliateCompSettingsMessage");

    if (compAffiliateId) compAffiliateId.value = safeSummary.id || "";
    if (commissionTypeInput) {
      commissionTypeInput.value = String(safeSummary.commission_type || "percent").toLowerCase();
    }
    if (commissionValueInput) {
      commissionValueInput.value = Number(safeSummary.commission_value || 0);
    }
    if (discountTypeInput) {
      discountTypeInput.value = String(safeSummary.discount_type || "percent").toLowerCase();
    }
    if (discountValueInput) {
      discountValueInput.value = Number(safeSummary.discount_value || 0);
    }

    if (compMessage) {
      compMessage.hidden = true;
      compMessage.textContent = "";
      compMessage.className = "affiliates-admin-inline-message";
    }

    const conversionsMount = document.getElementById("affiliateDetailConversionsList");
    const claimsMount = document.getElementById("affiliateDetailClaimsList");
    const payoutsMount = document.getElementById("affiliateDetailPayoutsList");

    const conversions = safeArray(safeDetailData.conversions);
    const claims = safeArray(safeDetailData.claims);
    const payouts = safeArray(safeDetailData.payouts);

    if (conversionsMount) {
      conversionsMount.innerHTML = !conversions.length
        ? '<div class="affiliates-admin-empty">No conversions yet.</div>'
        : conversions.map(function (row) {
            return (
              '<div class="affiliates-admin-stack-row">' +
                '<span>' +
                  'Order #' + utils.escapeHtml(row.order_number || "—") + ' · ' +
                  utils.escapeHtml(row.commission_status || "pending") + ' · ' +
                  utils.formatDate(row.created_at) +
                '</span>' +
                '<strong>' + utils.formatCurrency(row.commission_amount || 0) + '</strong>' +
              '</div>'
            );
          }).join("");
    }

    if (claimsMount) {
      claimsMount.innerHTML = !claims.length
        ? '<div class="affiliates-admin-empty">No claim requests yet.</div>'
        : claims.map(function (row) {
            const rowStatus = String(row.status || "pending").trim().toLowerCase();
            let buttons = "";

            if (rowStatus === "pending") {
              buttons =
                '<div class="affiliates-admin-actions">' +
                  '<button type="button" class="affiliates-admin-action-btn affiliates-admin-action-btn-approve" data-claim-id="' + utils.escapeHtml(row.id) + '" data-claim-status="approved">Approve</button>' +
                  '<button type="button" class="affiliates-admin-action-btn affiliates-admin-action-btn-reject" data-claim-id="' + utils.escapeHtml(row.id) + '" data-claim-status="rejected">Reject</button>' +
                '</div>';
            } else if (rowStatus === "approved") {
              buttons =
                '<div class="affiliates-admin-actions">' +
                  '<button type="button" class="affiliates-admin-action-btn affiliates-admin-action-btn-approve" data-claim-id="' + utils.escapeHtml(row.id) + '" data-claim-status="paid">Mark Paid</button>' +
                  '<button type="button" class="affiliates-admin-action-btn affiliates-admin-action-btn-reject" data-claim-id="' + utils.escapeHtml(row.id) + '" data-claim-status="rejected">Reject</button>' +
                '</div>';
            } else if (rowStatus === "paid") {
              buttons =
                '<div class="affiliates-admin-actions">' +
                  '<button type="button" class="affiliates-admin-action-btn" data-claim-id="' + utils.escapeHtml(row.id) + '" data-claim-status="approved">Mark Unpaid</button>' +
                '</div>';
            } else if (rowStatus === "rejected") {
              buttons =
                '<div class="affiliates-admin-actions">' +
                  '<button type="button" class="affiliates-admin-action-btn" data-claim-id="' + utils.escapeHtml(row.id) + '" data-claim-status="approved">Restore</button>' +
                '</div>';
            }

            return (
              '<div class="affiliates-admin-detail-card">' +
                '<div class="affiliates-admin-detail-list">' +
                  '<div class="affiliates-admin-detail-row"><span>Status</span><strong>' + utils.escapeHtml(row.status || "pending") + '</strong></div>' +
                  '<div class="affiliates-admin-detail-row"><span>Amount</span><strong>' + utils.formatCurrency(row.amount || 0) + '</strong></div>' +
                  '<div class="affiliates-admin-detail-row"><span>Discord</span><strong>' + utils.escapeHtml(row.discord_contact || "—") + '</strong></div>' +
                  '<div class="affiliates-admin-detail-row"><span>Created</span><strong>' + utils.formatDate(row.created_at) + '</strong></div>' +
                  '<div class="affiliates-admin-detail-row"><span>Updated</span><strong>' + utils.formatDate(row.updated_at) + '</strong></div>' +
                  '<div class="affiliates-admin-detail-row"><span>Message</span><strong>' + utils.escapeHtml(row.message || "—") + '</strong></div>' +
                  getClaimPaymentDetailsHtml(row) +
                '</div>' +
                buttons +
              '</div>'
            );
          }).join("");
    }

    if (payoutsMount) {
      payoutsMount.innerHTML = !payouts.length
        ? '<div class="affiliates-admin-empty">No payouts yet.</div>'
        : payouts.map(function (row) {
            const payoutMethod = utils.escapeHtml(row.payout_method || "Payout");
            const payoutStatus = utils.escapeHtml(row.payout_status || "pending");
            const payoutReference = utils.escapeHtml(row.payout_reference || "—");
            const payoutNotes = utils.escapeHtml(row.notes || "—");

            return (
              '<div class="affiliates-admin-detail-card">' +
                '<div class="affiliates-admin-detail-list">' +
                  '<div class="affiliates-admin-detail-row"><span>Amount</span><strong>' + utils.formatCurrency(row.amount || 0) + '</strong></div>' +
                  '<div class="affiliates-admin-detail-row"><span>Method</span><strong>' + payoutMethod + '</strong></div>' +
                  '<div class="affiliates-admin-detail-row"><span>Status</span><strong>' + payoutStatus + '</strong></div>' +
                  '<div class="affiliates-admin-detail-row"><span>Reference</span><strong>' + payoutReference + '</strong></div>' +
                  '<div class="affiliates-admin-detail-row"><span>Paid At</span><strong>' + utils.formatDate(row.paid_at || row.created_at) + '</strong></div>' +
                  '<div class="affiliates-admin-detail-row"><span>Notes</span><strong>' + payoutNotes + '</strong></div>' +
                '</div>' +
              '</div>'
            );
          }).join("");
    }
  }

  window.AXIOM_ADMIN_AFFILIATES_RENDER = {
    renderStats: renderStats,
    renderLoading: renderLoading,
    renderError: renderError,
    renderEmpty: renderEmpty,
    renderTable: renderTable,
    renderPayoutRequests: renderPayoutRequests,
    renderAffiliateDetail: renderAffiliateDetail
  };
})();
