(function () {
  const MODULES = [
    "affiliate-dashboard-core.js",
    "affiliate-dashboard-auth.js",
    "affiliate-dashboard-ui.js",
    "affiliate-dashboard-data.js",
    "affiliate-dashboard-claims.js",
    "affiliate-dashboard-referral.js",
    "affiliate-dashboard-render.js",
    "affiliate-dashboard-init.js"
  ];

  function getModuleBasePath() {
    const currentScript =
      document.currentScript ||
      document.querySelector('script[src*="affiliate-dashboard.js"]');

    if (!currentScript || !currentScript.src) {
      return "dashboard-js/";
    }

    const src = currentScript.src;
    return src.slice(0, src.lastIndexOf("/") + 1) + "dashboard-js/";
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[data-affiliate-module="${src}"]`);

      if (existing) {
        if (existing.dataset.loaded === "true") {
          resolve();
          return;
        }

        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener(
          "error",
          () => reject(new Error("Failed to load " + src)),
          { once: true }
        );
        return;
      }

      const script = document.createElement("script");
      script.src = src;
      script.defer = true;
      script.dataset.affiliateModule = src;

      script.addEventListener("load", () => {
        script.dataset.loaded = "true";
        resolve();
      });

      script.addEventListener("error", () => {
        reject(new Error("Failed to load " + src));
      });

      document.head.appendChild(script);
    });
  }

  async function loadAffiliateDashboardModules() {
    try {
      const basePath = getModuleBasePath();

      for (const file of MODULES) {
        await loadScript(basePath + file);
      }
    } catch (error) {
      console.error("[Affiliate Dashboard] Module loader failed:", error);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadAffiliateDashboardModules, { once: true });
  } else {
    loadAffiliateDashboardModules();
  }
})();
