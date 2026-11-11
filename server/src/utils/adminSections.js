/** Assignable admin panel sections (one key per sidebar page). */
const ADMIN_SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "profile", label: "Profile", always: true },
  { id: "new_customers", label: "New Customers" },
  { id: "partner_approvals", label: "New Delivery Partners" },
  { id: "products", label: "Products" },
  { id: "daily_prices", label: "Daily Prices" },
  { id: "price_range_graph", label: "Price Range Graph" },
  { id: "todays_catch", label: "Today's Catch" },
  { id: "whatsapp_broadcast", label: "Broadcast WhatsApp" },
  { id: "invoices", label: "Invoices" },
  { id: "deliveries", label: "Order Management" },
  { id: "assign_delivery_partners", label: "Assign Delivery Partners" },
  { id: "all_orders", label: "ALL Orders" },
  { id: "orders_list", label: "Orders List" },
  { id: "today_delivery_status", label: "Today Delivery Status" },
  { id: "manage_delivery_order_list", label: "Manage Delivery Order List" },
  { id: "partner_report", label: "Partner Report" },
  { id: "overall_reports", label: "Overall Reports" },
  { id: "pending_payments", label: "Pending Payments" },
  { id: "collected_payments", label: "Collected Payments" },
  { id: "delivery_amount_collection", label: "Delivery Amount Collection" },
  { id: "delivery_status_change", label: "Delivery Status Change" },
  { id: "delivery_trips_control", label: "Delivery Trips Control" },
  { id: "purchases", label: "Purchases" },
  { id: "settlements", label: "Settlements" },
  { id: "buy_sell_details", label: "Buy & Sell Details" },
  { id: "partner_salary", label: "Partner Salary" },
  { id: "petrol_allowance", label: "Petrol Allowance" },
  { id: "earnings", label: "Admin Earnings" },
  { id: "calculations", label: "Calculations" },
  { id: "gst", label: "GST" },
  { id: "users", label: "Users" },
  { id: "users_history", label: "Users History" },
  { id: "money_management", label: "Money Management" },
  { id: "expenses", label: "Expenses" },
  { id: "finance", label: "Manual Ledger" },
  { id: "availability", label: "Availability" },
  { id: "customer_reviews", label: "Customer Reviews" },
  { id: "sourcing_photos", label: "Sourcing Photos" },
  { id: "notifications", label: "Notifications" },
  { id: "due_dates", label: "Due Dates" },
  { id: "walk_in", label: "Walk-in" },
  { id: "walk_in_accounts", label: "Walk-in Accounts" },
  { id: "manual_booking", label: "Manual Booking" },
  { id: "tools", label: "Tools" },
  { id: "manage_admins", label: "Manage Admins", fullOnly: true }
];

const ASSIGNABLE_SECTION_IDS = ADMIN_SECTIONS.filter((s) => !s.always && !s.fullOnly).map(
  (s) => s.id
);

const ALL_SECTION_IDS = new Set(ADMIN_SECTIONS.map((s) => s.id));

/** Empty / missing adminSections = full access ONLY when isFullAdmin is not false. */
const isFullAdmin = (user) => {
  if (!user || user.role !== "admin") return false;
  if (user.isFullAdmin === false) return false;
  if (user.isFullAdmin === true) return true;
  const sections = user.adminSections;
  return !Array.isArray(sections) || sections.length === 0;
};

const hasAdminSection = (user, ...sectionIds) => {
  if (!user || user.role !== "admin") return false;
  if (isFullAdmin(user)) return true;
  const allowed = new Set(user.adminSections || []);
  // Limited admins always keep Profile; Overview is assignable via Manage Admins
  allowed.add("profile");
  // Finance cluster companions (same as client nav)
  if (allowed.has("earnings") || allowed.has("finance") || allowed.has("expenses")) {
    allowed.add("calculations");
    allowed.add("gst");
  }
  if (allowed.has("walk_in")) {
    allowed.add("walk_in_accounts");
  }
  if (allowed.has("deliveries")) {
    allowed.add("assign_delivery_partners");
    allowed.add("orders_list");
  }
  if (allowed.has("all_orders")) {
    allowed.add("orders_list");
  }
  return sectionIds.some((id) => allowed.has(id));
};

const normalizeAdminSections = (raw) => {
  if (raw == null) return [];
  if (!Array.isArray(raw)) return null;
  const cleaned = [
    ...new Set(
      raw
        .map((s) => String(s || "").trim())
        .filter((id) => ASSIGNABLE_SECTION_IDS.includes(id))
    )
  ];
  return cleaned;
};

module.exports = {
  ADMIN_SECTIONS,
  ASSIGNABLE_SECTION_IDS,
  ALL_SECTION_IDS,
  isFullAdmin,
  hasAdminSection,
  normalizeAdminSections
};
