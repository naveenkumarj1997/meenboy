export type Role = "customer" | "admin" | "delivery_partner";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  status?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}
