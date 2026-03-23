(function () {
  const AFFILIATE_SPLIT_FILES = [
    "affiliates/state.js",
    "affiliates/utils.js",
    "affiliates/dom.js",
    "affiliates/data.js",
    "affiliates/render.js",
    "affiliates/actions.js",
    "affiliates/init.js"
  ];

  let affiliateBootStarted = false;

  function getCurrentScriptBase() {
    const currentScript = document.currentScript;

    if (currentScript && currentScript.src) {
      return currentScript.src.substring(0, currentScript.src.lastIndexOf("/") + 1);
    }

    const scripts = Array.from(document.getElementsByTagName("script"));
    const affiliateScript = scripts.find(function (script) {
      return script.src && /\/admin-dashboard\/affiliates\/affiliates\.js(?:\?|$)/.test(script.src);
    });

    if (affiliateScript && affiliateScript.src) {
      return affiliateScript.src.substring(0, affiliateScript.src.lastIndexOf("/") + 1);
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

        existing.addEventListener("load", function () {
          existing.dataset.loaded = "true";
          resolve();
        }, { once: true });

        existing.addEventListener("error", function () {
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

  async function loadAffiliateDependencies() {
    const base = getCurrentScriptBase();

    for (const relativePath of AFFILIATE_SPLIT_FILES) {
      await loadScriptSequentially(base + relativePath);
    }
  }

  async function bootAffiliates() {
    if (affiliateBootStarted) return;
    affiliateBootStarted = true;

    try {
      await loadAffiliateDependencies();

      if (
        window.AXIOM_ADMIN_AFFILIATES_INIT &&
        typeof window.AXIOM_ADMIN_AFFILIATES_INIT.boot === "function"
      ) {
        await window.AXIOM_ADMIN_AFFILIATES_INIT.boot();
      }
    } catch (error) {
      console.error("Affiliate admin failed to initialize:", error);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootAffiliates, { once: true });
  } else {
    bootAffiliates();
  }
})();
