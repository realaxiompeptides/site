(function () {
  const VERSION = "20260328-1000";

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

  function getBasePath() {
    const currentScript = document.currentScript;

    if (currentScript && currentScript.src) {
      return currentScript.src.substring(0, currentScript.src.lastIndexOf("/") + 1);
    }

    const scripts = Array.from(document.querySelectorAll("script[src]"));
    const matched = scripts.find((script) => {
      return /affiliate-dashboard\.js(\?|$)/i.test(script.getAttribute("src") || "");
    });

    if (matched && matched.src) {
      return matched.src.substring(0, matched.src.lastIndexOf("/") + 1);
    }

    const pathname = window.location.pathname || "";
    const affiliateFolderIndex = pathname.toLowerCase().indexOf("/affiliate-program/");
    if (affiliateFolderIndex !== -1) {
      return window.location.origin + pathname.slice(0, affiliateFolderIndex + "/affiliate-program/".length);
    }

    return window.location.origin + "/";
  }

  const BASE_PATH = getBasePath();

  function buildModuleUrl(src) {
    return new URL(withVersion(src), BASE_PATH).toString();
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
      script.src = buildModuleUrl(src);
      script.defer = true;
      script.dataset.affiliateModule = src;

      script.addEventListener("load", () => {
        script.dataset.loaded = "true";
        resolve();
      });

      script.addEventListener("error", () => {
        reject(new Error("Failed to load " + src + " from " + script.src));
      });

      document.head.appendChild(script);
    });
  }

  async function loadAffiliateDashboardModules() {
    try {
      console.log("[Affiliate Dashboard] Base path:", BASE_PATH);

      for (const src of MODULES) {
        const fullUrl = buildModuleUrl(src);
        console.log("[Affiliate Dashboard] Loading module:", fullUrl);
        await loadScript(src);
      }

      console.log("[Affiliate Dashboard] All modules loaded successfully.");
    } catch (error) {
      console.error("[Affiliate Dashboard] Module loader failed:", error);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadAffiliateDashboardModules, {
      once: true
    });
  } else {
    loadAffiliateDashboardModules();
  }
})();
