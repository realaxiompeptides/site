window.AXIOM_AGE_GATE = (function () {
  const STORAGE_KEY = "axiom_age_gate_accepted_v1";

  function waitForSupabase(maxWaitMs) {
    return new Promise(function (resolve) {
      const start = Date.now();

      function check() {
        if (window.axiomSupabase) {
          resolve(window.axiomSupabase);
          return;
        }

        if (Date.now() - start >= maxWaitMs) {
          resolve(null);
          return;
        }

        setTimeout(check, 100);
      }

      check();
    });
  }

  function preloadProductsOnce() {
    if (window.__axiomProductsPreloadStarted) return;
    window.__axiomProductsPreloadStarted = true;

    window.AXIOM_PRODUCTS_PRELOAD_PROMISE = (async function () {
      try {
        const supabase = await waitForSupabase(3000);
        if (!supabase) return null;

        const { data, error } = await supabase
          .from("products")
          .select(`
            id,
            slug,
            name,
            badge,
            category,
            description,
            long_description,
            main_image,
            gallery_images,
            is_active,
            sort_order,
            created_at,
            updated_at,
            product_variants (
              id,
              product_id,
              variant_id,
              label,
              price,
              compare_at_price,
              weight_oz,
              stock_quantity,
              image,
              allow_backorder,
              is_active,
              sort_order,
              created_at,
              updated_at
            )
          `)
          .eq("is_active", true)
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Age gate preload failed:", error);
          return null;
        }

        window.AXIOM_PRELOADED_PRODUCTS = Array.isArray(data) ? data : [];
        return window.AXIOM_PRELOADED_PRODUCTS;
      } catch (error) {
        console.error("Age gate preload error:", error);
        return null;
      }
    })();
  }

  function init(options) {
    const settings = options || {};
    const overlay = document.getElementById("ageGateOverlay");
    const ageCheck = document.getElementById("ageGateAgeCheck");
    const useCheck = document.getElementById("ageGateUseCheck");
    const enterBtn = document.getElementById("ageGateEnterBtn");
    const exitBtn = document.getElementById("ageGateExitBtn");
    const logo = document.getElementById("ageGateLogo");

    if (!overlay || !ageCheck || !useCheck || !enterBtn || !exitBtn || !logo) {
      return;
    }

    if (settings.logoPath) {
      logo.src = settings.logoPath;
    }

    const alreadyAccepted = localStorage.getItem(STORAGE_KEY) === "true";

    function updateEnterState() {
      enterBtn.disabled = !(ageCheck.checked && useCheck.checked);
    }

    function openGate() {
      overlay.classList.add("active");
      overlay.setAttribute("aria-hidden", "false");
      document.body.classList.add("age-gate-locked");
      preloadProductsOnce();
    }

    function closeGate() {
      overlay.classList.remove("active");
      overlay.setAttribute("aria-hidden", "true");
      document.body.classList.remove("age-gate-locked");
    }

    if (alreadyAccepted) {
      closeGate();
      preloadProductsOnce();
    } else {
      openGate();
    }

    ageCheck.addEventListener("change", updateEnterState);
    useCheck.addEventListener("change", updateEnterState);

    enterBtn.addEventListener("click", function () {
      if (!(ageCheck.checked && useCheck.checked)) return;

      localStorage.setItem(STORAGE_KEY, "true");
      closeGate();
      window.dispatchEvent(new CustomEvent("axiom-age-gate-accepted"));
    });

    exitBtn.addEventListener("click", function () {
      const exitUrl = settings.exitUrl || "https://www.google.com";
      window.location.href = exitUrl;
    });

    updateEnterState();
  }

  return {
    init
  };
})();
