(function () {
  const VERSION = "20260329-2000";

  const MODULES = [
    "dashboard-js/affiliate-dashboard-core.js",
    "dashboard-js/affiliate-dashboard-auth.js",
    "dashboard-js/affiliate-dashboard-data.js",
    "dashboard-js/affiliate-dashboard-claims.js",
    "dashboard-js/affiliate-dashboard-referral.js",
    "dashboard-js/affiliate-dashboard-render.js",
    "dashboard-js/affiliate-dashboard-init.js"
  ];

  let modulesPromise = null;
  let bootPromise = null;

  function withVersion(src) {
    return src + (src.includes("?") ? "&" : "?") + "v=" + encodeURIComponent(VERSION);
  }

  function getBasePath() {
    const currentScript = document.currentScript;

    if (currentScript && currentScript.src) {
      return currentScript.src.substring(0, currentScript.src.lastIndexOf("/") + 1);
    }

    const scripts = Array.from(document.querySelectorAll("script[src]"));
    const matched = scripts.find(function (script) {
      return /affiliate-dashboard\.js(\?|$)/i.test(script.getAttribute("src") || "");
    });

    if (matched && matched.src) {
      return matched.src.substring(0, matched.src.lastIndexOf("/") + 1);
    }

    const pathname = window.location.pathname || "";
    const affiliateFolderIndex = pathname.toLowerCase().indexOf("/affiliate-program/");
    if (affiliateFolderIndex !== -1) {
      return (
        window.location.origin +
        pathname.slice(0, affiliateFolderIndex + "/affiliate-program/".length)
      );
    }

    return window.location.origin + "/";
  }

  const BASE_PATH = getBasePath();

  function buildModuleUrl(src) {
    return new URL(withVersion(src), BASE_PATH).toString();
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      const existing = document.querySelector('[data-affiliate-module="' + src + '"]');

      if (existing) {
        if (existing.dataset.loaded === "true") {
          resolve();
          return;
        }

        existing.addEventListener(
          "load",
          function () {
            existing.dataset.loaded = "true";
            resolve();
          },
          { once: true }
        );

        existing.addEventListener(
          "error",
          function () {
            reject(new Error("Failed to load " + src));
          },
          { once: true }
        );
        return;
      }

      const script = document.createElement("script");
      script.src = buildModuleUrl(src);
      script.defer = true;
      script.dataset.affiliateModule = src;

      script.addEventListener(
        "load",
        function () {
          script.dataset.loaded = "true";
          resolve();
        },
        { once: true }
      );

      script.addEventListener(
        "error",
        function () {
          reject(new Error("Failed to load " + src + " from " + script.src));
        },
        { once: true }
      );

      document.head.appendChild(script);
    });
  }

  async function loadAffiliateDashboardModules() {
    if (modulesPromise) {
      return modulesPromise;
    }

    modulesPromise = (async function () {
      console.log("[Affiliate Dashboard] Base path:", BASE_PATH);

      for (const src of MODULES) {
        const fullUrl = buildModuleUrl(src);
        console.log("[Affiliate Dashboard] Loading module:", fullUrl);
        await loadScript(src);
      }

      console.log("[Affiliate Dashboard] All modules loaded successfully.");
    })();

    return modulesPromise;
  }

  async function waitForPageShell() {
    if (typeof window.AXIOM_AFFILIATE_PAGE_READY === "function") {
      try {
        await window.AXIOM_AFFILIATE_PAGE_READY();
      } catch (error) {
        console.error("[Affiliate Dashboard] Page shell promise rejected:", error);
      }
    }

    if (window.AXIOM_AFFILIATE_PAGE_STATE && window.AXIOM_AFFILIATE_PAGE_STATE.shellReady) {
      return true;
    }

    return new Promise(function (resolve) {
      let settled = false;

      function finish(value) {
        if (settled) return;
        settled = true;
        resolve(value);
      }

      document.addEventListener(
        "axiom:affiliate-page-shell-ready",
        function (event) {
          const ready = !!(event && event.detail && event.detail.shellReady);
          finish(ready);
        },
        { once: true }
      );

      setTimeout(function () {
        const shellReady = !!(
          window.AXIOM_AFFILIATE_PAGE_STATE &&
          window.AXIOM_AFFILIATE_PAGE_STATE.shellReady
        );
        finish(shellReady);
      }, 4000);
    });
  }

  async function bootAffiliateDashboard() {
    if (bootPromise) {
      return bootPromise;
    }

    bootPromise = (async function () {
      await loadAffiliateDashboardModules();
      await waitForPageShell();

      if (
        window.AXIOM_AFFILIATE_DASHBOARD &&
        typeof window.AXIOM_AFFILIATE_DASHBOARD.init === "function"
      ) {
        return window.AXIOM_AFFILIATE_DASHBOARD.init();
      }

      throw new Error("AXIOM_AFFILIATE_DASHBOARD.init is missing.");
    })().catch(function (error) {
      console.error("[Affiliate Dashboard] Boot failed:", error);
      throw error;
    });

    return bootPromise;
  }

  window.AXIOM_AFFILIATE_DASHBOARD_BOOT = bootAffiliateDashboard;

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      function () {
        bootAffiliateDashboard().catch(function () {});
      },
      { once: true }
    );
  } else {
    bootAffiliateDashboard().catch(function () {});
  }
})();
