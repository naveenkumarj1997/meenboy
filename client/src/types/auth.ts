export type Role = "customer" | "admin" | "delivery_partner";

export interface User {
  id: string;
  _id?: string;
  name: string;
  email: string;
  role: Role;
  status?: string;
  adminPreferences?: {
    usersAccountFilter?: "real" | "test";
  };
}

export interface AuthResponse {
  token: string;
  user: User;
}
