export type AdminSectionId =
  | "overview"
  | "profile"
  | "new_customers"
  | "partner_approvals"
  | "products"
  | "daily_prices"
  | "todays_catch"
  | "whatsapp_broadcast"
  | "invoices"
  | "deliveries"
  | "all_orders"
  | "today_delivery_status"
  | "manage_delivery_order_list"
  | "partner_report"
  | "overall_reports"
  | "pending_payments"
  | "collected_payments"
  | "delivery_amount_collection"
  | "delivery_status_change"
  | "purchases"
  | "settlements"
  | "partner_salary"
  | "petrol_allowance"
  | "earnings"
  | "calculations"
  | "gst"
  | "users"
  | "money_management"
  | "expenses"
  | "finance"
  | "availability"
  | "notifications"
  | "due_dates"
  | "walk_in"
  | "walk_in_accounts"
  | "manual_booking"
  | "manage_admins";

export interface AdminSectionDef {
  id: AdminSectionId;
  label: string;
  href: string;
  always?: boolean;
  fullOnly?: boolean;
}

/** One section per admin sidebar page. */
export const ADMIN_SECTION_DEFS: AdminSectionDef[] = [
  { id: "overview", label: "Overview", href: "/dashboard/admin" },
  { id: "profile", label: "Profile", href: "/dashboard/admin/profile", always: true },
  { id: "new_customers", label: "New Customers", href: "/dashboard/admin/new-customers" },
  {
    id: "partner_approvals",
    label: "New Delivery Partners",
    href: "/dashboard/admin/partner-approvals"
  },
  { id: "products", label: "Products", href: "/dashboard/admin/products" },
  { id: "daily_prices", label: "Daily Prices", href: "/dashboard/admin/daily-prices" },
  { id: "todays_catch", label: "Today's Catch", href: "/dashboard/admin/todays-catch" },
  {
    id: "whatsapp_broadcast",
    label: "Broadcast WhatsApp",
    href: "/dashboard/admin/broadcast-whatsapp"
  },
  { id: "invoices", label: "Invoices", href: "/dashboard/admin/invoices" },
  { id: "deliveries", label: "Order Management", href: "/dashboard/admin/deliveries" },
  { id: "all_orders", label: "ALL Orders", href: "/dashboard/admin/all-orders" },
  {
    id: "today_delivery_status",
    label: "Today Delivery Status",
    href: "/dashboard/admin/today-delivery-status"
  },
  {
    id: "manage_delivery_order_list",
    label: "Manage Delivery Order List",
    href: "/dashboard/admin/manage-delivery-order-list"
  },
  { id: "partner_report", label: "Partner Report", href: "/dashboard/admin/partner-report" },
  { id: "overall_reports", label: "Overall Reports", href: "/dashboard/admin/overall-reports" },
  { id: "pending_payments", label: "Pending Payments", href: "/dashboard/admin/pending-payments" },
  {
    id: "collected_payments",
    label: "Collected Payments",
    href: "/dashboard/admin/collected-payments"
  },
  {
    id: "delivery_amount_collection",
    label: "Delivery Amount Collection",
    href: "/dashboard/admin/delivery-amount-collection"
  },
  {
    id: "delivery_status_change",
    label: "Delivery Status Change",
    href: "/dashboard/admin/delivery-status-change"
  },
  { id: "purchases", label: "Purchases", href: "/dashboard/admin/purchases" },
  { id: "settlements", label: "Settlements", href: "/dashboard/admin/settlements" },
  { id: "partner_salary", label: "Partner Salary", href: "/dashboard/admin/partner-salary" },
  {
    id: "petrol_allowance",
    label: "Petrol Allowance",
    href: "/dashboard/admin/petrol-allowance"
  },
  { id: "earnings", label: "Admin Earnings", href: "/dashboard/admin/earnings" },
  { id: "calculations", label: "Calculations", href: "/dashboard/admin/calculations" },
  { id: "gst", label: "GST", href: "/dashboard/admin/gst" },
  { id: "users", label: "Users", href: "/dashboard/admin/users" },
  {
    id: "money_management",
    label: "Money Management",
    href: "/dashboard/admin/money-management"
  },
  { id: "expenses", label: "Expenses", href: "/dashboard/admin/expenses" },
  { id: "finance", label: "Manual Ledger", href: "/dashboard/admin/finance" },
  { id: "availability", label: "Availability", href: "/dashboard/admin/availability" },
  { id: "notifications", label: "Notifications", href: "/dashboard/admin/notifications" },
  { id: "due_dates", label: "Due Dates", href: "/dashboard/admin/due-dates" },
  { id: "walk_in", label: "Walk-in", href: "/dashboard/admin/walk-in" },
  {
    id: "walk_in_accounts",
    label: "Walk-in Accounts",
    href: "/dashboard/admin/walk-in-accounts"
  },
  { id: "manual_booking", label: "Manual Booking", href: "/dashboard/admin/manual-booking" },
  {
    id: "manage_admins",
    label: "Manage Admins",
    href: "/dashboard/admin/manage-admins",
    fullOnly: true
  }
];

export const ASSIGNABLE_ADMIN_SECTIONS = ADMIN_SECTION_DEFS.filter(
  (s) => !s.always && !s.fullOnly
);

export const isFullAdmin = (user: {
  role?: string;
  adminSections?: string[] | null;
  isFullAdmin?: boolean;
} | null): boolean => {
  if (!user || user.role !== "admin") return false;
  // Explicit flag from API (preferred)
  if (user.isFullAdmin === false) return false;
  if (user.isFullAdmin === true) return true;
  const sections = user.adminSections;
  // Any assigned sections => limited admin
  if (Array.isArray(sections) && sections.length > 0) return false;
  // Legacy full admins (no sections field / empty)
  return true;
};

export const hasAdminSection = (
  user: { role?: string; adminSections?: string[] | null; isFullAdmin?: boolean } | null,
  ...sectionIds: AdminSectionId[]
): boolean => {
  if (!user || user.role !== "admin") return false;
  if (isFullAdmin(user)) return true;
  const allowed = new Set(
    Array.isArray(user.adminSections) ? user.adminSections.map(String) : []
  );
  // Limited admins always keep Profile only; Overview is assignable
  allowed.add("profile");
  if (allowed.has("earnings") || allowed.has("finance") || allowed.has("expenses")) {
    allowed.add("calculations");
    allowed.add("gst");
  }
  if (allowed.has("walk_in")) {
    allowed.add("walk_in_accounts");
  }
  return sectionIds.some((id) => allowed.has(id));
};

export const getAdminNavLinksForUser = (user: {
  role?: string;
  adminSections?: string[] | null;
  isFullAdmin?: boolean;
} | null) => {
  if (!user || user.role !== "admin") return [];
  if (isFullAdmin(user)) {
    return ADMIN_SECTION_DEFS.map(({ label, href }) => ({ label, href }));
  }
  const allowed = new Set(
    Array.isArray(user.adminSections) ? user.adminSections.map(String) : []
  );
  // Finance cluster: older limited-admin lists may predate Calculations / GST
  if (allowed.has("earnings") || allowed.has("finance") || allowed.has("expenses")) {
    allowed.add("calculations");
    allowed.add("gst");
  }
  if (allowed.has("walk_in")) {
    allowed.add("walk_in_accounts");
  }
  return ADMIN_SECTION_DEFS.filter(
    (s) => s.always || (!s.fullOnly && allowed.has(s.id))
  ).map(({ label, href }) => ({ label, href }));
};

/** First page a limited admin may open (Profile fallback). */
export const getAdminHomePath = (user: {
  role?: string;
  adminSections?: string[] | null;
  isFullAdmin?: boolean;
} | null): string => {
  if (!user || user.role !== "admin") return "/login";
  if (isFullAdmin(user) || hasAdminSection(user, "overview")) {
    return "/dashboard/admin";
  }
  const links = getAdminNavLinksForUser(user);
  return links[0]?.href || "/dashboard/admin/profile";
};

export const sectionIdForPath = (pathname: string): AdminSectionId | null => {
  const exact = ADMIN_SECTION_DEFS.find((s) => s.href === pathname);
  if (exact) return exact.id;
  return null;
};
