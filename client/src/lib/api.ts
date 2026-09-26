import type { AuthResponse } from "../types/auth";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

interface AuthPayload {
  name?: string;
  email: string;
  password: string;
  phone?: string;
  role?: "customer" | "admin" | "delivery_partner";
}

export const request = async <T>(url: string, options?: RequestInit): Promise<T> => {
  const { headers, ...restOptions } = options || {};
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${url}`, {
      cache: "no-store",
      ...restOptions,
      headers: {
        "Content-Type": "application/json",
        ...headers
      }
    });
  } catch {
    throw new ApiError(
      "Cannot reach the server. Check that the API is running, then refresh.",
      0
    );
  }

  const raw = await response.text();
  let data: any = {};
  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch {
      data = {};
    }
  }

  if (!response.ok) {
    const errorMsg = data?.message || data?.errors?.[0]?.msg || "Request failed";
    throw new ApiError(errorMsg, response.status);
  }

  return data as T;
};

export const registerUser = async (payload: AuthPayload) =>
  request<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload)
  });

export const loginUser = async (payload: AuthPayload) =>
  request<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload)
  });

export const verifyEmailForPasswordReset = async (email: string) =>
  request<{ exists: boolean; email?: string; name?: string; message: string }>(
    "/auth/forgot-password/verify-email",
    {
      method: "POST",
      body: JSON.stringify({ email })
    }
  );

export const resetPasswordByEmail = async (payload: {
  email: string;
  password: string;
  confirmPassword: string;
}) =>
  request<{ message: string }>("/auth/forgot-password/reset", {
    method: "POST",
    body: JSON.stringify(payload)
  });

export const getCurrentUser = async (token: string) =>
  request<{ user: AuthResponse["user"] }>("/auth/me", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

export const submitPartnerNda = async (
  token: string,
  payload: {
    aadhaarNumber: string;
    dlNumber: string;
    bikeRcNumber: string;
    bikeNumber: string;
    phone?: string;
    accepted: boolean;
    downloaded: boolean;
  }
) =>
  request<{ message: string; user: AuthResponse["user"] }>("/auth/partner-nda", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });

export const downloadPartnerNdaPdf = async (
  token: string,
  draft?: {
    aadhaarNumber?: string;
    dlNumber?: string;
    bikeRcNumber?: string;
    bikeNumber?: string;
    phone?: string;
    partnerId?: string;
  }
) => {
  const qs = new URLSearchParams();
  if (draft?.aadhaarNumber) qs.set("aadhaarNumber", draft.aadhaarNumber);
  if (draft?.dlNumber) qs.set("dlNumber", draft.dlNumber);
  if (draft?.bikeRcNumber) qs.set("bikeRcNumber", draft.bikeRcNumber);
  if (draft?.bikeNumber) qs.set("bikeNumber", draft.bikeNumber);
  if (draft?.phone) qs.set("phone", draft.phone);
  if (draft?.partnerId) qs.set("partnerId", draft.partnerId);
  const query = qs.toString() ? `?${qs.toString()}` : "";
  const response = await fetch(`${API_BASE}/auth/partner-nda.pdf${query}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error((data as { message?: string }).message || "Failed to download NDA PDF");
  }
  return response.blob();
};

// ─── Products API ─────────────────────────────────────────────────────────────

export interface CutPayload {
  name: string;
  price: number;
  description?: string;
}

export interface ProductPayload {
  name: string;
  category: string;
  unit: "kg" | "piece";
  description?: string;
  minPrice: number;
  maxPrice: number;
  image?: string;
  availableCuts?: CutPayload[];
}

export const getAdminOverview = async (token: string, date?: string) => {
  const qs = date ? `?date=${encodeURIComponent(date)}` : "";
  return request<AdminOverviewPayload>(`/dashboard/admin${qs}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
};

export interface AdminOverviewPayload {
  date: string;
  weekStart: string;
  summary: {
    totalProducts: number;
    activeProducts: number;
    activeOrders: number;
    revenueAllTime: number;
    revenueToday: number;
    revenueWeek: number;
  };
  attention: {
    newCustomers: number;
    pendingPartners: number;
    unassignedToday: number;
    notDeliveredToday: number;
    assignmentPendingToday: number;
    pendingPaymentCustomers: number;
    pendingPaymentAmount: number;
  };
  today: {
    ordersTotal: number;
    ordersDelivered: number;
    ordersRemaining: number;
    bookingManual: number;
    bookingWebsite: number;
    catchEnabled: boolean;
    catchItemCount: number;
    catchStockQty: number;
  };
  money: {
    todayCash: number;
    todayUpi: number;
    todayCollected: number;
    weekCash: number;
    weekUpi: number;
    weekCollected: number;
    salaryUnconfirmedCount: number;
    salaryUnconfirmedAmount: number;
    petrolUnconfirmedCount: number;
    petrolUnconfirmedAmount: number;
  };
}

export const getAdminProducts = async (token: string) =>
  request<{ success: boolean; data: { products: any[]; pagination: any } }>("/catalog/admin/products?limit=200", {
    headers: { Authorization: `Bearer ${token}` }
  });

// ─── Today's Catch (homepage board) ──────────────────────────────────────────

export interface TodayCatchItem {
  id?: string;
  name: string;
  price: number;
  unit?: string;
  note?: string;
  /** Max qty customer can order (e.g. 4). Min on site is 0.5. */
  availableQty?: number;
  imageUrl?: string;
  productId?: string | null;
  sortOrder?: number;
}

export interface TodayCatchPayload {
  enabled: boolean;
  headline: string;
  subheadline: string;
  items: TodayCatchItem[];
  updatedAt?: string;
}

export const getPublicTodayCatch = async () =>
  request<{ todayCatch: TodayCatchPayload }>("/today-catch");

export const getAdminTodayCatch = async (token: string) =>
  request<{ todayCatch: TodayCatchPayload }>("/today-catch/admin", {
    headers: { Authorization: `Bearer ${token}` }
  });

export const updateTodayCatch = async (
  token: string,
  payload: {
    enabled?: boolean;
    headline?: string;
    subheadline?: string;
    items?: TodayCatchItem[];
  }
) =>
  request<{ todayCatch: TodayCatchPayload; message: string }>("/today-catch/admin", {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });

/** Homepage fish banner (pre-booking announcement). Toggle off anytime to hide safely. */
export interface BookingBannerPayload {
  enabled: boolean;
  message: string;
  updatedAt?: string;
}

export const getPublicBookingBanner = async () =>
  request<{ banner: BookingBannerPayload }>("/booking-banner");

export const getAdminBookingBanner = async (token: string) =>
  request<{ banner: BookingBannerPayload }>("/booking-banner/admin", {
    headers: { Authorization: `Bearer ${token}` }
  });

export const updateBookingBanner = async (
  token: string,
  payload: { enabled?: boolean; message?: string }
) =>
  request<{ banner: BookingBannerPayload; message: string }>("/booking-banner/admin", {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });

export interface AlertEmailSettingsPayload {
  emails: string[];
  notifyWebsiteBooking: boolean;
  notifyContactQuery: boolean;
  updatedAt?: string | null;
  smtpConfigured?: boolean;
}

export const getAdminAlertEmails = async (token: string) =>
  request<{ settings: AlertEmailSettingsPayload }>("/alert-emails/admin", {
    headers: { Authorization: `Bearer ${token}` }
  });

export const updateAdminAlertEmails = async (
  token: string,
  payload: {
    emails?: string[];
    notifyWebsiteBooking?: boolean;
    notifyContactQuery?: boolean;
  }
) =>
  request<{ settings: AlertEmailSettingsPayload; message: string }>("/alert-emails/admin", {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });

export const sendTestAlertEmail = async (token: string) =>
  request<{ message: string; recipients?: string[] }>("/alert-emails/admin/test", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` }
  });

export const submitContactQuery = async (payload: {
  name: string;
  email: string;
  message: string;
}) =>
  request<{ message: string }>("/alert-emails/contact", {
    method: "POST",
    body: JSON.stringify(payload)
  });

export interface CategoryWeekdayRulePayload {
  category: string;
  deliveryWeekdays: number[];
  cutoffEnabled: boolean;
  cutoffDaysBefore: number;
  cutoffHour: number;
  cutoffMinute: number;
}

export interface CategoryWeekdayConfigPayload {
  enabled: boolean;
  rules: CategoryWeekdayRulePayload[];
  updatedAt?: string | null;
}

export const getPublicCategoryWeekdayRules = async (categories?: string[]) => {
  const qs =
    categories && categories.length > 0
      ? `?categories=${encodeURIComponent(categories.join(","))}`
      : "";
  return request<{ config: CategoryWeekdayConfigPayload; notices: string[] }>(
    `/category-weekday-rules${qs}`
  );
};

export const getAdminCategoryWeekdayRules = async (token: string) =>
  request<{ config: CategoryWeekdayConfigPayload }>("/category-weekday-rules/admin", {
    headers: { Authorization: `Bearer ${token}` }
  });

export const updateAdminCategoryWeekdayRules = async (
  token: string,
  payload: { enabled?: boolean; rules?: CategoryWeekdayRulePayload[] }
) =>
  request<{ config: CategoryWeekdayConfigPayload; message: string }>(
    "/category-weekday-rules/admin",
    {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload)
    }
  );

export const getCatalog = async () =>
  request<{ success: boolean; data: { products: any[]; pagination: any } }>("/catalog/products?limit=100");

export const getProductById = async (id: string) =>
  request<{ success: boolean; data: { product: any } }>(`/catalog/products/${id}`);

export const createAdminProduct = async (token: string, payload: ProductPayload) =>
  request<{ success: boolean; data: { product: any } }>("/catalog/products", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });

export const updateAdminProduct = async (token: string, id: string, payload: Partial<ProductPayload>) =>
  request<{ success: boolean; data: { product: any } }>(`/catalog/products/${id}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });

export const setAdminProductVisibility = async (token: string, id: string, isActive: boolean) =>
  request<{ success: boolean; message: string; data: { product: any } }>(`/catalog/products/${id}/visibility`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ isActive })
  });

export const deleteAdminProduct = async (token: string, id: string) =>
  request<{ success: boolean; message: string }>(`/catalog/products/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });

export const uploadAdminImage = async (token: string, file: File) => {
  const formData = new FormData();
  formData.append("image", file);

  const response = await fetch(`${API_BASE}/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: formData
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.message || "Upload failed");
  }

  return data as { success: boolean; message: string; url: string };
};

export const uploadPartnerDocument = async (
  token: string,
  file: File,
  phone: string,
  documentType: string
) => {
  const formData = new FormData();
  formData.append("document", file);
  formData.append("phone", phone);
  formData.append("documentType", documentType);

  const response = await fetch(`${API_BASE}/upload/document`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: formData
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.message || "Upload failed");
  }

  return data as {
    success: boolean;
    message: string;
    hasDocument: boolean;
    documentType: string;
    documentFileName: string;
    phone: string;
  };
};

export const fetchPartnerDocumentBlob = async (token: string, userId: string) => {
  const response = await fetch(`${API_BASE}/users/${userId}/document`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data?.message || "Failed to open document");
  }
  return response.blob();
};

export const deletePartnerDocument = async (token: string, userId: string) =>
  request<{ message: string; hasDocument: boolean }>(`/users/${userId}/document`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });

export interface OrderPayload {
  items: {
    product: string;
    productName: string;
    productImage: string;
    quantity: number;
    unit?: string;
    unitPrice: number;
    totalPrice: number;
    cutName?: string;
    notes?: string;
  }[];
  address: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country?: string;
    phone?: string;
    alternatePhone?: string;
  };
  deliveryDate: string;
  deliveryTime: string;
  mapUrl?: string;
}

export const createOrder = async (token: string, payload: OrderPayload) =>
  request<{ order: any }>("/orders", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });

export interface AdminOrderPayload extends OrderPayload {
  customerId?: string;
  customerNotes?: string;
  deliveryFee?: number;
  discountAmount?: number;
  discountNote?: string;
  addonAmount?: number;
  addonNote?: string;
  newCustomer?: {
    name: string;
    email: string;
    phone: string;
    alternatePhone?: string;
  };
}

export const createAdminOrder = async (token: string, payload: AdminOrderPayload) =>
  request<{ order: any }>("/orders/admin-booking", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });

/** Last non-cancelled order delivery time for Manual Booking prefill */
export const getCustomerLastDelivery = async (token: string, customerId: string) =>
  request<{ deliveryTime: string | null; deliveryDate: string | null }>(
    `/orders/admin/customer-last-delivery?customerId=${encodeURIComponent(customerId)}`,
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );

export const getMyOrders = async (token: string) =>
  request<{ orders: any[] }>("/orders/me", {
    headers: { Authorization: `Bearer ${token}` }
  });

export interface PaymentPayload {
  order: string;
  provider: "cash_on_delivery" | "upi";
  amount: number;
}

export const createPayment = async (token: string, payload: PaymentPayload) =>
  request<{ payment: any }>("/payments", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });

export const getMyPayments = async (token: string) =>
  request<{ payments: any[] }>("/payments/me", {
    headers: { Authorization: `Bearer ${token}` }
  });

export const getDailyPriceProducts = async (token: string, deliveryDate: string) =>
  request<{
    products: any[];
    dailyPriceUpdated?: boolean;
    updatedAt?: string | null;
    updatedByName?: string | null;
    changes?: any[];
  }>(`/orders/daily-prices/products?deliveryDate=${deliveryDate}`, {
    headers: { Authorization: `Bearer ${token}` }
  });

export const updateDailyPrices = async (token: string, payload: { deliveryDate: string; priceUpdates: any[] }) =>
  request<{
    message: string;
    updatedCount: number;
    changes?: any[];
    products?: any[];
  }>("/orders/daily-prices", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });

export const getAdminInvoices = async (token: string, deliveryDate: string) =>
  request<{ invoices: any[] }>(`/orders/admin/invoices?deliveryDate=${deliveryDate}`, {
    headers: { Authorization: `Bearer ${token}` }
  });

export const downloadInvoice = async (token: string, orderId: string) => {
  const response = await fetch(`${API_BASE}/orders/${orderId}/invoice`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || "Failed to download invoice");
  }
  return response.blob();
};

export const downloadPartnerDayReport = async (
  token: string,
  params: { date: string; partnerId?: string }
) => {
  const qs = new URLSearchParams({ date: params.date });
  if (params.partnerId && params.partnerId !== "all") {
    qs.set("partnerId", params.partnerId);
  } else {
    qs.set("partnerId", "all");
  }
  const response = await fetch(`${API_BASE}/orders/reports/partner-day?${qs}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || "Failed to generate delivery report PDF");
  }
  return response.blob();
};

export const downloadVendorCategoryReport = async (
  token: string,
  params: { date: string; category?: string }
) => {
  const qs = new URLSearchParams({ date: params.date });
  qs.set("category", params.category && params.category !== "all" ? params.category : "all");
  const response = await fetch(`${API_BASE}/orders/reports/vendor-category?${qs}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || "Failed to generate vendor prep PDF");
  }
  return response.blob();
};

export const getVendorPrepPreview = async (
  token: string,
  params: { date: string; category?: string }
) =>
  request<{
    stats: {
      totalOrders: number;
      manualOrders: number;
      websiteOrders: number;
    };
    categoryFilter?: string;
    categoryLabel?: string;
    rows?: Array<{
      productName: string;
      cutName?: string;
      quantity: number;
      unit?: string;
      notes?: string;
      displayNotes?: string;
      notesRowSpan?: number;
      orderId?: string;
      customerName?: string;
      bookingSource?: string;
    }>;
    totals?: Array<{ label: string; quantity: number; unit?: string }>;
    sections?: Array<{
      categoryLabel: string;
      rows: Array<{
        productName: string;
        cutName?: string;
        quantity: number;
        unit?: string;
        notes?: string;
        displayNotes?: string;
        notesRowSpan?: number;
        orderId?: string;
        customerName?: string;
        bookingSource?: string;
      }>;
      totals: Array<{ label: string; quantity: number; unit?: string }>;
    }>;
  }>(`/orders/reports/vendor-prep?date=${encodeURIComponent(params.date)}&category=${encodeURIComponent(
    params.category && params.category !== "all" ? params.category : "all"
  )}`, {
    headers: { Authorization: `Bearer ${token}` }
  });

export const CATEGORY_ORDER_GROUPS = [
  { id: "fish_seafood", label: "Fish & Seafood" },
  { id: "chicken_country_chicken", label: "Chicken & Country Chicken" },
  { id: "mutton", label: "Mutton" }
] as const;

export const getCategoryOrdersReport = async (
  token: string,
  params: { date: string; group: string }
) =>
  request<{
    groups: Array<{ id: string; label: string }>;
    groupId: string;
    groupLabel: string;
    date: string;
    stats: { orderCount: number; itemCount: number };
    rows: Array<{
      orderId: string;
      customerName: string;
      phone: string;
      email?: string;
      address: string;
      deliveryTime: string;
      deliveryDate: string;
      status: string;
      bookingSource: string;
      partnerName: string;
      mapUrl?: string;
      customerNotes?: string;
      orderTotal: number;
      paymentStatus?: string;
      productName: string;
      cutName?: string;
      quantity: number;
      unit?: string;
      itemNotes?: string;
      productCategory: string;
    }>;
  }>(
    `/orders/reports/category-orders?date=${encodeURIComponent(params.date)}&group=${encodeURIComponent(params.group)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

export interface AllOrdersReportItem {
  productName: string;
  cutName?: string;
  quantity: number;
  unit?: string;
  notes?: string;
  unitPrice: number;
  totalPrice: number;
  productCategory: string;
}

export interface AllOrdersReportOrder {
  orderId: string;
  customerName: string;
  phone: string;
  alternatePhone?: string;
  email?: string;
  address: string;
  deliveryTime: string;
  deliveryDate: string;
  status: string;
  bookingSource: string;
  partnerName: string;
  partnerPhone?: string;
  assignmentStatus?: string;
  paymentCollected?: number;
  paymentMethod?: string;
  mapUrl?: string;
  customerNotes?: string;
  subtotal: number;
  deliveryFee: number;
  discountAmount?: number;
  discountNote?: string;
  addonAmount?: number;
  addonNote?: string;
  total: number;
  paymentStatus?: string;
  items: AllOrdersReportItem[];
  createdAt?: string;
}

export const getAllOrdersReport = async (token: string, params: { date: string }) =>
  request<{
    date: string;
    stats: { orderCount: number; itemCount: number };
    orders: AllOrdersReportOrder[];
  }>(
    `/orders/reports/all-orders?date=${encodeURIComponent(params.date)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

export const downloadAllOrdersReport = async (token: string, params: { date: string }) => {
  const qs = new URLSearchParams({ date: params.date });
  const response = await fetch(`${API_BASE}/orders/reports/all-orders/pdf?${qs}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || "Failed to generate all orders PDF");
  }
  return response.blob();
};

export const downloadCategoryOrdersReport = async (
  token: string,
  params: { date: string; group: string }
) => {
  const qs = new URLSearchParams({ date: params.date, group: params.group });
  const response = await fetch(`${API_BASE}/orders/reports/category-orders/pdf?${qs}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || "Failed to generate category orders PDF");
  }
  return response.blob();
};

export const getAdminOrders = async (token: string) =>
  request<{ orders: any[] }>("/orders/admin", {
    headers: { Authorization: `Bearer ${token}` }
  });

export const getDeliveryPartners = async (token: string) =>
  request<{ deliveryPartners: any[] }>("/auth/delivery-partners", {
    headers: { Authorization: `Bearer ${token}` }
  });

export const getAllAssignments = async (token: string) =>
  request<{ assignments: any[] }>("/orders/assignments/all", {
    headers: { Authorization: `Bearer ${token}` }
  });

export const getTodayDeliveryStatus = async (
  token: string,
  params?: { date?: string; partnerId?: string }
) => {
  const qs = new URLSearchParams();
  if (params?.date) qs.set("date", params.date);
  if (params?.partnerId) qs.set("partnerId", params.partnerId);
  const query = qs.toString() ? `?${qs.toString()}` : "";
  return request<{
    date: string;
    assignments: any[];
    partnerSummaries: any[];
    counts: {
      total: number;
      assigned: number;
      ongoing: number;
      delivered: number;
      failed: number;
      cancelled: number;
    };
  }>(`/orders/admin/today-delivery-status${query}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
};

export const getPartnerSalariesByDate = async (token: string, date: string) =>
  request<{
    stats: Array<{
      partnerId: string;
      name: string;
      phone?: string;
      deliveredCount: number;
      failedCount: number;
      codCollected: number;
      upiCollected: number;
      salaryAmount: number;
      partnerConfirmed: boolean;
    }>;
  }>(`/users/partner-salaries/${date}`, {
    headers: { Authorization: `Bearer ${token}` }
  });

export const savePartnerSalary = async (
  token: string,
  payload: { date: string; partnerId: string; amount: number }
) =>
  request<{ salary: any; message: string }>("/users/partner-salaries", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });

export const getPartnerCollectionHistory = async (
  token: string,
  partnerId: string,
  limit = 30
) =>
  request<{
    history: Array<{
      date: string;
      deliveryCount: number;
      deliveredCount: number;
      codCollected: number;
      upiCollected: number;
      totalCollected: number;
      totalOrderAmount: number;
      totalPending: number;
      salaryAmount: number;
      netAfterSalary: number;
    }>;
  }>(`/users/partner-collection-history/${partnerId}?limit=${limit}`, {
    headers: { Authorization: `Bearer ${token}` }
  });

export const downloadPartnerCollectionReport = async (
  token: string,
  params: { date: string; partnerId: string }
) => {
  const qs = new URLSearchParams({ date: params.date, partnerId: params.partnerId });
  const response = await fetch(`${API_BASE}/orders/reports/partner-collection?${qs}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || "Failed to download collection report");
  }
  return response.blob();
};

export const getDeliveryStats = async (token: string) =>
  request<{ stats: any }>("/orders/delivery-stats", {
    headers: { Authorization: `Bearer ${token}` }
  });

export const assignDeliveryPartner = async (token: string, orderId: string, payload: { deliveryPartnerId: string, estimatedArrival?: string }) =>
  request<{ assignment: any }>(`/orders/${orderId}/assign-delivery`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });

export const updateOrderStatus = async (token: string, orderId: string, status: string) =>
  request<{ order: any }>(`/orders/${orderId}/status`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ status })
  });

export const updateAdminOrder = async (token: string, orderId: string, payload: any) =>
  request<{ order: any }>(`/orders/${orderId}/admin-edit`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });

export const getPartnerAssignments = async (token: string) =>
  request<{ assignments: any[] }>("/orders/assignments", {
    headers: { Authorization: `Bearer ${token}` }
  });

export type DeliveryTripPayload = {
  id: string;
  date: string;
  status: "active" | "ended" | "auto_ended";
  startedAt?: string;
  endedAt?: string;
  totalKm: number;
  pointCount: number;
};

export const getMyDeliveryTripToday = async (token: string) =>
  request<{
    date: string;
    trip: DeliveryTripPayload | null;
    window: { trackingOpen: boolean; autoEndAfterMinutes: number; nowMinutesIst: number };
  }>("/delivery-trips/me/today", {
    headers: { Authorization: `Bearer ${token}` }
  });

export const startMyDeliveryTrip = async (
  token: string,
  location: { lat: number; lng: number }
) =>
  request<{ message: string; trip: DeliveryTripPayload }>("/delivery-trips/me/start", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ location })
  });

export const pingMyDeliveryTrip = async (
  token: string,
  location: { lat: number; lng: number }
) =>
  request<{ message?: string; trip: DeliveryTripPayload }>("/delivery-trips/me/ping", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ location })
  });

export const endMyDeliveryTrip = async (
  token: string,
  location?: { lat: number; lng: number }
) =>
  request<{ message: string; trip: DeliveryTripPayload }>("/delivery-trips/me/end", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(location ? { location } : {})
  });

export const updateDeliveryStatus = async (
  token: string,
  assignmentId: string,
  payload: {
    status: string;
    notes?: string;
    paymentCollected?: number;
    paymentMethod?: string;
    actualArrival?: string;
    location?: { lat: number; lng: number };
  }
) =>
  request<{ assignment: any }>(`/orders/assignments/${assignmentId}/status`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });

export const adminUpdateDeliveryPayment = async (
  token: string,
  assignmentId: string,
  payload: {
    paymentMethod: string;
    paymentCollected?: number;
    adminNote?: string;
  }
) =>
  request<{ assignment: any; message: string }>(
    `/orders/assignments/${assignmentId}/admin-payment`,
    {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload)
    }
  );

export const reorderAssignments = async (token: string, assignments: { id: string; sequence: number }[]) =>
  request<{ message: string }>("/orders/assignments/reorder", {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ assignments })
  });

export const adminReorderAssignments = async (
  token: string,
  assignments: { id: string; sequence: number }[]
) =>
  request<{ message: string }>("/orders/admin/assignments/reorder", {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ assignments })
  });

// ─── User Management API ─────────────────────────────────────────────────────────────

export const getAllUsers = async (
  token: string,
  options?: { role?: string; realOnly?: boolean }
) => {
  const params = new URLSearchParams();
  if (options?.role) params.set("role", options.role);
  if (options?.realOnly) params.set("realOnly", "true");
  const qs = params.toString() ? `?${params.toString()}` : "";
  return request<{ users: any[] }>(`/users${qs}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
};

/** Unnoticed real customers — for New Customers sidebar badge */
export const getNewCustomersCount = async (token: string) =>
  request<{ count: number }>("/users/new-customers/count", {
    headers: { Authorization: `Bearer ${token}` }
  });

/** Website bookings waiting to assign a delivery partner — Order Management badge */
export const getUnassignedWebsiteOrdersCount = async (token: string) =>
  request<{ count: number }>("/orders/admin/unassigned-website-count", {
    headers: { Authorization: `Bearer ${token}` }
  });

export const updateUser = async (token: string, userId: string, payload: any) =>
  request<{ user: any; message: string }>(`/users/${userId}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });

export const deleteUser = async (token: string, userId: string) =>
  request<{ message: string }>(`/users/${userId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });

// ─── Manage Admins API ───────────────────────────────────────────────────────

export interface ManagedAdmin {
  id: string;
  _id?: string;
  name: string;
  email: string;
  phone?: string;
  status: string;
  role: string;
  adminSections: string[];
  isFullAdmin: boolean;
  createdAt?: string;
}

export const listManagedAdmins = async (token: string) =>
  request<{ admins: ManagedAdmin[] }>("/users/admins", {
    headers: { Authorization: `Bearer ${token}` }
  });

export const createManagedAdmin = async (
  token: string,
  payload: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    isFullAdmin?: boolean;
    adminSections?: string[];
  }
) =>
  request<{ admin: ManagedAdmin; message: string }>("/users/admins", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });

export const updateManagedAdmin = async (
  token: string,
  adminId: string,
  payload: {
    name?: string;
    email?: string;
    phone?: string;
    password?: string;
    status?: string;
    isFullAdmin?: boolean;
    adminSections?: string[];
  }
) =>
  request<{ admin: ManagedAdmin; message: string }>(`/users/admins/${adminId}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });

export const deleteManagedAdmin = async (token: string, adminId: string) =>
  request<{ message: string }>(`/users/admins/${adminId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });

// ─── Finance Management API ─────────────────────────────────────────────────────────────

export interface TransactionPayload {
  type: "collection" | "payment";
  category: "cod" | "upi" | "partner_collection" | "salary" | "other";
  amount: number;
  referenceUser?: string;
  referenceOrder?: string;
  status?: "pending" | "completed" | "failed";
  notes?: string;
  date?: string;
}

export const getFinanceSummary = async (token: string) =>
  request<any>("/finance/summary", {
    headers: { Authorization: `Bearer ${token}` }
  });

export const getMoneyManagement = async (
  token: string,
  period: "today" | "week" | "month" | "all" = "today"
) =>
  request<{
    businessStartDate: string;
    today: string;
    period: string;
    range: { from: string; to: string };
    summary: Record<string, number>;
    periods: Record<string, Record<string, number> & { from: string; to: string }>;
    customerPendingTotal: number;
    customersWithPending: number;
    daily: Array<Record<string, number | string>>;
  }>(`/finance/money-management?period=${period}`, {
    headers: { Authorization: `Bearer ${token}` }
  });

export const getCalculations = async (
  token: string,
  params: {
    period?: "today" | "week" | "month" | "all" | "custom";
    from?: string;
    to?: string;
  } = {}
) => {
  const qs = new URLSearchParams();
  qs.set("period", params.period || "today");
  if (params.from) qs.set("from", params.from);
  if (params.to) qs.set("to", params.to);
  return request<{
    period: string;
    range: { from: string; to: string };
    businessStartDate: string;
    today: string;
    summary: Record<string, number>;
    customers: Array<{
      customerId: string | null;
      name: string;
      phone: string;
      email: string;
      isFamily: boolean;
      bookings: number;
      collectedAtDelivery: number;
      pendingOnOrders: number;
      orderCount: number;
      orders: Array<{
        orderId: string;
        assignmentId: string;
        deliveryDate: string;
        total: number;
        paymentCollected: number;
        paymentMethod: string;
        pendingOnOrder: number;
        partnerName: string;
      }>;
    }>;
    familyAccounts: Array<{
      id: string;
      name: string;
      phone: string;
      pendingBalance: number;
    }>;
    manualCollections: Array<{
      id: string;
      amount: number;
      createdAt: string;
      notes: string;
      customerName: string;
      isFamily: boolean;
    }>;
    walkIns: Array<{
      id: string;
      saleDate: string;
      total: number;
      billNumber: string;
      customerName: string;
    }>;
    formula: Record<string, string>;
  }>(`/finance/calculations?${qs.toString()}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
};

// ─── GST API ──────────────────────────────────────────────────────────────────

export const getGstSettings = async (token: string) =>
  request<{ settings: any }>("/gst/settings", {
    headers: { Authorization: `Bearer ${token}` }
  });

export const updateGstSettings = async (token: string, payload: Record<string, unknown>) =>
  request<{ message: string; settings: any }>("/gst/settings", {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });

export const getGstReport = async (
  token: string,
  params: {
    period?: "today" | "week" | "month" | "all" | "custom";
    from?: string;
    to?: string;
  } = {}
) => {
  const qs = new URLSearchParams();
  qs.set("period", params.period || "month");
  if (params.from) qs.set("from", params.from);
  if (params.to) qs.set("to", params.to);
  return request<any>(`/gst/report?${qs.toString()}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
};

export const downloadGstSalesRegisterPdf = async (
  token: string,
  params: { period?: string; from?: string; to?: string } = {}
) => {
  const qs = new URLSearchParams();
  qs.set("period", params.period || "month");
  if (params.from) qs.set("from", params.from);
  if (params.to) qs.set("to", params.to);
  const response = await fetch(`${API_BASE}/gst/report/sales-register.pdf?${qs.toString()}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error((data as { message?: string }).message || "Failed to download sales register PDF");
  }
  return response.blob();
};

export const downloadGstSummaryPdf = async (
  token: string,
  params: { period?: string; from?: string; to?: string } = {}
) => {
  const qs = new URLSearchParams();
  qs.set("period", params.period || "month");
  if (params.from) qs.set("from", params.from);
  if (params.to) qs.set("to", params.to);
  const response = await fetch(`${API_BASE}/gst/report/summary.pdf?${qs.toString()}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error((data as { message?: string }).message || "Failed to download GST summary PDF");
  }
  return response.blob();
};

export const getTransactions = async (token: string, query: string = "") =>
  request<any[]>(`/finance${query ? `?${query}` : ""}`, {
    headers: { Authorization: `Bearer ${token}` }
  });

export const createTransaction = async (token: string, payload: TransactionPayload) =>
  request<any>("/finance", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });

export const updateTransactionStatus = async (token: string, id: string, status: string) =>
  request<any>(`/finance/${id}/status`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ status })
  });

// ─── Expenses API ─────────────────────────────────────────────────────────────

export type ExpenseCategory =
  | "travel"
  | "shop_supplies"
  | "rent"
  | "shop_advance"
  | "domain"
  | "utilities"
  | "packaging"
  | "marketing"
  | "fuel"
  | "salary_misc"
  | "maintenance"
  | "other";

export interface ExpensePayload {
  date: string;
  category: ExpenseCategory | string;
  amount: number;
  title?: string;
  notes?: string;
  paymentMethod?: "cash" | "upi" | "bank" | "card" | "other";
}

export const getExpenses = async (
  token: string,
  params?: { from?: string; to?: string; category?: string; search?: string }
) => {
  const qs = new URLSearchParams();
  if (params?.from) qs.set("from", params.from);
  if (params?.to) qs.set("to", params.to);
  if (params?.category) qs.set("category", params.category);
  if (params?.search) qs.set("search", params.search);
  const query = qs.toString() ? `?${qs.toString()}` : "";
  return request<{
    expenses: any[];
    summary: {
      total: number;
      count: number;
      byCategory: Array<{ category: string; label: string; total: number; count: number }>;
    };
    categories: Array<{ id: string; label: string; isBuiltin?: boolean; _id?: string }>;
  }>(`/expenses${query}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
};

export const createExpenseCategory = async (token: string, label: string) =>
  request<{
    category: { id: string; label: string; isBuiltin?: boolean };
    categories: Array<{ id: string; label: string; isBuiltin?: boolean }>;
    message: string;
  }>("/expenses/categories", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ label })
  });

export const deleteExpenseCategory = async (token: string, categoryId: string) =>
  request<{
    message: string;
    categories: Array<{ id: string; label: string; isBuiltin?: boolean }>;
  }>(`/expenses/categories/${encodeURIComponent(categoryId)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });

export const createExpense = async (token: string, payload: ExpensePayload) =>
  request<{ expense: any; message: string }>("/expenses", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });

export const updateExpense = async (token: string, id: string, payload: Partial<ExpensePayload>) =>
  request<{ expense: any; message: string }>(`/expenses/${id}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });

export const deleteExpense = async (token: string, id: string) =>
  request<{ message: string }>(`/expenses/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });

// ─── Availability API ─────────────────────────────────────────────────────────

export interface AvailabilityPayload {
  date: string;
  isClosed: boolean;
  unavailableCategories: string[];
  unavailableProducts: string[];
  notes?: string;
}

export const getAvailability = async (token: string) =>
  request<{ availabilities: AvailabilityPayload[] }>("/availability", {
    headers: { Authorization: `Bearer ${token}` }
  });

export const getAvailabilityByDate = async (date: string) =>
  request<{ availability: AvailabilityPayload }>(`/availability/${date}`);

export const updateAvailability = async (token: string, date: string, payload: Partial<AvailabilityPayload>) =>
  request<{ availability: AvailabilityPayload }>(`/availability/${date}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });

// ─── Walk-in shop sales ───────────────────────────────────────────────────────

export const getWalkInStats = async (token: string) =>
  request<{
    today: { date: string; count: number; amount: number };
    total: { count: number; amount: number };
  }>("/walk-in/stats", {
    headers: { Authorization: `Bearer ${token}` }
  });

export const listWalkInSales = async (
  token: string,
  params?: {
    date?: string;
    from?: string;
    to?: string;
    phone?: string;
    q?: string;
    status?: "active" | "cancelled" | "all";
    sort?: "newest" | "oldest" | "amount_high" | "amount_low" | "bill";
    page?: number;
    limit?: number;
  }
) => {
  const qs = new URLSearchParams();
  if (params?.date) qs.set("date", params.date);
  if (params?.from) qs.set("from", params.from);
  if (params?.to) qs.set("to", params.to);
  if (params?.phone) qs.set("phone", params.phone);
  if (params?.q) qs.set("q", params.q);
  if (params?.status) qs.set("status", params.status);
  if (params?.sort) qs.set("sort", params.sort);
  if (params?.page) qs.set("page", String(params.page));
  if (params?.limit) qs.set("limit", String(params.limit));
  const query = qs.toString() ? `?${qs.toString()}` : "";
  return request<{
    sales: any[];
    pagination: { page: number; limit: number; total: number; pages: number };
  }>(`/walk-in${query}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
};

export const updateWalkInSale = async (
  token: string,
  saleId: string,
  payload: { customerName?: string; customerPhone?: string; notes?: string }
) =>
  request<{ message: string; sale: any }>(`/walk-in/${saleId}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });

export const cancelWalkInSale = async (
  token: string,
  saleId: string,
  payload?: { reason?: string }
) =>
  request<{ message: string; sale: any; todayCatch?: any }>(`/walk-in/${saleId}/cancel`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload || {})
  });

export const createWalkInSale = async (
  token: string,
  payload: {
    customerName: string;
    customerPhone: string;
    items: any[];
    paymentMethod?: string;
    notes?: string;
  }
) =>
  request<{ message: string; sale: any; todayCatch?: any }>("/walk-in", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });

export const downloadWalkInBill = async (token: string, saleId: string) => {
  const response = await fetch(`${API_BASE}/walk-in/${saleId}/bill`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || "Failed to download bill");
  }
  return response.blob();
};

// ─── Walk-in Accounts (cashier) ─────────────────────────────────────────────

export const getWalkInAccountsDaySummary = async (token: string, date?: string) => {
  const qs = date ? `?date=${encodeURIComponent(date)}` : "";
  return request<{
    date: string;
    summary: any;
    sales: any[];
    expenses: any[];
    drawer: any;
    cashierCategories: Array<{ id: string; label: string }>;
  }>(`/walk-in-accounts/day-summary${qs}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
};

export const collectWalkInPayment = async (
  token: string,
  billId: string,
  payload: { amount?: number; paymentMethod: string; notes?: string }
) =>
  request<{ message: string; sale: any }>(`/walk-in-accounts/bills/${billId}/collect`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });

export const createWalkInCashierExpense = async (
  token: string,
  payload: {
    date?: string;
    category: string;
    amount: number;
    title?: string;
    notes?: string;
    paymentMethod?: string;
  }
) =>
  request<{ message: string; expense: any }>("/walk-in-accounts/expenses", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });

export const deleteWalkInCashierExpense = async (token: string, expenseId: string) =>
  request<{ message: string }>(`/walk-in-accounts/expenses/${expenseId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });

export const updateWalkInDrawer = async (
  token: string,
  payload: {
    date?: string;
    openingCash?: number;
    closingCashCounted?: number | null;
    cashToManager?: number;
    notes?: string;
    close?: boolean;
  }
) =>
  request<{ message: string; drawer: any }>("/walk-in-accounts/drawer", {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });

// ─── Due Dates API ─────────────────────────────────────────────────────────────

export type DueDateItem = {
  _id: string;
  title: string;
  category: string;
  dueDate: string;
  recurrence: "none" | "monthly";
  dayOfMonth?: number | null;
  amount?: number | null;
  notes?: string;
  isActive: boolean;
  acknowledgedForDate?: string;
  nextDueDate: string;
  daysUntil: number;
  needsAttention: boolean;
  isOverdue: boolean;
  isAcknowledged: boolean;
};

export const getDueDates = async (token: string, includeInactive = false) => {
  const q = includeInactive ? "?includeInactive=1" : "";
  return request<{
    today: string;
    items: DueDateItem[];
    attentionCount: number;
    categories: string[];
  }>(`/due-dates${q}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
};

export const getDueDatesAttentionCount = async (token: string) =>
  request<{ today: string; attentionCount: number }>("/due-dates/attention-count", {
    headers: { Authorization: `Bearer ${token}` }
  });

export const createDueDate = async (
  token: string,
  payload: {
    title: string;
    category?: string;
    dueDate: string;
    recurrence?: "none" | "monthly";
    amount?: number | null;
    notes?: string;
  }
) =>
  request<{ message: string; item: DueDateItem }>("/due-dates", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });

export const updateDueDate = async (
  token: string,
  id: string,
  payload: Partial<{
    title: string;
    category: string;
    dueDate: string;
    recurrence: "none" | "monthly";
    amount: number | null;
    notes: string;
    isActive: boolean;
  }>
) =>
  request<{ message: string; item: DueDateItem }>(`/due-dates/${id}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });

export const acknowledgeDueDate = async (token: string, id: string) =>
  request<{ message: string; item: DueDateItem }>(`/due-dates/${id}/acknowledge`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` }
  });

export const deleteDueDate = async (token: string, id: string) =>
  request<{ message: string }>(`/due-dates/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });
