window.AXIOM_ANALYTICS = {
  async load() {
    if (!window.axiomSupabase) return;

    const supabase = window.axiomSupabase;

    const now = new Date();

    function isoDaysAgo(days) {
      const d = new Date(now);
      d.setDate(d.getDate() - days);
      return d.toISOString();
    }

    async function countSince(dateIso) {
      const { count, error } = await supabase
        .from("page_views")
        .select("*", { count: "exact", head: true })
        .gte("viewed_at", dateIso);

      if (error) {
        console.error("Analytics count failed:", error);
        return 0;
      }

      return Number(count || 0);
    }

    const today = await countSince(isoDaysAgo(1));
    const seven = await countSince(isoDaysAgo(7));
    const thirty = await countSince(isoDaysAgo(30));
    const ninety = await countSince(isoDaysAgo(90));
    const year = await countSince(isoDaysAgo(365));

    const todayEl = document.getElementById("analyticsToday");
    const sevenEl = document.getElementById("analytics7Days");
    const thirtyEl = document.getElementById("analytics30Days");
    const ninetyEl = document.getElementById("analytics90Days");
    const yearEl = document.getElementById("analytics365Days");

    if (todayEl) todayEl.textContent = String(today);
    if (sevenEl) sevenEl.textContent = String(seven);
    if (thirtyEl) thirtyEl.textContent = String(thirty);
    if (ninetyEl) ninetyEl.textContent = String(ninety);
    if (yearEl) yearEl.textContent = String(year);
  }
};
