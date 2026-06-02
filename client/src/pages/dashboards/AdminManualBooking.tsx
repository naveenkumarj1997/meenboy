import { useState, useEffect, useMemo } from "react";
import DashboardShell from "./DashboardShell";
import { useAuth } from "../../context/AuthContext";
import { getAllUsers, getAdminProducts, createAdminOrder } from "../../lib/api";

const ADMIN_NAV_LINKS = [
  { label: "Overview", href: "/dashboard/admin" },
  { label: "Profile", href: "/dashboard/admin/profile" },
  { label: "New Customers", href: "/dashboard/admin/new-customers" },
  { label: "New Delivery Partners", href: "/dashboard/admin/partner-approvals" },
  { label: "Products", href: "/dashboard/admin/products" },
  { label: "Daily Prices", href: "/dashboard/admin/daily-prices" },
  { label: "Order Management", href: "/dashboard/admin/deliveries" },
  { label: "Partner Report", href: "/dashboard/admin/partner-report" },
  { label: "Users", href: "/dashboard/admin/users" },
  { label: "Money", href: "/dashboard/admin/finance" },
  { label: "Availability", href: "/dashboard/admin/availability" },
  { label: "Manual Booking", href: "/dashboard/admin/manual-booking" }
];

const DELIVERY_TIMES = [
  "06:00 AM - 07:00 AM",
  "07:00 AM - 08:00 AM",
  "08:00 AM - 09:00 AM",
  "09:00 AM - 10:00 AM",
  "10:00 AM - 11:00 AM"
];

const formatPrice = (price: number) => {
  if (isNaN(price) || price === null || price === undefined) return "0";
  const num = Number(price);
  return num % 1 === 0 ? num.toString() : num.toFixed(2);
};

export default function AdminManualBooking() {
  const { token } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  const [customerType, setCustomerType] = useState<"existing" | "new">("existing");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [newCustomer, setNewCustomer] = useState({ name: "", email: "", phone: "" });
  
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<any[]>([]);
  
  // Delivery details
  const [deliveryDate, setDeliveryDate] = useState("");
  const [deliveryTime, setDeliveryTime] = useState(DELIVERY_TIMES[0]);
  const [address, setAddress] = useState({ line1: "", city: "Chennai", state: "Tamil Nadu", postalCode: "" });

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!token) return;
        setLoading(true);
        const [usersRes, productsRes] = await Promise.all([
          getAllUsers(token),
          getAdminProducts()
        ]);
        setUsers(usersRes.users.filter((u: any) => u.role === "customer"));
        setProducts(productsRes.data.products.filter((p: any) => p.isActive));
      } catch (err: any) {
        setError(err.response?.data?.message || "Failed to load data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token]);

  useEffect(() => {
    if (customerType === "existing" && selectedUserId) {
      const user = users.find(u => u._id === selectedUserId);
      if (user) {
        setAddress({
          line1: user.address?.line1 || "No address provided",
          city: user.address?.city || "Chennai",
          state: user.address?.state || "Tamil Nadu",
          postalCode: user.address?.postalCode || "000000"
        });
      }
    } else if (customerType === "new") {
      setAddress({ line1: "", city: "Chennai", state: "Tamil Nadu", postalCode: "" });
    }
  }, [customerType, selectedUserId, users]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [products, searchQuery]);

  const handleAddToCart = (product: any, selectedCut: any, qty: number) => {
    const cutName = selectedCut?.name;
    const price = selectedCut && selectedCut.price > 0 ? selectedCut.price : product.minPrice;
    
    setCart(prev => [
      ...prev,
      {
        product: product._id,
        productName: product.name,
        productImage: product.image || "",
        unitPrice: price,
        quantity: qty,
        unit: product.unit || "kg",
        cutName,
        totalPrice: price * qty
      }
    ]);
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);
  const isAddressReadOnly = customerType === "existing";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (cart.length === 0) {
      return setError("Cart is empty");
    }

    if (customerType === "existing" && !selectedUserId) {
      return setError("Please select an existing customer");
    }

    if (customerType === "new" && (!newCustomer.name || !newCustomer.email || !newCustomer.phone)) {
      return setError("Please fill all new customer details");
    }

    if (!deliveryDate) return setError("Please select a delivery date");
    if (!address.line1 || !address.postalCode) return setError("Please fill required address fields");

    try {
      const payload: any = {
        items: cart,
        address,
        deliveryFee: 50, // Standard fee
        deliveryDate,
        deliveryTime
      };

      if (customerType === "existing") {
        payload.customerId = selectedUserId;
      } else {
        payload.newCustomer = newCustomer;
      }

      await createAdminOrder(token!, payload);
      setSuccess("Order booked successfully!");
      setCart([]);
      setNewCustomer({ name: "", email: "", phone: "" });
      setAddress({ line1: "", city: "Chennai", state: "Tamil Nadu", postalCode: "" });
      setSelectedUserId("");
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to book order");
    }
  };

  return (
    <DashboardShell title="Manual Order Booking" description="Create an order on behalf of a customer" navLinks={ADMIN_NAV_LINKS}>
      <div className="space-y-6">
        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-xl flex items-center gap-3">
            <span className="font-bold">!</span>
            {error}
          </div>
        )}
        {success && (
          <div className="bg-teal-500/10 border border-teal-500/50 text-teal-400 p-4 rounded-xl flex items-center gap-3">
            <span className="font-bold">✓</span>
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Left Column: Customer & Products */}
          <div className="space-y-6">
            
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h2 className="text-xl font-bold text-white mb-4">1. Customer Details</h2>
              <div className="flex gap-4 mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" checked={customerType === "existing"} onChange={() => setCustomerType("existing")} className="text-teal-500" />
                  <span className="text-white/80">Existing Customer</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" checked={customerType === "new"} onChange={() => setCustomerType("new")} className="text-teal-500" />
                  <span className="text-white/80">New Customer</span>
                </label>
              </div>

              {customerType === "existing" ? (
                <div>
                  <label className="block text-sm text-white/60 mb-2">Select Customer</label>
                  <select
                    value={selectedUserId}
                    onChange={e => setSelectedUserId(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                  >
                    <option value="" className="bg-cyan-950">-- Select Customer --</option>
                    {users.map(u => (
                      <option key={u._id} value={u._id} className="bg-cyan-950">
                        {u.name} ({u.phone || u.email})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={newCustomer.name}
                    onChange={e => setNewCustomer({...newCustomer, name: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-teal-500"
                  />
                  <input
                    type="email"
                    placeholder="Email Address"
                    value={newCustomer.email}
                    onChange={e => setNewCustomer({...newCustomer, email: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-teal-500"
                  />
                  <input
                    type="text"
                    placeholder="Phone Number"
                    value={newCustomer.phone}
                    onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-teal-500"
                  />
                </div>
              )}
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h2 className="text-xl font-bold text-white mb-4">2. Add Products</h2>
              <div className="relative mb-4">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">🔍</span>
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-white focus:border-teal-500 outline-none"
                />
              </div>

              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {filteredProducts.slice(0, 10).map(product => (
                  <ProductAddRow key={product._id} product={product} onAdd={handleAddToCart} />
                ))}
                {filteredProducts.length === 0 && (
                  <div className="text-center text-white/40 py-4">No products found</div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Cart & Checkout Details */}
          <div className="space-y-6">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h2 className="text-xl font-bold text-white mb-4 flex justify-between">
                <span>3. Order Items</span>
                <span className="text-teal-400">₹{formatPrice(cartTotal)}</span>
              </h2>
              
              {cart.length === 0 ? (
                <div className="text-center py-8 text-white/40 flex flex-col items-center gap-2">
                  <span className="text-2xl opacity-50">📦</span>
                  <p>Cart is empty</p>
                </div>
              ) : (
                <div className="space-y-3 mb-4 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                  {cart.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-white/5 rounded-xl p-3">
                      <div>
                        <p className="font-semibold text-white text-sm">{item.productName}</p>
                        <p className="text-xs text-white/60">
                          {item.quantity} {item.unit} {item.cutName ? `• ${item.cutName}` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-bold text-teal-400">₹{formatPrice(item.totalPrice)}</span>
                        <button
                          type="button"
                          onClick={() => setCart(cart.filter((_, i) => i !== idx))}
                          className="text-red-400 hover:text-red-300 font-bold"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h2 className="text-xl font-bold text-white mb-4">4. Delivery Details</h2>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm text-white/60 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={deliveryDate}
                    onChange={e => setDeliveryDate(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/60 mb-1">Time</label>
                  <select
                    value={deliveryTime}
                    onChange={e => setDeliveryTime(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-teal-500"
                  >
                    {DELIVERY_TIMES.map(t => (
                      <option key={t} value={t} className="bg-cyan-950">{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                <input
                  type="text"
                  required
                  readOnly={isAddressReadOnly}
                  placeholder="Address Line 1"
                  value={address.line1}
                  onChange={e => setAddress({...address, line1: e.target.value})}
                  className={`w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-teal-500 ${isAddressReadOnly ? 'opacity-60 cursor-not-allowed' : ''}`}
                />
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    required
                    readOnly={isAddressReadOnly}
                    placeholder="City"
                    value={address.city}
                    onChange={e => setAddress({...address, city: e.target.value})}
                    className={`w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-teal-500 ${isAddressReadOnly ? 'opacity-60 cursor-not-allowed' : ''}`}
                  />
                  <input
                    type="text"
                    required
                    readOnly={isAddressReadOnly}
                    placeholder="Pincode"
                    value={address.postalCode}
                    onChange={e => setAddress({...address, postalCode: e.target.value})}
                    className={`w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-teal-500 ${isAddressReadOnly ? 'opacity-60 cursor-not-allowed' : ''}`}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || cart.length === 0}
                className="w-full mt-6 bg-gradient-to-r from-teal-400 to-emerald-400 text-cyan-950 font-bold py-3 rounded-xl hover:from-teal-300 hover:to-emerald-300 transition-all disabled:opacity-50"
              >
                {loading ? "Booking..." : "Book Order Now"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </DashboardShell>
  );
}

// Sub-component for adding products
function ProductAddRow({ product, onAdd }: { product: any, onAdd: (p: any, c: any, q: number) => void }) {
  const [qty, setQty] = useState(product.unit === "kg" ? 1 : 1);
  const [selectedCutIdx, setSelectedCutIdx] = useState(0);
  
  const cuts = product.availableCuts || [];
  const selectedCut = cuts.length > 0 ? cuts[selectedCutIdx] : null;

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex flex-col gap-2">
      <div className="flex justify-between items-start">
        <div>
          <p className="font-semibold text-white text-sm">{product.name}</p>
          <p className="text-teal-400 text-xs">₹{formatPrice(product.minPrice)} / {product.unit || 'kg'}</p>
        </div>
      </div>
      
      <div className="flex items-center gap-2 mt-1">
        {cuts.length > 0 && (
          <select 
            value={selectedCutIdx} 
            onChange={(e) => setSelectedCutIdx(Number(e.target.value))}
            className="flex-1 bg-white/10 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white outline-none"
          >
            {cuts.map((c: any, i: number) => (
              <option key={i} value={i} className="bg-cyan-950">
                {c.name} {c.price > 0 ? `(+₹${c.price})` : ''}
              </option>
            ))}
          </select>
        )}
        
        <input 
          type="number" 
          value={qty} 
          onChange={(e) => setQty(Number(e.target.value))}
          step={product.unit === "kg" ? "0.1" : "1"}
          min={product.unit === "kg" ? "0.1" : "1"}
          className="w-16 bg-white/10 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white outline-none"
        />
        
        <button
          type="button"
          onClick={() => onAdd(product, selectedCut, qty)}
          className="bg-teal-500 text-white p-1.5 rounded-lg hover:bg-teal-400 transition-colors font-bold"
        >
          +
        </button>
      </div>
    </div>
  );
}
