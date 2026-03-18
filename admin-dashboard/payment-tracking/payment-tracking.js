window.AXIOM_PAYMENT_TRACKING = {
  currentRange: "1d",

  init() {
    const rangeGroup = document.getElementById("paymentTrackingRangeGroup");
    if (!rangeGroup || rangeGroup.dataset.bound === "true") return;

    rangeGroup.dataset.bound = "true";

    rangeGroup.querySelectorAll("[data-range]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const range = btn.getAttribute("data-range") || "1d";
        this.setRange(range);

        if (
          window.AXIOM_DASHBOARD_APP &&
          typeof window.AXIOM_DASHBOARD_APP.refreshHomeDashboard === "function"
        ) {
          await window.AXIOM_DASHBOARD_APP.refreshHomeDashboard();
        }
      });
    });

    this.setRange(this.currentRange);

    window.addEventListener("resize", () => {
      if (
        window.AXIOM_DASHBOARD_APP &&
        Array.isArray(window.AXIOM_DASHBOARD_APP.orders)
      ) {
        this.render(window.AXIOM_DASHBOARD_APP.orders);
      }
    });
  },

  setRange(range) {
    this.currentRange = range;

    const group = document.getElementById("paymentTrackingRangeGroup");
    if (!group) return;

    group.querySelectorAll("[data-range]").forEach((btn) => {
      const isActive = btn.getAttribute("data-range") === range;
      btn.classList.toggle("active", isActive);
      btn.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
  },

  getRangeConfig(range) {
    const now = new Date();
    const start = new Date(now);
    let bucket = "day";

    if (range === "1d") {
      start.setHours(now.getHours() - 23, 0, 0, 0);
      bucket = "hour";
    } else if (range === "7d") {
      start.setDate(now.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      bucket = "day";
    } else if (range === "1m") {
      start.setDate(now.getDate() - 29);
      start.setHours(0, 0, 0, 0);
      bucket = "day";
    } else if (range === "3m") {
      start.setMonth(now.getMonth() - 3);
      start.setHours(0, 0, 0, 0);
      bucket = "week";
    } else if (range === "1y") {
      start.setFullYear(now.getFullYear() - 1);
      start.setHours(0, 0, 0, 0);
      bucket = "month";
    }

    return { now, start, bucket };
  },

  getCompletedOrders(orders) {
    return (Array.isArray(orders) ? orders : []).filter((order) => {
      const paymentStatus = String(order?.payment_status || "").toLowerCase();
      const orderStatus = String(order?.order_status || "").toLowerCase();
      const fulfillmentStatus = String(order?.fulfillment_status || "").toLowerCase();

      if (orderStatus === "cancelled") return false;

      return (
        paymentStatus === "paid" ||
        fulfillmentStatus === "fulfilled" ||
        fulfillmentStatus === "shipped" ||
        orderStatus === "fulfilled" ||
        orderStatus === "shipped"
      );
    });
  },

  formatCurrency(value) {
    return `$${Number(value || 0).toFixed(2)}`;
  },

  getBucketKey(dateValue, bucket) {
    const d = new Date(dateValue);

    if (bucket === "hour") {
      return [
        d.getFullYear(),
        String(d.getMonth() + 1).padStart(2, "0"),
        String(d.getDate()).padStart(2, "0"),
        String(d.getHours()).padStart(2, "0")
      ].join("-");
    }

    if (bucket === "day") {
      return [
        d.getFullYear(),
        String(d.getMonth() + 1).padStart(2, "0"),
        String(d.getDate()).padStart(2, "0")
      ].join("-");
    }

    if (bucket === "week") {
      const temp = new Date(d);
      const day = temp.getDay();
      const diff = temp.getDate() - day + (day === 0 ? -6 : 1);
      temp.setDate(diff);
      temp.setHours(0, 0, 0, 0);

      return [
        temp.getFullYear(),
        String(temp.getMonth() + 1).padStart(2, "0"),
        String(temp.getDate()).padStart(2, "0")
      ].join("-");
    }

    return [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, "0")
    ].join("-");
  },

  getBucketLabel(key, bucket) {
    if (bucket === "hour") {
      const parts = key.split("-");
      const d = new Date(
        Number(parts[0]),
        Number(parts[1]) - 1,
        Number(parts[2]),
        Number(parts[3])
      );
      return d.toLocaleTimeString([], { hour: "numeric" });
    }

    if (bucket === "day") {
      const parts = key.split("-");
      const d = new Date(
        Number(parts[0]),
        Number(parts[1]) - 1,
        Number(parts[2])
      );
      return d.toLocaleDateString([], { month: "short", day: "numeric" });
    }

    if (bucket === "week") {
      const parts = key.split("-");
      const d = new Date(
        Number(parts[0]),
        Number(parts[1]) - 1,
        Number(parts[2])
      );
      return d.toLocaleDateString([], { month: "short", day: "numeric" });
    }

    const parts = key.split("-");
    const d = new Date(
      Number(parts[0]),
      Number(parts[1]) - 1,
      1
    );
    return d.toLocaleDateString([], { month: "short", year: "2-digit" });
  },

  createFullBucketSeries(range, bucket) {
    const { now, start } = this.getRangeConfig(range);
    const keys = [];
    const cursor = new Date(start);

    if (bucket === "hour") {
      cursor.setMinutes(0, 0, 0);
      while (cursor <= now) {
        keys.push(this.getBucketKey(cursor, "hour"));
        cursor.setHours(cursor.getHours() + 1);
      }
      return keys;
    }

    if (bucket === "day") {
      cursor.setHours(0, 0, 0, 0);
      while (cursor <= now) {
        keys.push(this.getBucketKey(cursor, "day"));
        cursor.setDate(cursor.getDate() + 1);
      }
      return keys;
    }

    if (bucket === "week") {
      while (cursor <= now) {
        keys.push(this.getBucketKey(cursor, "week"));
        cursor.setDate(cursor.getDate() + 7);
      }
      return [...new Set(keys)];
    }

    cursor.setDate(1);
    while (cursor <= now) {
      keys.push(this.getBucketKey(cursor, "month"));
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return keys;
  },

  buildSeries(orders, range) {
    const config = this.getRangeConfig(range);
    const completedOrders = this.getCompletedOrders(orders);

    const filtered = completedOrders.filter((order) => {
      const created = order?.created_at ? new Date(order.created_at) : null;
      return created && !Number.isNaN(created.getTime()) && created >= config.start && created <= config.now;
    });

    const totalsByBucket = {};

    filtered.forEach((order) => {
      const key = this.getBucketKey(order.created_at, config.bucket);
      const total = Number(order?.total_amount || 0);
      totalsByBucket[key] = Number(totalsByBucket[key] || 0) + total;
    });

    const fullKeys = this.createFullBucketSeries(range, config.bucket);

    return {
      completedCount: filtered.length,
      totalSales: filtered.reduce((sum, order) => sum + Number(order?.total_amount || 0), 0),
      averageOrder: filtered.length
        ? filtered.reduce((sum, order) => sum + Number(order?.total_amount || 0), 0) / filtered.length
        : 0,
      labels: fullKeys.map((key) => this.getBucketLabel(key, config.bucket)),
      values: fullKeys.map((key) => Number(totalsByBucket[key] || 0))
    };
  },

  renderChart(labels, values) {
    const canvas = document.getElementById("paymentTrackingChart");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.clientWidth || canvas.parentElement?.clientWidth || 600;
    const height = 280;
    const ratio = window.devicePixelRatio || 1;

    canvas.style.height = `${height}px`;
    canvas.width = width * ratio;
    canvas.height = height * ratio;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(ratio, ratio);
    ctx.clearRect(0, 0, width, height);

    const padding = { top: 24, right: 18, bottom: 42, left: 52 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    ctx.strokeStyle = "#e3e8f2";
    ctx.fillStyle = "#73819c";
    ctx.lineWidth = 1;
    ctx.font = "12px Inter, Arial, sans-serif";

    const maxValue = Math.max(...values, 10);
    const ySteps = 4;

    for (let i = 0; i <= ySteps; i += 1) {
      const y = padding.top + (chartHeight / ySteps) * i;
      const lineValue = Math.round(maxValue - (maxValue / ySteps) * i);

      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      ctx.fillText(`$${lineValue}`, 8, y + 4);
    }

    if (!labels.length || !values.length) {
      ctx.fillStyle = "#73819c";
      ctx.font = "600 14px Inter, Arial, sans-serif";
      ctx.fillText("No completed sales yet.", padding.left, padding.top + 40);
      return;
    }

    const pointCount = values.length;
    const xStep = pointCount > 1 ? chartWidth / (pointCount - 1) : chartWidth / 2;

    const points = values.map((value, index) => {
      const x = pointCount > 1
        ? padding.left + xStep * index
        : padding.left + chartWidth / 2;

      const y = padding.top + chartHeight - (value / maxValue) * chartHeight;

      return { x, y, value };
    });

    ctx.beginPath();
    points.forEach((point, index) => {
      if (index === 0) {
        ctx.moveTo(point.x, point.y);
      } else {
        ctx.lineTo(point.x, point.y);
      }
    });
    ctx.strokeStyle = "#387eb6";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.beginPath();
    points.forEach((point) => {
      ctx.moveTo(point.x, point.y);
      ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
    });
    ctx.fillStyle = "#387eb6";
    ctx.fill();

    ctx.fillStyle = "#73819c";
    ctx.font = "12px Inter, Arial, sans-serif";

    const labelStep = Math.max(1, Math.ceil(labels.length / 6));

    labels.forEach((label, index) => {
      if (index % labelStep !== 0 && index !== labels.length - 1) return;

      const x = pointCount > 1
        ? padding.left + xStep * index
        : padding.left + chartWidth / 2;

      ctx.save();
      ctx.translate(x, height - 14);
      ctx.textAlign = "center";
      ctx.fillText(label, 0, 0);
      ctx.restore();
    });
  },

  render(orders) {
    this.setRange(this.currentRange);

    const series = this.buildSeries(orders, this.currentRange);

    const completedCountEl = document.getElementById("paymentTrackingCompletedCount");
    const totalSalesEl = document.getElementById("paymentTrackingTotalSales");
    const averageOrderEl = document.getElementById("paymentTrackingAverageOrder");

    if (completedCountEl) completedCountEl.textContent = String(series.completedCount);
    if (totalSalesEl) totalSalesEl.textContent = this.formatCurrency(series.totalSales);
    if (averageOrderEl) averageOrderEl.textContent = this.formatCurrency(series.averageOrder);

    this.renderChart(series.labels, series.values);
  }
};

document.addEventListener("DOMContentLoaded", function () {
  if (window.AXIOM_PAYMENT_TRACKING) {
    window.AXIOM_PAYMENT_TRACKING.init();
  }
});
