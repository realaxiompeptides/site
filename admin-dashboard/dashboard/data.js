(function () {
  const { safeArray } = window.AXIOM_DASHBOARD_UTILS;

  function showOneTimeError(type, message, extra) {
    const state = window.AXIOM_DASHBOARD_STATE;

    if (type === "checkout_sessions") {
      if (state.hasShownCheckoutSessionsError) return;
      state.hasShownCheckoutSessionsError = true;
    }

    if (type === "orders") {
      if (state.hasShownOrdersError) return;
      state.hasShownOrdersError = true;
    }

    console.error(message, extra || "");
    alert(message);
  }

  async function fetchCheckoutSessions() {
    if (!window.axiomSupabase) {
      showOneTimeError("checkout_sessions", "Supabase client missing on dashboard.");
      return [];
    }

    try {
      const { data, error } = await window.axiomSupabase
        .from("checkout_sessions")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        showOneTimeError(
          "checkout_sessions",
          "Dashboard failed to load checkout sessions: " + (error.message || "Unknown error"),
          error
        );
        return [];
      }

      return data || [];
    } catch (error) {
      showOneTimeError(
        "checkout_sessions",
        "Dashboard failed to load checkout sessions: " + (error?.message || "Load failed"),
        error
      );
      return [];
    }
  }

  async function fetchOrders() {
    if (!window.axiomSupabase) {
      showOneTimeError("orders", "Supabase client missing on dashboard.");
      return [];
    }

    try {
      const { data, error } = await window.axiomSupabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        showOneTimeError(
          "orders",
          "Dashboard failed to load orders: " + (error.message || "Unknown error"),
          error
        );
        return [];
      }

      return data || [];
    } catch (error) {
      showOneTimeError(
        "orders",
        "Dashboard failed to load orders: " + (error?.message || "Load failed"),
        error
      );
      return [];
    }
  }

  async function countPageViewsSince(dateIso) {
    if (!window.axiomSupabase) return 0;

    try {
      const { count, error } = await window.axiomSupabase
        .from("page_views")
        .select("*", { count: "exact", head: true })
        .gte("viewed_at", dateIso);

      if (error) return 0;
      return Number(count || 0);
    } catch {
      return 0;
    }
  }

  async function countUniqueVisitorsSince(dateIso) {
    if (!window.axiomSupabase) return 0;

    try {
      const { data, error } = await window.axiomSupabase
        .from("page_views")
        .select("visitor_id")
        .gte("viewed_at", dateIso);

      if (error) return 0;

      return new Set(
        safeArray(data)
          .map((row) => row.visitor_id)
          .filter(Boolean)
      ).size;
    } catch {
      return 0;
    }
  }

  window.AXIOM_DASHBOARD_DATA = {
    showOneTimeError,
    fetchCheckoutSessions,
    fetchOrders,
    countPageViewsSince,
    countUniqueVisitorsSince
  };
})();
