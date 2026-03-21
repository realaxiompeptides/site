document.addEventListener("DOMContentLoaded", async function () {
  function getSupabase() {
    return (
      window.supabaseClient ||
      window.AXIOM_SUPABASE ||
      window.axiomSupabase ||
      null
    );
  }

  async function waitForSupabase(maxAttempts, delay) {
    for (let i = 0; i < maxAttempts; i += 1) {
      const client = getSupabase();
      if (client) return client;

      await new Promise(function (resolve) {
        setTimeout(resolve, delay);
      });
    }

    return null;
  }

  try {
    const supabase = await waitForSupabase(50, 120);
    if (!supabase) return;

    const { data, error } = await supabase.rpc("get_store_products");
    if (error) {
      console.error("get_store_products failed:", error);
      return;
    }

    if (Array.isArray(data)) {
      window.AXIOM_PRODUCTS = data;
      window.dispatchEvent(new Event("axiom-products-live-loaded"));
    }
  } catch (error) {
    console.error("Live product load failed:", error);
  }
});
