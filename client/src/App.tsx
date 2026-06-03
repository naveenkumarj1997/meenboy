import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import { useAuth } from "./context/AuthContext";
import AdminDashboard from "./pages/dashboards/AdminDashboard";
import AdminProductsPage from "./pages/dashboards/AdminProductsPage";
import AdminDailyPrices from "./pages/dashboards/AdminDailyPrices";
import AdminDeliveryTracking from "./pages/dashboards/AdminDeliveryTracking";
import AdminPartnerReport from "./pages/dashboards/AdminPartnerReport";
import AdminPendingPayments from "./pages/dashboards/AdminPendingPayments";
import AdminCollectedPayments from "./pages/dashboards/AdminCollectedPayments";
import AdminPurchases from "./pages/dashboards/AdminPurchases";
import AdminSettlements from "./pages/dashboards/AdminSettlements";
import AdminPartnerSalary from "./pages/dashboards/AdminPartnerSalary";
import AdminEarnings from "./pages/dashboards/AdminEarnings";
import AdminUsers from "./pages/dashboards/AdminUsers";
import AdminFinancePage from "./pages/dashboards/AdminFinancePage";
import AdminAvailability from "./pages/dashboards/AdminAvailability";
import AdminManualBooking from "./pages/dashboards/AdminManualBooking";
import AdminProfile from "./pages/dashboards/AdminProfile";
import AdminPartnerApprovals from "./pages/dashboards/AdminPartnerApprovals";
import AdminNewCustomers from "./pages/dashboards/AdminNewCustomers";
import CustomerDashboard from "./pages/dashboards/CustomerDashboard";
import DeliveryDashboard from "./pages/dashboards/DeliveryDashboard";
import CustomerDeliveryStatus from "./pages/dashboards/CustomerDeliveryStatus";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import UnauthorizedPage from "./pages/UnauthorizedPage";

import CustomerLayout from "./components/layout/CustomerLayout";
import AboutPage from "./pages/AboutPage";
import ContactPage from "./pages/ContactPage";
import ProductsPage from "./pages/ProductsPage";
import ProductDetailsPage from "./pages/ProductDetailsPage";
import CartPage from "./pages/CartPage";
import CheckoutPage from "./pages/CheckoutPage";
import PaymentStatusPage from "./pages/PaymentStatusPage";
import PaymentHistoryPage from "./pages/dashboards/PaymentHistoryPage";
import PartnerEarnings from "./pages/dashboards/PartnerEarnings";
import CustomCursor from "./components/CustomCursor";

const DashboardRouter = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;

  if (user.role === "admin") return <AdminDashboard />;
  if (user.role === "delivery_partner") return <DeliveryDashboard />;
  
  return (
    <Routes>
      <Route path="/" element={<CustomerDashboard />} />
      <Route path="/payments" element={<PaymentHistoryPage />} />
      <Route path="/deliveries" element={<CustomerDeliveryStatus />} />
    </Routes>
  );
};

function App() {
  return (
    <>
      <CustomCursor />
      <Routes>
        {/* Public Pages with Layout */}
        <Route element={<CustomerLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/products/:id" element={<ProductDetailsPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/payment-status" element={<PaymentStatusPage />} />
        </Route>

        {/* Auth Pages */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />

        {/* Protected Dashboards */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard/*" element={<DashboardRouter />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
          <Route path="/dashboard/admin" element={<AdminDashboard />} />
          <Route path="/dashboard/admin/profile" element={<AdminProfile />} />
          <Route path="/dashboard/admin/new-customers" element={<AdminNewCustomers />} />
          <Route path="/dashboard/admin/partner-approvals" element={<AdminPartnerApprovals />} />
          <Route path="/dashboard/admin/products" element={<AdminProductsPage />} />
          <Route path="/dashboard/admin/daily-prices" element={<AdminDailyPrices />} />
          <Route path="/dashboard/admin/deliveries" element={<AdminDeliveryTracking />} />
          <Route path="/dashboard/admin/partner-report" element={<AdminPartnerReport />} />
          <Route path="/dashboard/admin/pending-payments" element={<AdminPendingPayments />} />
          <Route path="/dashboard/admin/collected-payments" element={<AdminCollectedPayments />} />
          <Route path="/dashboard/admin/purchases" element={<AdminPurchases />} />
          <Route path="/dashboard/admin/settlements" element={<AdminSettlements />} />
          <Route path="/dashboard/admin/partner-salary" element={<AdminPartnerSalary />} />
          <Route path="/dashboard/admin/earnings" element={<AdminEarnings />} />
          <Route path="/dashboard/admin/users" element={<AdminUsers />} />
          <Route path="/dashboard/admin/finance" element={<AdminFinancePage />} />
          <Route path="/dashboard/admin/availability" element={<AdminAvailability />} />
          <Route path="/dashboard/admin/manual-booking" element={<AdminManualBooking />} />
        </Route>
        <Route element={<ProtectedRoute allowedRoles={["customer"]} />}>
          <Route path="/dashboard/customer" element={<CustomerDashboard />} />
          <Route path="/dashboard/customer/payments" element={<PaymentHistoryPage />} />
        </Route>
        <Route element={<ProtectedRoute allowedRoles={["delivery_partner"]} />}>
          <Route path="/dashboard/delivery" element={<DeliveryDashboard />} />
          <Route path="/dashboard/delivery/earnings" element={<PartnerEarnings />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default App;
