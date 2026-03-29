(function () {
  let pageBootPromise = null;

  function loadPartial(url, mountEl) {
    return (async function () {
      if (!mountEl) {
        return false;
      }

      if (mountEl.dataset.loaded === "true") {
        return true;
      }

      try {
        const response = await fetch(url, { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Failed to load " + url + " (" + response.status + ")");
        }

        mountEl.innerHTML = await response.text();
        mountEl.dataset.loaded = "true";
        mountEl.dataset.source = url;
        return true;
      } catch (error) {
        console.error("[Affiliate Program] Partial load failed:", url, error);
        mountEl.dataset.loaded = "false";
        return false;
      }
    })();
  }

  async function loadPageShell() {
    const heroMount = document.getElementById("affiliateHeroMount");
    const authMount = document.getElementById("affiliateAuthMount");
    const dashboardMount = document.getElementById("affiliateDashboardMount");

    const results = await Promise.all([
      loadPartial("partials/affiliate-hero.html", heroMount),
      loadPartial("partials/affiliate-auth.html", authMount),
      loadPartial("affiliate-dashboard.html", dashboardMount)
    ]);

    const shellReady = results.every(Boolean);

    window.AXIOM_AFFILIATE_PAGE_STATE = {
      shellReady: shellReady,
      heroReady: !!results[0],
      authReady: !!results[1],
      dashboardReady: !!results[2],
      loadedAt: new Date().toISOString()
    };

    document.dispatchEvent(
      new CustomEvent("axiom:affiliate-page-shell-ready", {
        detail: window.AXIOM_AFFILIATE_PAGE_STATE
      })
    );

    if (!shellReady) {
      throw new Error("Affiliate page shell did not fully load.");
    }

    return window.AXIOM_AFFILIATE_PAGE_STATE;
  }

  function bootAffiliatePage() {
    if (pageBootPromise) {
      return pageBootPromise;
    }

    pageBootPromise = (async function () {
      const state = await loadPageShell();

      if (
        window.AXIOM_AFFILIATE_DASHBOARD &&
        typeof window.AXIOM_AFFILIATE_DASHBOARD.init === "function"
      ) {
        await window.AXIOM_AFFILIATE_DASHBOARD.init();
      }

      return state;
    })().catch(function (error) {
      console.error("[Affiliate Program] Boot failed:", error);
      throw error;
    });

    return pageBootPromise;
  }

  window.AXIOM_AFFILIATE_PAGE_READY = function () {
    return pageBootPromise || Promise.resolve(window.AXIOM_AFFILIATE_PAGE_STATE || null);
  };

  window.AXIOM_AFFILIATE_PAGE_BOOT = bootAffiliatePage;

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      function () {
        bootAffiliatePage().catch(function () {});
      },
      { once: true }
    );
  } else {
    bootAffiliatePage().catch(function () {});
  }
})();
