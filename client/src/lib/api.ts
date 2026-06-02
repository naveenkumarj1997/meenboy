import type { AuthResponse } from "../types/auth";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

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
    ...restOptions,
    headers: {
      "Content-Type": "application/json",
      ...headers
    }
  });

  const data = await response.json();
  if (!response.ok) {
    const errorMsg = data?.message || data?.errors?.[0]?.msg || "Request failed";
    throw new Error(errorMsg);
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

export const getAdminProducts = async () =>
  request<{ success: boolean; data: { products: any[]; pagination: any } }>("/catalog/products?limit=100");

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

export const uploadPartnerDocument = async (token: string, file: File, phone: string) => {
  const formData = new FormData();
  formData.append("document", file);
  formData.append("phone", phone);

  const response = await fetch(`${API_BASE}/upload/document`, {
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

  return data as { success: boolean; message: string; url: string; phone: string };
};

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
  request<{ products: any[] }>(`/orders/daily-prices/products?deliveryDate=${deliveryDate}`, {
    headers: { Authorization: `Bearer ${token}` }
  });

export const updateDailyPrices = async (token: string, payload: { deliveryDate: string; priceUpdates: any[] }) =>
  request<{ message: string; updatedCount: number }>("/orders/daily-prices", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
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

export const reorderAssignments = async (token: string, assignments: { id: string; sequence: number }[]) =>
  request<{ message: string }>("/orders/assignments/reorder", {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ assignments })
  });

// ─── User Management API ─────────────────────────────────────────────────────────────

export const getAllUsers = async (token: string, role?: string) =>
  request<{ users: any[] }>(`/users${role ? `?role=${role}` : ''}`, {
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
