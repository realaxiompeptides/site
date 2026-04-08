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

function reviewsGetInitials(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (!parts.length) return "A";
  return parts.map((part) => part.charAt(0).toUpperCase()).join("");
}

function reviewsGetAvatarClass(name) {
  const initials = reviewsGetInitials(name);
  const seed = initials.charCodeAt(0) + (initials.charCodeAt(1) || 0);
  const classes = [
    "is-blue",
    "is-red",
    "is-green",
    "is-purple",
    "is-orange",
    "is-teal"
  ];
  return classes[seed % classes.length];
}

function reviewsRenderTrustStars(count) {
  const safeCount = Math.max(0, Math.min(5, Number(count || 0)));

  return Array.from({ length: 5 }, (_, index) => {
    const filled = index < safeCount;

    return `
      <span class="review-star-box ${filled ? "is-filled" : "is-empty"}" aria-hidden="true">
        <i class="${filled ? "fa-solid" : "fa-regular"} fa-star"></i>
      </span>
    `;
  }).join("");
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

function reviewsBuildReviewCard(review, index) {
  const images = Array.isArray(review.images) ? review.images : [];
  const badges = Array.isArray(review.badges) ? review.badges : [];
  const initials = reviewsGetInitials(review.name);
  const avatarClass = reviewsGetAvatarClass(review.name);
  const usefulCount = Number(review.useful_count || 0);

  return `
    <article class="review-card" data-review-index="${index}">
      <div class="review-top">
        <div class="review-author-wrap">
          <div class="review-avatar ${avatarClass}">${reviewsEscapeHtml(initials)}</div>

          <div class="review-author-copy">
            <h3 class="review-author">${reviewsEscapeHtml(review.name)}</h3>
            <p class="review-meta">
              ${reviewsEscapeHtml(review.location || "")}${review.review_count ? ` • ${reviewsEscapeHtml(review.review_count)}` : ""}
            </p>
          </div>
        </div>

        <div class="review-date">${reviewsEscapeHtml(reviewsFormatDate(review.date))}</div>
      </div>

      <div class="review-stars review-stars-trust">
        ${reviewsRenderTrustStars(review.rating)}
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
                      onerror="this.style.display='none';"
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

      <div class="review-actions">
        <button
          type="button"
          class="review-action-btn review-useful-btn"
          data-useful="${index}"
          aria-label="Mark review useful"
        >
          <i class="fa-regular fa-heart"></i>
          <span>${usefulCount > 0 ? `Useful (${usefulCount})` : "Useful"}</span>
        </button>

        <button
          type="button"
          class="review-action-btn review-share-btn"
          data-share="${index}"
          aria-label="Share review"
        >
          <i class="fa-solid fa-share-nodes"></i>
          <span>Share</span>
        </button>
      </div>
    </article>
  `;
}

function reviewsBindActions() {
  const usefulButtons = document.querySelectorAll(".review-useful-btn");
  const shareButtons = document.querySelectorAll(".review-share-btn");

  usefulButtons.forEach((button) => {
    if (button.dataset.bound === "true") return;
    button.dataset.bound = "true";

    button.addEventListener("click", function () {
      const isActive = this.classList.toggle("is-active");
      const icon = this.querySelector("i");
      const label = this.querySelector("span");

      if (icon) {
        icon.className = isActive ? "fa-solid fa-heart" : "fa-regular fa-heart";
      }

      const reviewIndex = Number(this.getAttribute("data-useful"));
      const data = window.AXIOM_REVIEWS_DATA || {};
      const review = Array.isArray(data.reviews) ? data.reviews[reviewIndex] : null;
      const baseCount = Number(review?.useful_count || 0);

      if (label) {
        label.textContent = isActive
          ? `Useful (${baseCount + 1})`
          : (baseCount > 0 ? `Useful (${baseCount})` : "Useful");
      }
    });
  });

  shareButtons.forEach((button) => {
    if (button.dataset.bound === "true") return;
    button.dataset.bound = "true";

    button.addEventListener("click", async function () {
      const reviewIndex = Number(this.getAttribute("data-share"));
      const data = window.AXIOM_REVIEWS_DATA || {};
      const review = Array.isArray(data.reviews) ? data.reviews[reviewIndex] : null;

      const shareTitle = review?.title || "Axiom Review";
      const shareText = review?.body || "Read this review on Axiom Peptides.";
      const shareUrl = window.location.href;

      try {
        if (navigator.share) {
          await navigator.share({
            title: shareTitle,
            text: shareText,
            url: shareUrl
          });
        } else {
          await navigator.clipboard.writeText(shareUrl);
          const label = this.querySelector("span");
          const original = label ? label.textContent : "Share";

          if (label) {
            label.textContent = "Copied";
            setTimeout(() => {
              label.textContent = original;
            }, 1200);
          }
        }
      } catch (error) {
        console.error("Share failed:", error);
      }
    });
  });
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
      ? reviews.map((review, index) => reviewsBuildReviewCard(review, index)).join("")
      : `<p class="reviews-empty">No reviews available yet.</p>`;

    reviewsBindActions();
  };

  if (sortEl && !sortEl.dataset.bound) {
    sortEl.dataset.bound = "true";
    sortEl.addEventListener("change", render);
  }

  render();
}

document.addEventListener("DOMContentLoaded", async function () {
  await Promise.all([
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
