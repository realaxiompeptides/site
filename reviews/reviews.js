async function loadReviewsPartial(id, file) {
  const mount = document.getElementById(id);
  if (!mount) return;

  try {
    const response = await fetch(file, { cache: "no-store" });
    if (!response.ok) throw new Error(`Failed to load ${file}`);
    mount.innerHTML = await response.text();
  } catch (error) {
    console.error(error);
  }
}

function reviewsEscapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function reviewsFormatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || "";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function reviewsRenderStars(count) {
  const safeCount = Math.max(0, Math.min(5, Number(count || 0)));
  return Array.from({ length: 5 }, (_, index) => {
    const filled = index < safeCount;
    return `<i class="${filled ? "fa-solid" : "fa-regular"} fa-star"></i>`;
  }).join("");
}

function reviewsGetInitials(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (!parts.length) return "A";
  return parts.map((part) => part.charAt(0).toUpperCase()).join("");
}

function reviewsRenderSummary(data) {
  const scoreEl = document.getElementById("reviewsAverageScore");
  const countEl = document.getElementById("reviewsTotalCount");
  const distEl = document.getElementById("reviewsDistributionRows");

  if (scoreEl) scoreEl.textContent = Number(data.average_score || 0).toFixed(1);
  if (countEl) countEl.textContent = `${data.total_reviews || 0}+ verified reviews`;

  if (distEl) {
    distEl.innerHTML = (data.distribution || [])
      .map((row) => {
        const label = reviewsEscapeHtml(String(row.stars || ""));
        const percent = Number(row.percent || 0);
        return `
          <div class="reviews-dist-row">
            <div class="reviews-dist-label">${label} ★</div>
            <div class="reviews-dist-bar">
              <div class="reviews-dist-fill" style="width:${percent}%;"></div>
            </div>
            <div class="reviews-dist-value">${percent}%</div>
          </div>
        `;
      })
      .join("");
  }
}

function reviewsRenderMentions(data) {
  const mentionsEl = document.getElementById("reviewsTopMentions");
  if (!mentionsEl) return;

  mentionsEl.innerHTML = (data.top_mentions || [])
    .map((item) => `<span class="reviews-tag">${reviewsEscapeHtml(item)}</span>`)
    .join("");
}

function reviewsBuildReviewCard(review) {
  const images = Array.isArray(review.images) ? review.images : [];
  const badges = Array.isArray(review.badges) ? review.badges : [];

  return `
    <article class="review-card">
      <div class="review-top">
        <div class="review-author-wrap">
          <div class="review-avatar">${reviewsEscapeHtml(reviewsGetInitials(review.name))}</div>

          <div>
            <h3 class="review-author">${reviewsEscapeHtml(review.name)}</h3>
            <p class="review-meta">
              ${reviewsEscapeHtml(review.location || "")}${review.review_count ? ` • ${reviewsEscapeHtml(review.review_count)}` : ""}
            </p>
          </div>
        </div>

        <div class="review-date">${reviewsEscapeHtml(reviewsFormatDate(review.date))}</div>
      </div>

      <div class="review-stars">
        ${reviewsRenderStars(review.rating)}
      </div>

      <h4 class="review-title">${reviewsEscapeHtml(review.title)}</h4>
      <p class="review-body">${reviewsEscapeHtml(review.body)}</p>

      ${
        images.length
          ? `
            <div class="review-images">
              ${images
                .map(
                  (image) => `
                    <img
                      class="review-image"
                      src="${reviewsEscapeHtml(image)}"
                      alt="${reviewsEscapeHtml(review.title)}"
                      loading="lazy"
                    />
                  `
                )
                .join("")}
            </div>
          `
          : ""
      }

      ${
        badges.length
          ? `
            <div class="review-badges">
              ${badges.map((badge) => `<span class="review-badge">${reviewsEscapeHtml(badge)}</span>`).join("")}
            </div>
          `
          : ""
      }
    </article>
  `;
}

function reviewsRenderList(data) {
  const listEl = document.getElementById("reviewsList");
  const countEl = document.getElementById("reviewsResultsCount");
  const sortEl = document.getElementById("reviewsSort");

  if (!listEl) return;

  const render = () => {
    const sortValue = sortEl ? sortEl.value : "newest";
    const reviews = [...(data.reviews || [])];

    if (sortValue === "oldest") {
      reviews.sort((a, b) => new Date(a.date) - new Date(b.date));
    } else if (sortValue === "highest") {
      reviews.sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0));
    } else {
      reviews.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    if (countEl) {
      countEl.textContent = `Showing ${reviews.length} reviews`;
    }

    listEl.innerHTML = reviews.length
      ? reviews.map(reviewsBuildReviewCard).join("")
      : `<p class="reviews-empty">No reviews available yet.</p>`;
  };

  if (sortEl && !sortEl.dataset.bound) {
    sortEl.dataset.bound = "true";
    sortEl.addEventListener("change", render);
  }

  render();
}

document.addEventListener("DOMContentLoaded", async function () {
  await Promise.all([
    loadReviewsPartial("reviewsHeroMount", "partials/reviews-hero.html"),
    loadReviewsPartial("reviewsSummaryMount", "partials/reviews-summary.html"),
    loadReviewsPartial("reviewsMentionsMount", "partials/reviews-top-mentions.html"),
    loadReviewsPartial("reviewsListMount", "partials/reviews-list.html"),
    loadReviewsPartial("reviewsFaqMount", "partials/reviews-faq.html")
  ]);

  const data = window.AXIOM_REVIEWS_DATA || {};

  reviewsRenderSummary(data);
  reviewsRenderMentions(data);
  reviewsRenderList(data);
});
