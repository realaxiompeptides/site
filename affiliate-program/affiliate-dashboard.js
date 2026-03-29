(function () {
  const VERSION = "20260328-999";

  const MODULES = [
    "dashboard-js/affiliate-dashboard-core.js",
    "dashboard-js/affiliate-dashboard-auth.js",
    "dashboard-js/affiliate-dashboard-data.js",
    "dashboard-js/affiliate-dashboard-claims.js",
    "dashboard-js/affiliate-dashboard-referral.js",
    "dashboard-js/affiliate-dashboard-render.js",
    "dashboard-js/affiliate-dashboard-init.js"
  ];

  function withVersion(src) {
    return src + (src.includes("?") ? "&" : "?") + "v=" + encodeURIComponent(VERSION);
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
        existing.addEventListener("error", () => reject(new Error("Failed to load " + src)), { once: true });
        return;
      }

      const script = document.createElement("script");
      script.src = withVersion(src);
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
      for (const src of MODULES) {
        await loadScript(src);
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
