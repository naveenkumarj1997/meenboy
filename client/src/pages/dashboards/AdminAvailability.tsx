import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getAvailabilityByDate, updateAvailability, getAdminProducts } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { CATEGORIES } from "../../data/products";
import DashboardShell from "./DashboardShell";

const ADMIN_NAV_LINKS = [
  { label: "Overview", href: "/dashboard/admin" },
  { label: "Profile", href: "/dashboard/admin/profile" },
  { label: "New Customers", href: "/dashboard/admin/new-customers" },
  { label: "New Delivery Partners", href: "/dashboard/admin/partner-approvals" },
  { label: "Products", href: "/dashboard/admin/products" },
  { label: "Daily Prices", href: "/dashboard/admin/daily-prices" },
  { label: "Order Management", href: "/dashboard/admin/deliveries" },
  { label: "Partner Report", href: "/dashboard/admin/partner-report" },
  { label: "Pending Payments", href: "/dashboard/admin/pending-payments" },
  { label: "Collected Payments", href: "/dashboard/admin/collected-payments" },
  { label: "Purchases", href: "/dashboard/admin/purchases" },
  { label: "Settlements", href: "/dashboard/admin/settlements" },
  { label: "Partner Salary", href: "/dashboard/admin/partner-salary" },
  { label: "Admin Earnings", href: "/dashboard/admin/earnings" },
  { label: "Users", href: "/dashboard/admin/users" },
  { label: "Money", href: "/dashboard/admin/finance" },
  { label: "Availability", href: "/dashboard/admin/availability" },
  { label: "Manual Booking", href: "/dashboard/admin/manual-booking" }
];

const AdminAvailability = () => {
  const { token } = useAuth();
  
  // Helper to get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  };

  const [selectedDate, setSelectedDate] = useState<string>(getTodayDate());
  const [isClosed, setIsClosed] = useState<boolean>(false);
  const [unavailableCategories, setUnavailableCategories] = useState<string[]>([]);
  const [unavailableProducts, setUnavailableProducts] = useState<string[]>([]);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [notes, setNotes] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // We exclude "All" from CATEGORIES for the toggle list
  const validCategories = CATEGORIES.filter(c => c !== "All");

  const loadData = async (date: string) => {
    if (!token || !date) return;
    try {
      setLoading(true);
      setMessage(null);
      
      const [availRes, productsRes] = await Promise.all([
        getAvailabilityByDate(date),
        getAdminProducts()
      ]);
      
      const data = availRes.availability;
      setIsClosed(data.isClosed);
      setUnavailableCategories(data.unavailableCategories || []);
      setUnavailableProducts(data.unavailableProducts || []);
      setNotes(data.notes || "");
      
      if (productsRes.success) {
        setAllProducts(productsRes.data.products);
      }
    } catch (err: any) {
      console.error(err);
      setMessage({ type: "error", text: err.message || "Failed to load availability" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(selectedDate);
  }, [selectedDate, token]);

  const handleSave = async () => {
    if (!token || !selectedDate) return;
    try {
      setSaving(true);
      setMessage(null);
      await updateAvailability(token, selectedDate, {
        isClosed,
        unavailableCategories,
        unavailableProducts,
        notes
      });
      setMessage({ type: "success", text: "Availability successfully updated." });
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      console.error(err);
      setMessage({ type: "error", text: err.message || "Failed to update availability" });
    } finally {
      setSaving(false);
    }
  };

  const toggleCategory = (cat: string) => {
    setUnavailableCategories(prev => 
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const toggleProduct = (productId: string) => {
    setUnavailableProducts(prev => 
      prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId]
    );
  };

  return (
    <DashboardShell
      title="Date & Category Availability"
      description="Manage order delivery scheduling. Close specific dates entirely or disable specific categories for a given date."
      navLinks={ADMIN_NAV_LINKS}
    >
      <div className="max-w-2xl bg-cyan-950/50 border border-white/10 rounded-2xl p-6 shadow-xl shadow-cyan-950/50">
        
        {/* Date Selector */}
        <div className="mb-8">
          <label className="block text-sm font-bold text-white/60 mb-2 uppercase tracking-wide">
            Select Date to Configure
          </label>
          <input
            type="date"
            min={getTodayDate()}
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full md:w-1/2 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-teal-500 transition-colors [color-scheme:dark]"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="w-8 h-8 border-4 border-teal-500/30 border-t-teal-500 rounded-full animate-spin" />
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            {/* Master Toggle */}
            <div className="flex items-center justify-between p-5 bg-white/5 border border-white/10 rounded-2xl">
              <div>
                <h3 className="text-lg font-bold text-white">Close All Bookings</h3>
                <p className="text-sm text-white/50 mt-1">
                  If enabled, no customers can place orders for {selectedDate}.
                </p>
              </div>
              <button
                onClick={() => setIsClosed(!isClosed)}
                className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${
                  isClosed ? 'bg-rose-500' : 'bg-white/20'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                    isClosed ? 'translate-x-8' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Category Toggles */}
            <AnimatePresence>
              {!isClosed && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4 overflow-hidden"
                >
                  <h3 className="text-sm font-bold text-white/60 uppercase tracking-wide mb-2">
                    Disable Specific Categories or Items
                  </h3>
                  <div className="space-y-4">
                    {validCategories.map(cat => {
                      const isCatDisabled = unavailableCategories.includes(cat);
                      const catProducts = allProducts.filter(p => p.category === cat);
                      
                      return (
                        <div key={cat} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                          {/* Category Header */}
                          <div 
                            className={`flex items-center justify-between p-4 cursor-pointer transition-colors ${
                              isCatDisabled ? "bg-rose-500/20" : "hover:bg-white/5"
                            }`}
                          >
                            <div className="flex flex-col">
                              <span className={`font-bold ${isCatDisabled ? 'text-rose-400' : 'text-white'}`}>
                                {cat}
                              </span>
                              <span className="text-xs text-white/40">
                                {isCatDisabled ? "All items disabled" : `${catProducts.length} items`}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-semibold text-white/50">
                                {isCatDisabled ? "ENABLE CATEGORY" : "DISABLE CATEGORY"}
                              </span>
                              <button
                                onClick={() => toggleCategory(cat)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                  isCatDisabled ? 'bg-rose-500' : 'bg-white/20'
                                }`}
                              >
                                <span
                                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                    isCatDisabled ? 'translate-x-6' : 'translate-x-1'
                                  }`}
                                />
                              </button>
                            </div>
                          </div>

                          {/* Products List (only show if category is not completely disabled) */}
                          <AnimatePresence>
                            {!isCatDisabled && catProducts.length > 0 && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="border-t border-white/10"
                              >
                                {catProducts.map(product => {
                                  const isProductDisabled = unavailableProducts.includes(product._id);
                                  return (
                                    <div 
                                      key={product._id}
                                      onClick={() => toggleProduct(product._id)}
                                      className={`flex items-center justify-between px-6 py-3 border-b border-white/5 last:border-0 cursor-pointer transition-colors ${
                                        isProductDisabled ? "bg-rose-500/10" : "hover:bg-white/5"
                                      }`}
                                    >
                                      <span className={`text-sm ${isProductDisabled ? 'text-rose-300 font-medium' : 'text-white/80'}`}>
                                        {product.name}
                                      </span>
                                      <div className={`w-4 h-4 rounded-sm flex items-center justify-center border transition-colors ${
                                        isProductDisabled ? 'bg-rose-500 border-rose-500' : 'border-white/30'
                                      }`}>
                                        {isProductDisabled && (
                                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                                          </svg>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Notes */}
            <div>
              <label className="block text-sm font-bold text-white/60 mb-2 uppercase tracking-wide">
                Admin Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Festival holiday, boat maintenance..."
                rows={2}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-teal-500 transition-colors resize-none"
              />
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-white/10 flex items-center justify-between">
              {message ? (
                <div className={`text-sm font-semibold ${message.type === 'success' ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {message.text}
                </div>
              ) : <div />}

              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2.5 bg-teal-500 hover:bg-teal-400 text-white font-bold rounded-xl transition-colors disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Configuration"}
              </motion.button>
            </div>

          </motion.div>
        )}
      </div>
    </DashboardShell>
  );
};

export default AdminAvailability;

