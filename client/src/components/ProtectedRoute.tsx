import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { Role } from "../types/auth";
import { hasAdminSection, sectionIdForPath, type AdminSectionId } from "../lib/adminSections";

interface ProtectedRouteProps {
  allowedRoles?: Role[];
  /** Extra gate for limited admins (optional; path-based gate also applied for admin). */
  adminSection?: AdminSectionId;
}

const ProtectedRoute = ({ allowedRoles, adminSection }: ProtectedRouteProps) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
        Loading...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (user.role === "admin") {
    const section = adminSection || sectionIdForPath(location.pathname);
    if (section && !hasAdminSection(user, section)) {
      return <Navigate to="/dashboard/admin" replace />;
    }
  }

  return <Outlet />;
};

export default ProtectedRoute;
