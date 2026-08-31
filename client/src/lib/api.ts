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
  const response = await fetch(`${API_BASE}${url}`, {
    cache: "no-store",
    ...restOptions,
    headers: {
      "Content-Type": "application/json",
      ...headers
    }
  });

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

export const getCurrentUser = async (token: string) =>
  request<{ user: AuthResponse["user"] }>("/auth/me", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

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

export const getAdminOverview = async (token: string) =>
  request<{ totalProducts: number; activeOrders: number; revenue: number }>("/dashboard/admin", {
    headers: { Authorization: `Bearer ${token}` }
  });

export const getAdminProducts = async (token: string) =>
  request<{ success: boolean; data: { products: any[]; pagination: any } }>("/catalog/admin/products?limit=200", {
    headers: { Authorization: `Bearer ${token}` }
  });

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
  };
}

export const createAdminOrder = async (token: string, payload: AdminOrderPayload) =>
  request<{ order: any }>("/orders/admin-booking", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });

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

export const updateDeliveryStatus = async (
  token: string,
  assignmentId: string,
  payload: { status: string; notes?: string; paymentCollected?: number; paymentMethod?: string }
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
  params?: { date?: string; phone?: string; page?: number; limit?: number }
) => {
  const qs = new URLSearchParams();
  if (params?.date) qs.set("date", params.date);
  if (params?.phone) qs.set("phone", params.phone);
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
  request<{ message: string; sale: any }>("/walk-in", {
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