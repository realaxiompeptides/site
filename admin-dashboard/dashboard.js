(function () {
  const DASHBOARD_SPLIT_FILES = [
    "dashboard/state.js",
    "dashboard/utils.js",
    "dashboard/partials.js",
    "dashboard/data.js",
    "dashboard/sessions.js",
    "dashboard/orders.js",
    "dashboard/home.js",
    "dashboard/analytics.js",
    "dashboard/products.js",
    "dashboard/realtime.js",
    "dashboard/init.js"
  ];

  let dashboardBootStarted = false;

  function getCurrentScriptBase() {
    const currentScript = document.currentScript;

    if (currentScript && currentScript.src) {
      return currentScript.src.substring(0, currentScript.src.lastIndexOf("/") + 1);
    }

    const scripts = Array.from(document.getElementsByTagName("script"));
    const dashboardScript = scripts.find(function (script) {
      return script.src && /\/admin-dashboard\/dashboard\.js(?:\?|$)/.test(script.src);
    });

    if (dashboardScript && dashboardScript.src) {
      return dashboardScript.src.substring(0, dashboardScript.src.lastIndexOf("/") + 1);
    }

    return "";
  }

  function loadScriptSequentially(src) {
    return new Promise(function (resolve, reject) {
      const existing = Array.from(document.scripts).find(function (script) {
        return script.src === src;
      });

      if (existing) {
        if (existing.dataset.loaded === "true") {
          resolve();
          return;
        }

        existing.addEventListener("load", function handleExistingLoad() {
          existing.dataset.loaded = "true";
          resolve();
        }, { once: true });

        existing.addEventListener("error", function handleExistingError() {
          reject(new Error("Failed to load " + src));
        }, { once: true });

        return;
      }

      const script = document.createElement("script");
      script.src = src;
      script.defer = false;
      script.async = false;

      script.addEventListener("load", function () {
        script.dataset.loaded = "true";
        resolve();
      }, { once: true });

      script.addEventListener("error", function () {
        reject(new Error("Failed to load " + src));
      }, { once: true });

      document.head.appendChild(script);
    });
  }

  async function loadDashboardDependencies() {
    const base = getCurrentScriptBase();

    for (const relativePath of DASHBOARD_SPLIT_FILES) {
      await loadScriptSequentially(base + relativePath);
    }
  }

  async function bootDashboard() {
    if (dashboardBootStarted) return;
    dashboardBootStarted = true;

    try {
      await loadDashboardDependencies();

      if (
        window.AXIOM_DASHBOARD_INIT &&
        typeof window.AXIOM_DASHBOARD_INIT.boot === "function"
      ) {
        await window.AXIOM_DASHBOARD_INIT.boot();
      } else {
        throw new Error("AXIOM_DASHBOARD_INIT.boot is missing.");
      }
    } catch (error) {
      console.error("Dashboard failed to initialize:", error);
      alert("Dashboard failed to initialize: " + (error.message || "Unknown error"));
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootDashboard, { once: true });
  } else {
    bootDashboard();
  }
})();
