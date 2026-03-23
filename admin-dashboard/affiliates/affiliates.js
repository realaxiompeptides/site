(function () {
  const AFFILIATE_SPLIT_FILES = [
    "state.js",
    "utils.js",
    "dom.js",
    "render.js",
    "data.js",
    "actions.js",
    "init.js"
  ];

  let affiliateBootPromise = null;
  let affiliateBootFinished = false;

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

  function normalizeUrl(url) {
    const a = document.createElement("a");
    a.href = url;
    return a.href;
  }

  function loadScriptSequentially(src) {
    return new Promise(function (resolve, reject) {
      const normalizedSrc = normalizeUrl(src);

      const existing = Array.from(document.scripts).find(function (script) {
        return normalizeUrl(script.src || "") === normalizedSrc;
      });

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
            reject(new Error("Failed to load " + normalizedSrc));
          },
          { once: true }
        );

        return;
      }

      const script = document.createElement("script");
      script.src = normalizedSrc;
      script.defer = false;
      script.async = false;

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
          reject(new Error("Failed to load " + normalizedSrc));
        },
        { once: true }
      );

      document.head.appendChild(script);
    });
  }

  async function loadAffiliateDependencies() {
    const base = getCurrentScriptBase();

    for (const relativePath of AFFILIATE_SPLIT_FILES) {
      await loadScriptSequentially(base + relativePath);
    }
  }

  async function waitForAffiliateMount(timeoutMs) {
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeoutMs) {
      const mount =
        document.getElementById("affiliateManagementMount") ||
        document.getElementById("affiliatesMount") ||
        document.querySelector("[data-affiliate-admin-root]") ||
        document.querySelector(".affiliate-management-section") ||
        document.querySelector(".affiliate-admin-section");

      if (mount) return mount;

      await new Promise(function (resolve) {
        setTimeout(resolve, 50);
      });
    }

    return null;
  }

  async function runAffiliateBoot() {
    await loadAffiliateDependencies();

    if (
      !window.AXIOM_ADMIN_AFFILIATES_INIT ||
      typeof window.AXIOM_ADMIN_AFFILIATES_INIT.boot !== "function"
    ) {
      throw new Error("AXIOM_ADMIN_AFFILIATES_INIT.boot is missing.");
    }

    await waitForAffiliateMount(4000);
    await window.AXIOM_ADMIN_AFFILIATES_INIT.boot();
    affiliateBootFinished = true;
  }

  function bootAffiliates() {
    if (affiliateBootFinished) {
      return Promise.resolve();
    }

    if (affiliateBootPromise) {
      return affiliateBootPromise;
    }

    affiliateBootPromise = runAffiliateBoot().catch(function (error) {
      affiliateBootPromise = null;
      console.error("Affiliate admin failed to initialize:", error);
      throw error;
    });

    return affiliateBootPromise;
  }

  window.AXIOM_ADMIN_AFFILIATES_BOOT = bootAffiliates;

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      function () {
        bootAffiliates().catch(function () {});
      },
      { once: true }
    );
  } else {
    bootAffiliates().catch(function () {});
  }
})();
