window.DASHBOARD_PARTIALS = [
  { mountId: "sessionOverviewMount", file: "session-overview/session-overview.html" },
  { mountId: "paymentInfoMount", file: "payment-info/payment.html" },
  { mountId: "shippingInfoMount", file: "shipping-info/shipping.html" },
  { mountId: "billingInfoMount", file: "billing-info/billing.html" },
  { mountId: "cartItemsMount", file: "cart-items/cart-items.html" },
  { mountId: "analyticsMount", file: "analytics/analytics.html" },
  { mountId: "orderDetailMount", file: "order-detail/order-detail.html" },
  { mountId: "paymentTrackingMount", file: "payment-tracking/payment-tracking.html" }
];

window.AXIOM_DASHBOARD_STATE = window.AXIOM_DASHBOARD_STATE || {
  allSessions: [],
  allOrders: [],
  selectedSessionId: null,
  selectedOrderId: null,
  dashboardRealtimeChannel: null,
  hasShownCheckoutSessionsError: false,
  hasShownOrdersError: false,
  isOrderDetailOpen: false
};
