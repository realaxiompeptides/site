document.addEventListener("DOMContentLoaded", async function () {
  if (!window.axiomSupabase || !window.AXIOM_HELPERS) return;

  const supabase = window.axiomSupabase;
  const helpers = window.AXIOM_HELPERS;

  const visitorId = helpers.getVisitorId();
  const pathname = window.location.pathname || "/";
  const referrer = document.referrer || null;
  const userAgent = navigator.userAgent || "";
  const language = navigator.language || "";
  const screenWidth = window.innerWidth || null;
  const screenHeight = window.innerHeight || null;

  try {
    const { data: existing, error: lookupError } = await supabase
      .from("visitor_sessions")
      .select("id, visit_count")
      .eq("visitor_id", visitorId)
      .maybeSingle();

    if (lookupError) {
      console.error("Visitor lookup failed:", lookupError);
      return;
    }

    if (!existing) {
      const { error: insertError } = await supabase.from("visitor_sessions").insert({
        visitor_id: visitorId,
        first_seen_at: helpers.nowIso(),
        last_seen_at: helpers.nowIso(),
        visit_count: 1,
        referrer,
        landing_path: pathname,
        user_agent: userAgent,
        language,
        screen_width: screenWidth,
        screen_height: screenHeight
      });

      if (insertError) {
        console.error("Visitor insert failed:", insertError);
      }
    } else {
      const { error: updateError } = await supabase
        .from("visitor_sessions")
        .update({
          last_seen_at: helpers.nowIso(),
          visit_count: Number(existing.visit_count || 0) + 1,
          user_agent: userAgent,
          language,
          screen_width: screenWidth,
          screen_height: screenHeight
        })
        .eq("id", existing.id);

      if (updateError) {
        console.error("Visitor update failed:", updateError);
      }
    }

    const { error: pageViewError } = await supabase.from("page_views").insert({
      visitor_id: visitorId,
      path: pathname,
      referrer,
      viewed_at: helpers.nowIso()
    });

    if (pageViewError) {
      console.error("Page view insert failed:", pageViewError);
    }
  } catch (error) {
    console.error("Visitor session tracking failed:", error);
  }
});
