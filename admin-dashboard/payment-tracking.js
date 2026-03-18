window.AXIOM_PAYMENT_TRACKING = {
  chart: null,
  currentRange: "7d",

  init() {
    const rangeGroup = document.getElementById("paymentTrackingRangeGroup");
    if (!rangeGroup || rangeGroup.dataset.bound === "true") return;

    rangeGroup.dataset.bound = "true";

    rangeGroup.querySelectorAll("[data-range]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const range = btn.getAttribute("data-range") || "7d";
        this.setRange(range);

        if (
          window.AXIOM_DASHBOARD_APP &&
          typeof window.AXIOM_DASHBOARD_APP.refreshHomeDashboard === "function"
        ) {
          window.AXIOM_DASHBOARD_APP.refreshHomeDashboard();
        }
      });
    });
  },

  setRange(range) {
    this.currentRange = range;

    const group = document.getElementById("paymentTrackingRangeGroup");
    if (!group) return;

    group.querySelectorAll("[data-range]").forEach((btn) => {
      btn.classList.toggle("active", btn.getAttribute("data-range") === range);
    });
  },

  getRangeConfig(range) {
    const now = new Date();
    const start = new Date(now);
    let bucket = "day";
    let label = "Last 7 Days";

    if (range === "1d") {
      start.setDate(now.getDate() - 1);
      bucket = "hour";
      label = "Last 24 Hours";
    } else if (range === "7d") {
      start.setDate(now.getDate() - 6);
      bucket = "day";
      label = "Last 7 Days";
    } else if (range === "1m") {
      start.setMonth(now.getMonth() - 1);
      bucket = "day";
      label = "Last 30 Days";
    } else if (range === "3m") {
      start.setMonth(now.getMonth() - 3);
      bucket = "week";
      label = "Last 3 Months";
    } else if (range === "1y") {
      start.setFullYear(now.getFullYear() - 1);
      bucket = "month";
      label = "Last 12 Months";
    }

    return {
      now,
      start,
      bucket,
      label
    };
  },

  getCompletedOrders(orders) {
    return (Array.isArray(orders) ? orders : []).filter((order) => {
      const paymentStatus = String(order?.payment_status || "").toLowerCase();
      const orderStatus = String(order?.order_status || "").toLowerCase();
      const fulfillmentStatus = String(order?.fulfillment_status || "").toLowerCase();

      if (orderStatus === "cancelled") return false;

      return (
        paymentStatus === "paid" ||
        orderStatus === "fulfilled" ||
        orderStatus === "shipped" ||
        fulfillmentStatus === "fulfilled" ||
        fulfillmentStatus === "shipped"
      );
    });
  },

  formatCurrency(value) {
    return `$${Number(value || 0).toFixed(2)}`;
  },

  getBucketKey(date, bucket) {
    const d = new Date(date);

    if (bucket === "hour") {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const hour = String(d.getHours()).padStart(2, "0");
      return `${year}-${month}-${day} ${hour}:00`;
    }

    if (bucket === "day") {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }

    if (bucket === "week") {
      const temp = new Date(d);
      const day = temp.getDay();
      const diff = temp.getDate() - day + (day === 0 ? -6 : 1);
      temp.setDate(diff);

      const year = temp.getFullYear();
      const month = String(temp.getMonth() + 1).padStart(2, "0");
      const dateNum = String(temp.getDate()).padStart(2, "0");
      return `${year}-${month}-${dateNum}`;
    }

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  },

  getBucketLabelFromKey(key, bucket) {
    if (bucket === "hour") {
      const [datePart, hourPart] = key.split(" ");
      const d = new Date(`${datePart}T${hourPart.replace(":00", "")}:00:00`);
      return d.toLocaleTimeString([], { hour: "numeric" });
    }

    if (bucket === "day") {
      const d = new Date(`${key}T00:00:00`);
      return d.toLocaleDateString([], { month: "short", day: "numeric" });
    }

    if (bucket === "week") {
      const d = new Date(`${key}T00:00:00`);
      return d.toLocaleDateString([], { month: "short", day: "numeric" });
    }

    const [year, month] = key.split("-");
    const d = new Date(`${year}-${month}-01T00:00:00`);
    return d.toLocaleDateString([], { month: "short", year: "2-digit" });
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

    const sortedKeys = Object.keys(totalsByBucket).sort();

    return {
      completedCount: filtered.length,
      totalSales: filtered.reduce((sum, order) => sum + Number(order?.total_amount || 0), 0),
      averageOrder: filtered.length
        ? filtered.reduce((sum, order) => sum + Number(order?.total_amount || 0), 0) / filtered.length
        : 0,
      labels: sortedKeys.map((key) => this.getBucketLabelFromKey(key, config.bucket)),
      values: sortedKeys.map((key) => Number(totalsByBucket[key] || 0)),
      rangeLabel: config.label
    };
  },

  renderChart(labels, values) {
    const canvas = document.getElementById("paymentTrackingChart");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const ratio = window.devicePixelRatio || 1;
    const width = canvas.clientWidth || 600;
    const height = canvas.clientHeight || 280;

    canvas.width = width * ratio;
    canvas.height = height * ratio;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

    ctx.clearRect(0, 0, width, height);

    const padding = { top: 20, right: 18, bottom: 44, left: 50 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    if (!labels.length || !values.length) {
      ctx.fillStyle = "#70809d";
      ctx.font = "600 14px Inter, Arial, sans-serif";
      ctx.fillText("No completed sales in this range yet.", 20, height / 2);
      return;
    }

    const maxValue = Math.max(...values, 10);
    const steps = 4;

    ctx.strokeStyle = "#e3e9f2";
    ctx.lineWidth = 1;

    for (let i = 0; i <= steps; i += 1) {
      const y = padding.top + (chartHeight / steps) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      const labelValue = Math.round(maxValue - (maxValue / steps) * i);
      ctx.fillStyle = "#7a879d";
      ctx.font = "12px Inter, Arial, sans-serif";
      ctx.fillText(`$${labelValue}`, 8, y + 4);
    }

    const pointCount = values.length;
    const xStep = pointCount > 1 ? chartWidth / (pointCount - 1) : 0;

    const points = values.map((value, index) => {
      const x = padding.left + (pointCount > 1 ? xStep * index : chartWidth / 2);
      const y = padding.top + chartHeight - (value / maxValue) * chartHeight;
      return { x, y, value };
    });

    ctx.beginPath();
    points.forEach((point, index) => {
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.strokeStyle = "#387eb6";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.beginPath();
    points.forEach((point) => {
      ctx.moveTo(point.x, point.y);
      ctx.arc(point.x, point.y, 3.5, 0, Math.PI * 2);
    });
    ctx.fillStyle = "#387eb6";
    ctx.fill();

    ctx.fillStyle = "#7a879d";
    ctx.font = "12px Inter, Arial, sans-serif";

    const labelStep = Math.ceil(labels.length / 6);

    labels.forEach((label, index) => {
      if (index % labelStep !== 0 && index !== labels.length - 1) return;

      const x = padding.left + (pointCount > 1 ? xStep * index : chartWidth / 2);
      ctx.save();
      ctx.translate(x, height - 16);
      ctx.textAlign = "center";
      ctx.fillText(label, 0, 0);
      ctx.restore();
    });
  },

  render(orders) {
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
