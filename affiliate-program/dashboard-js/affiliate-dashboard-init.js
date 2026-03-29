(function () {
  function getTabButtons() {
    return Array.from(
      document.querySelectorAll(
        ".affiliate-dashboard-tabs button, .affiliate-dashboard-tabs a, .affiliate-tabs button, .affiliate-tabs a, .affiliate-dashboard-nav button, .affiliate-dashboard-nav a, .affiliate-section-tabs button, .affiliate-section-tabs a, .affiliate-mobile-tabs button, .affiliate-mobile-tabs a"
      )
    );
  }

  function getSectionMap() {
    return {
      overview: document.getElementById("affiliateOverviewMount"),
      links: document.getElementById("affiliateLinksMount"),
      commissions: document.getElementById("affiliateCommissionsMount"),
      claims: document.getElementById("affiliateClaimsMount"),
      payouts: document.getElementById("affiliatePayoutsMount"),
      help: document.getElementById("affiliateHelpMount")
    };
  }

  function normalizeTabKey(button) {
    if (!button) return "";

    const explicit =
      String(button.getAttribute("data-affiliate-top-tab") || "")
        .trim()
        .toLowerCase();

    if (explicit) return explicit;

    const text = String(button.textContent || "")
      .trim()
      .toLowerCase();

    if (text.includes("overview")) return "overview";
    if (text.includes("link")) return "links";
    if (text.includes("commission")) return "commissions";
    if (text.includes("claim")) return "claims";
    if (text.includes("payout")) return "payouts";
    if (text.includes("help")) return "help";

    return "";
  }

  function setButtonActiveState(buttons, activeKey) {
    buttons.forEach(function (button) {
      const key = normalizeTabKey(button);
      const isActive = key === activeKey;

      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-selected", isActive ? "true" : "false");
    });
  }

  function showOnlySection(activeKey) {
    const sections = getSectionMap();

    Object.keys(sections).forEach(function (key) {
      const el = sections[key];
      if (!el) return;

      if (key === activeKey) {
        el.hidden = false;
        el.style.display = "";
      } else {
        el.hidden = true;
        el.style.display = "none";
      }
    });
  }

  function bindDashboardTabs() {
    const buttons = getTabButtons();
    if (!buttons.length) return;

    if (document.body.dataset.affiliateDashboardTabsBound === "true") {
      return;
    }
    document.body.dataset.affiliateDashboardTabsBound = "true";

    buttons.forEach(function (button) {
      button.addEventListener("click", function (event) {
        const key = normalizeTabKey(button);
        if (!key) return;

        event.preventDefault();

        setButtonActiveState(buttons, key);
        showOnlySection(key);

        const target = getSectionMap()[key];
        if (target) {
          target.scrollIntoView({
            behavior: "smooth",
            block: "start"
          });
        }
      });
    });

    const defaultButton =
      buttons.find(function (button) {
        return button.classList.contains("is-active");
      }) || buttons[0];

    const defaultKey = normalizeTabKey(defaultButton) || "overview";

    setButtonActiveState(buttons, defaultKey);
    showOnlySection(defaultKey);
  }

  window.AXIOM_AFFILIATE_DASHBOARD_INIT = {
    async boot() {
      if (
        !window.AXIOM_AFFILIATE_DASHBOARD ||
        typeof window.AXIOM_AFFILIATE_DASHBOARD.init !== "function"
      ) {
        throw new Error("AXIOM_AFFILIATE_DASHBOARD.init is missing.");
      }

      const result = await window.AXIOM_AFFILIATE_DASHBOARD.init();

      setTimeout(function () {
        bindDashboardTabs();
      }, 0);

      setTimeout(function () {
        bindDashboardTabs();
      }, 300);

      setTimeout(function () {
        bindDashboardTabs();
      }, 800);

      return result;
    }
  };
})();
