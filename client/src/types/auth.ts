export type Role = "customer" | "admin" | "delivery_partner";

export interface User {
  id: string;
  _id?: string;
  name: string;
  email: string;
  role: Role;
  status?: string;
  phone?: string;
  /** Empty / missing = full admin (legacy). Non-empty = limited sections. */
  adminSections?: string[];
  /** Explicit full vs limited; prefer this when present. */
  isFullAdmin?: boolean;
  adminPreferences?: {
    usersAccountFilter?: "real" | "test";
  };
}

export interface AuthResponse {
  token: string;
  user: User;
}
