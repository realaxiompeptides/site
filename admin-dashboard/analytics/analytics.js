window.AXIOM_ANALYTICS = {
  async load() {
    if (!window.axiomSupabase) {
      console.error("Supabase client missing for analytics.");
      return;
    }

    const supabase = window.axiomSupabase;
    const now = new Date();

    function isoDaysAgo(days) {
      const d = new Date(now);
      d.setDate(d.getDate() - days);
      return d.toISOString();
    }

    function setText(id, value) {
      const el = document.getElementById(id);
      if (el) {
        el.textContent = String(value ?? 0);
      }
    }

    function safeArray(value) {
      return Array.isArray(value) ? value : [];
    }

    async function countPageViewsSince(dateIso) {
      const { count, error } = await supabase
        .from("page_views")
        .select("*", { count: "exact", head: true })
        .gte("viewed_at", dateIso);

      if (error) {
        console.error("Analytics page_views count failed:", error);
        return 0;
      }

      return Number(count || 0);
    }

    async function countUniqueVisitorsSince(dateIso) {
      const { data, error } = await supabase
        .from("page_views")
        .select("visitor_id")
        .gte("viewed_at", dateIso);

      if (error) {
        console.error("Analytics unique visitors failed:", error);
        return 0;
      }

      const uniqueIds = new Set(
        safeArray(data)
          .map((row) => row.visitor_id)
          .filter(Boolean)
      );

      return uniqueIds.size;
    }

    async function loadTopPages(limit = 10) {
      const { data, error } = await supabase
        .from("page_views")
        .select("path, visitor_id, viewed_at")
        .order("viewed_at", { ascending: false })
        .limit(1000);

      if (error) {
        console.error("Top pages load failed:", error);
        return [];
      }

      const counts = {};

      safeArray(data).forEach((row) => {
        const path = row.path || "/";
        counts[path] = (counts[path] || 0) + 1;
      });

      return Object.entries(counts)
        .map(([path, views]) => ({ path, views }))
        .sort((a, b) => b.views - a.views)
        .slice(0, limit);
    }

    async function loadTopLandingPages(limit = 10) {
      const { data, error } = await supabase
        .from("visitor_sessions")
        .select("landing_path, visit_count, first_seen_at")
        .order("first_seen_at", { ascending: false })
        .limit(1000);

      if (error) {
        console.error("Top landing pages load failed:", error);
        return [];
      }

      const counts = {};

      safeArray(data).forEach((row) => {
        const path = row.landing_path || "/";
        const visits = Number(row.visit_count || 1);
        counts[path] = (counts[path] || 0) + visits;
      });

      return Object.entries(counts)
        .map(([path, visits]) => ({ path, visits }))
        .sort((a, b) => b.visits - a.visits)
        .slice(0, limit);
    }

    async function loadRecentVisitors(limit = 10) {
      const { data, error } = await supabase
        .from("visitor_sessions")
        .select("*")
        .order("last_seen_at", { ascending: false })
        .limit(limit);

      if (error) {
        console.error("Recent visitors load failed:", error);
        return [];
      }

      return safeArray(data);
    }

    function renderTopPages(rows) {
      const mount = document.getElementById("analyticsTopPages");
      if (!mount) return;

      if (!rows.length) {
        mount.innerHTML = `<div class="dashboard-empty">No page views found.</div>`;
        return;
      }

      mount.innerHTML = rows.map((row) => {
        return `
          <div class="dashboard-info-row">
            <span>${row.path}</span>
            <strong>${row.views}</strong>
          </div>
        `;
      }).join("");
    }

    function renderTopLandingPages(rows) {
      const mount = document.getElementById("analyticsTopLandingPages");
      if (!mount) return;

      if (!rows.length) {
        mount.innerHTML = `<div class="dashboard-empty">No landing pages found.</div>`;
        return;
      }

      mount.innerHTML = rows.map((row) => {
        return `
          <div class="dashboard-info-row">
            <span>${row.path}</span>
            <strong>${row.visits}</strong>
          </div>
        `;
      }).join("");
    }

    function renderRecentVisitors(rows) {
      const mount = document.getElementById("analyticsRecentVisitors");
      if (!mount) return;

      if (!rows.length) {
        mount.innerHTML = `<div class="dashboard-empty">No visitor sessions found.</div>`;
        return;
      }

      mount.innerHTML = rows.map((row) => {
        return `
          <div class="dashboard-session-card">
            <h4>${row.visitor_id || "Unknown Visitor"}</h4>
            <p>${row.landing_path || "/"}</p>
            <p>Visits: ${Number(row.visit_count || 0)}</p>
            <p>Last Seen: ${row.last_seen_at ? new Date(row.last_seen_at).toLocaleString() : "—"}</p>
          </div>
        `;
      }).join("");
    }

    const todayViews = await countPageViewsSince(isoDaysAgo(1));
    const sevenViews = await countPageViewsSince(isoDaysAgo(7));
    const thirtyViews = await countPageViewsSince(isoDaysAgo(30));
    const ninetyViews = await countPageViewsSince(isoDaysAgo(90));
    const yearViews = await countPageViewsSince(isoDaysAgo(365));

    const todayVisitors = await countUniqueVisitorsSince(isoDaysAgo(1));
    const sevenVisitors = await countUniqueVisitorsSince(isoDaysAgo(7));
    const thirtyVisitors = await countUniqueVisitorsSince(isoDaysAgo(30));
    const ninetyVisitors = await countUniqueVisitorsSince(isoDaysAgo(90));
    const yearVisitors = await countUniqueVisitorsSince(isoDaysAgo(365));

    setText("analyticsToday", todayViews);
    setText("analytics7Days", sevenViews);
    setText("analytics30Days", thirtyViews);
    setText("analytics90Days", ninetyViews);
    setText("analytics365Days", yearViews);

    setText("analyticsUniqueToday", todayVisitors);
    setText("analyticsUnique7Days", sevenVisitors);
    setText("analyticsUnique30Days", thirtyVisitors);
    setText("analyticsUnique90Days", ninetyVisitors);
    setText("analyticsUnique365Days", yearVisitors);

    const [topPages, topLandingPages, recentVisitors] = await Promise.all([
      loadTopPages(10),
      loadTopLandingPages(10),
      loadRecentVisitors(10)
    ]);

    renderTopPages(topPages);
    renderTopLandingPages(topLandingPages);
    renderRecentVisitors(recentVisitors);
  }
};

document.addEventListener("DOMContentLoaded", function () {
  if (window.AXIOM_ANALYTICS && typeof window.AXIOM_ANALYTICS.load === "function") {
    window.AXIOM_ANALYTICS.load();
  }
});
