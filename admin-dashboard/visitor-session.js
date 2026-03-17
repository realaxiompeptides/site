document.addEventListener("DOMContentLoaded", async function () {
  if (!window.axiomSupabase || !window.AXIOM_HELPERS) {
    console.error("Visitor tracking dependencies missing.");
    return;
  }

  const supabase = window.axiomSupabase;
  const helpers = window.AXIOM_HELPERS;

  const visitorId = helpers.getVisitorId();
  const pathname = window.location.pathname || "/";
  const referrer = document.referrer || null;
  const userAgent = navigator.userAgent || "";
  const language = navigator.language || "";
  const screenWidth = window.innerWidth || null;
  const screenHeight = window.innerHeight || null;
  const nowIso = helpers.nowIso();

  try {
    const { data: existingVisitor, error: visitorLookupError } = await supabase
      .from("visitor_sessions")
      .select("id, visitor_id, visit_count")
      .eq("visitor_id", visitorId)
      .maybeSingle();

    if (visitorLookupError) {
      console.error("Visitor lookup failed:", visitorLookupError);
      return;
    }

    if (!existingVisitor) {
      const { error: visitorInsertError } = await supabase
        .from("visitor_sessions")
        .insert({
          visitor_id: visitorId,
          first_seen_at: nowIso,
          last_seen_at: nowIso,
          visit_count: 1,
          referrer: referrer,
          landing_path: pathname,
          user_agent: userAgent,
          language: language,
          screen_width: screenWidth,
          screen_height: screenHeight
        });

      if (visitorInsertError) {
        console.error("Visitor insert failed:", visitorInsertError);
        return;
      }
    } else {
      const { error: visitorUpdateError } = await supabase
        .from("visitor_sessions")
        .update({
          last_seen_at: nowIso,
          visit_count: Number(existingVisitor.visit_count || 0) + 1,
          user_agent: userAgent,
          language: language,
          screen_width: screenWidth,
          screen_height: screenHeight
        })
        .eq("id", existingVisitor.id);

      if (visitorUpdateError) {
        console.error("Visitor update failed:", visitorUpdateError);
        return;
      }
    }

    const { error: pageViewInsertError } = await supabase
      .from("page_views")
      .insert({
        visitor_id: visitorId,
        path: pathname,
        referrer: referrer,
        viewed_at: nowIso,
        created_at: nowIso
      });

    if (pageViewInsertError) {
      console.error("Page view insert failed:", pageViewInsertError);
      return;
    }

    console.log("Visitor tracking saved:", {
      visitor_id: visitorId,
      path: pathname
    });
  } catch (error) {
    console.error("Visitor session tracking failed:", error);
  }
});
