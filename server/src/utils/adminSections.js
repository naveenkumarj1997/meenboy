/** Assignable admin panel sections (one key per sidebar page). */
const ADMIN_SECTIONS = [
  { id: "overview", label: "Overview", always: true },
  { id: "profile", label: "Profile", always: true },
  { id: "new_customers", label: "New Customers" },
  { id: "partner_approvals", label: "New Delivery Partners" },
  { id: "products", label: "Products" },
  { id: "daily_prices", label: "Daily Prices" },
  { id: "invoices", label: "Invoices" },
  { id: "deliveries", label: "Order Management" },
  { id: "all_orders", label: "ALL Orders" },
  { id: "today_delivery_status", label: "Today Delivery Status" },
  { id: "partner_report", label: "Partner Report" },
  { id: "overall_reports", label: "Overall Reports" },
  { id: "pending_payments", label: "Pending Payments" },
  { id: "collected_payments", label: "Collected Payments" },
  { id: "delivery_amount_collection", label: "Delivery Amount Collection" },
  { id: "delivery_status_change", label: "Delivery Status Change" },
  { id: "purchases", label: "Purchases" },
  { id: "settlements", label: "Settlements" },
  { id: "partner_salary", label: "Partner Salary" },
  { id: "earnings", label: "Admin Earnings" },
  { id: "users", label: "Users" },
  { id: "money_management", label: "Money Management" },
  { id: "expenses", label: "Expenses" },
  { id: "finance", label: "Manual Ledger" },
  { id: "availability", label: "Availability" },
  { id: "walk_in", label: "Walk-in" },
  { id: "manual_booking", label: "Manual Booking" },
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
  // Limited admins always keep overview + profile
  allowed.add("overview");
  allowed.add("profile");
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
