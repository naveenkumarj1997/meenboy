import { useState, useEffect, useMemo } from "react";
import DashboardShell from "./DashboardShell";
import { useAuth } from "../../context/AuthContext";
import {
  getAllUsers,
  getAdminProducts,
  createAdminOrder,
  downloadInvoice
} from "../../lib/api";
import { ADMIN_NAV_LINKS } from "../../lib/adminNavLinks";
import {
  MADURAI_CITY,
  MADURAI_STATE,
  MADURAI_PINCODES,
  MADURAI_DELIVERY_MESSAGE,
  isMaduraiCity,
  isMaduraiPincode,
  isMaduraiDeliveryAllowed
} from "../../lib/maduraiDelivery";
import { triggerPdfDownload } from "../../lib/downloadPdf";
import { WEIGHT_OPTIONS, DEFAULT_WEIGHT_KG } from "../../lib/weightOptions";
import { DELIVERY_TIMES, DEFAULT_DELIVERY_TIME } from "../../lib/deliveryTimes";
import {
  computeOrderTotal,
  emptyBookingAdjustments,
  bookingAdjustmentsFromUser,
  parseNonNegativeAmount,
  type BookingAdjustments
} from "../../lib/orderTotals";

const formatPrice = (price: number) => {
  if (isNaN(price) || price === null || price === undefined) return "0";
  const num = Number(price);
  return num % 1 === 0 ? num.toString() : num.toFixed(2);
};

const emptyAddressForm = () => ({
  doorNo: "",
  streetName: "",
  area: "",
  city: MADURAI_CITY,
  state: MADURAI_STATE,
  postalCode: "",
  phone: "",
  alternatePhone: "",
  mapUrl: ""
});

/** Split saved line1 into door / street / area when possible. */
const splitLine1 = (line1 = "") => {
  const parts = String(line1)
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length >= 3) {
    return { doorNo: parts[0], streetName: parts[1], area: parts.slice(2).join(", ") };
  }
  if (parts.length === 2) {
    return { doorNo: parts[0], streetName: parts[1], area: "" };
  }
  return { doorNo: line1 || "", streetName: "", area: "" };
};

export default function AdminManualBooking() {
  const { token } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [customerType, setCustomerType] = useState<"existing" | "new">("new");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    email: "",
    phone: "",
    alternatePhone: ""
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<any[]>([]);

  const [deliveryDate, setDeliveryDate] = useState("");
  const [deliveryTime, setDeliveryTime] = useState(DEFAULT_DELIVERY_TIME);
  const [addressForm, setAddressForm] = useState(emptyAddressForm());
  const [lastOrderId, setLastOrderId] = useState<string | null>(null);
  const [adjustments, setAdjustments] = useState<BookingAdjustments>(emptyBookingAdjustments());

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!token) return;
        setLoading(true);
        const [usersRes, productsRes] = await Promise.all([
          getAllUsers(token, { role: "customer", realOnly: true }),
          getAdminProducts(token)
        ]);
        setUsers(usersRes.users);
        setProducts(productsRes.data.products.filter((p: any) => p.isActive));
      } catch (err: any) {
        setError(err.message || "Failed to load data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token]);

  useEffect(() => {
    if (customerType === "existing" && selectedUserId) {
      const user = users.find((u) => u._id === selectedUserId);
      if (user) {
        const split = splitLine1(user.address?.line1 || "");
        setAddressForm({
          doorNo: split.doorNo,
          streetName: split.streetName,
          area: split.area || user.address?.line2 || "",
          city: user.address?.city || MADURAI_CITY,
          state: user.address?.state || MADURAI_STATE,
          postalCode: user.address?.postalCode || "",
          phone: user.address?.phone || user.phone || "",
          alternatePhone: user.alternatePhone || "",
          mapUrl: user.mapUrl || ""
        });
        setAdjustments(bookingAdjustmentsFromUser(user));
      }
    }
  }, [customerType, selectedUserId, users]);

  useEffect(() => {
    if (customerType === "new") {
      setSelectedUserId("");
      setNewCustomer({ name: "", email: "", phone: "", alternatePhone: "" });
      setAddressForm(emptyAddressForm());
      setAdjustments(emptyBookingAdjustments());
    }
  }, [customerType]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [products, searchQuery]);

  const handleAddToCart = (product: any, selectedCut: any, qty: number, notes = "") => {
    const cutName = selectedCut?.name;
    const price = selectedCut && selectedCut.price > 0 ? selectedCut.price : product.minPrice;

    setCart((prev) => [
      ...prev,
      {
        product: product._id,
        productName: product.name,
        productImage: product.image || "",
        unitPrice: price,
        quantity: qty,
        unit: product.unit || "kg",
        cutName,
        notes: String(notes || "").trim(),
        totalPrice: price * qty
      }
    ]);
  };

  const updateCartItem = (idx: number, patch: Record<string, unknown>) => {
    setCart((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, ...patch } : item))
    );
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);
  const deliveryFee = 0;
  const orderTotal = computeOrderTotal(
    cartTotal,
    deliveryFee,
    adjustments.discountAmount,
    adjustments.addonAmount
  );

  const handleDownloadInvoice = async (orderId: string) => {
    if (!token) return;
    try {
      const blob = await downloadInvoice(token, orderId);
      triggerPdfDownload(blob, `Invoice-${String(orderId).slice(-8).toUpperCase()}.pdf`);
    } catch (err: any) {
      setError(err.message || "Failed to download invoice");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLastOrderId(null);

    if (cart.length === 0) return setError("Cart is empty");

    if (customerType === "existing" && !selectedUserId) {
      return setError("Please select an existing customer");
    }

    if (
      customerType === "new" &&
      (!newCustomer.name.trim() || !newCustomer.email.trim() || !newCustomer.phone.trim())
    ) {
      return setError("Please fill new customer name, email and phone");
    }

    if (!deliveryDate) return setError("Please select a delivery date");

    const doorNo = addressForm.doorNo.trim();
    const streetName = addressForm.streetName.trim();
    const area = addressForm.area.trim();
    const city = addressForm.city.trim();
    const postalCode = addressForm.postalCode.trim();
    const phone =
      addressForm.phone.trim() ||
      (customerType === "new" ? newCustomer.phone.trim() : "");

    if (!doorNo || !streetName || !area) {
      return setError("Please fill Door No, Street and Area");
    }
    if (!city || !postalCode) {
      return setError("Please fill City and Pincode");
    }
    if (!phone) {
      return setError("Please enter customer phone for delivery");
    }
    if (!isMaduraiDeliveryAllowed(city, postalCode)) {
      return setError(MADURAI_DELIVERY_MESSAGE);
    }
    if (addressForm.mapUrl.trim()) {
      try {
        new URL(addressForm.mapUrl.trim());
      } catch {
        return setError("Location link must be a valid URL (or leave empty)");
      }
    }

    const line1 = `${doorNo}, ${streetName}, ${area}`;

    try {
      setSubmitting(true);
      const payload: any = {
        items: cart,
        address: {
          line1,
          line2: area,
          city,
          state: addressForm.state || MADURAI_STATE,
          postalCode,
          country: "India",
          phone,
          alternatePhone: addressForm.alternatePhone.trim() || undefined
        },
        deliveryFee,
        deliveryDate,
        deliveryTime,
        mapUrl: addressForm.mapUrl.trim() || undefined,
        discountAmount: adjustments.discountAmount,
        discountNote: adjustments.discountNote,
        addonAmount: adjustments.addonAmount,
        addonNote: adjustments.addonNote
      };

      if (customerType === "existing") {
        payload.customerId = selectedUserId;
      } else {
        payload.newCustomer = {
          name: newCustomer.name.trim(),
          email: newCustomer.email.trim(),
          phone: newCustomer.phone.trim(),
          alternatePhone: (newCustomer.alternatePhone || addressForm.alternatePhone).trim() || undefined
        };
      }

      const res = await createAdminOrder(token!, payload);
      const orderId = res.order?._id;
      setSuccess(
        `Order booked successfully! Same delivery flow as online orders. Invoice is ready.`
      );
      setLastOrderId(orderId || null);
      setCart([]);
      setNewCustomer({ name: "", email: "", phone: "", alternatePhone: "" });
      setAddressForm(emptyAddressForm());
      setSelectedUserId("");
      setAdjustments(emptyBookingAdjustments());
      if (orderId) {
        // Offer invoice immediately
        try {
          await handleDownloadInvoice(orderId);
        } catch {
          // success message already shown; invoice still available from Invoices page
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to book order");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardShell
      title="Manual Order Booking"
      description="Book a home-delivery order for a customer who could not place it online. Same delivery + invoice flow."
      navLinks={ADMIN_NAV_LINKS}
    >
      <div className="space-y-6">
        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-xl flex items-center gap-3">
            <span className="font-bold">!</span>
            {error}
          </div>
        )}
        {success && (
          <div className="bg-teal-500/10 border border-teal-500/50 text-teal-400 p-4 rounded-xl space-y-2">
            <div className="flex items-center gap-3">
              <span className="font-bold">✓</span>
              {success}
            </div>
            {lastOrderId && (
              <button
                type="button"
                onClick={() => handleDownloadInvoice(lastOrderId)}
                className="text-sm font-bold underline text-teal-300 hover:text-teal-200"
              >
                Download invoice again
              </button>
            )}
          </div>
        )}

        {loading ? (
          <div className="text-center text-slate-400 py-16">Loading...</div>
        ) : (
          <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h2 className="text-xl font-bold text-white mb-4">1. Customer Details</h2>
                <div className="flex gap-4 mb-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={customerType === "existing"}
                      onChange={() => setCustomerType("existing")}
                      className="text-teal-500"
                    />
                    <span className="text-white/80">Existing Customer</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={customerType === "new"}
                      onChange={() => setCustomerType("new")}
                      className="text-teal-500"
                    />
                    <span className="text-white/80">New Customer</span>
                  </label>
                </div>

                {customerType === "existing" ? (
                  <div>
                    <label className="block text-sm text-white/60 mb-2">Select Customer</label>
                    <select
                      value={selectedUserId}
                      onChange={(e) => setSelectedUserId(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                    >
                      <option value="" className="bg-cyan-950">
                        -- Select Customer --
                      </option>
                      {users.map((u) => (
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
                      placeholder="Full Name *"
                      value={newCustomer.name}
                      onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-teal-500"
                    />
                    <input
                      type="email"
                      placeholder="Email Address *"
                      value={newCustomer.email}
                      onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-teal-500"
                    />
                    <input
                      type="text"
                      placeholder="Phone Number *"
                      value={newCustomer.phone}
                      onChange={(e) => {
                        const phone = e.target.value;
                        const previousPhone = newCustomer.phone;
                        setNewCustomer({ ...newCustomer, phone });
                        setAddressForm((prev) => ({
                          ...prev,
                          phone: !prev.phone || prev.phone === previousPhone ? phone : prev.phone
                        }));
                      }}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-teal-500"
                    />
                    <input
                      type="text"
                      placeholder="Alternate number (optional)"
                      value={newCustomer.alternatePhone}
                      onChange={(e) => {
                        const alternatePhone = e.target.value;
                        const previousAlt = newCustomer.alternatePhone;
                        setNewCustomer({ ...newCustomer, alternatePhone });
                        setAddressForm((prev) => ({
                          ...prev,
                          alternatePhone:
                            !prev.alternatePhone || prev.alternatePhone === previousAlt
                              ? alternatePhone
                              : prev.alternatePhone
                        }));
                      }}
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
                  {filteredProducts.slice(0, 10).map((product) => (
                    <ProductAddRow key={product._id} product={product} onAdd={handleAddToCart} />
                  ))}
                  {filteredProducts.length === 0 && (
                    <div className="text-center text-white/40 py-4">No products found</div>
                  )}
                </div>
              </div>
            </div>

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
                  <div className="space-y-3 mb-4 max-h-[320px] overflow-y-auto pr-2 custom-scrollbar">
                    {cart.map((item, idx) => (
                      <div
                        key={idx}
                        className="bg-white/5 rounded-xl p-3 space-y-2 border border-white/5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-semibold text-white text-sm">{item.productName}</p>
                            <p className="text-xs text-white/60">
                              {item.quantity} {item.unit}
                              {item.cutName ? ` • ${item.cutName}` : ""}
                            </p>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="font-bold text-teal-400">
                              ₹{formatPrice(item.totalPrice)}
                            </span>
                            <button
                              type="button"
                              onClick={() => setCart(cart.filter((_, i) => i !== idx))}
                              className="text-red-400 hover:text-red-300 font-bold"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase tracking-wider text-amber-300/80 font-bold mb-1">
                            Cutting / cleaning notes (this item)
                          </label>
                          <textarea
                            rows={2}
                            value={item.notes || ""}
                            onChange={(e) => updateCartItem(idx, { notes: e.target.value })}
                            placeholder="e.g. Curry cut, clean well, no head..."
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-teal-500 resize-y min-h-[52px]"
                          />
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
                    <label className="block text-sm text-white/60 mb-1">Date *</label>
                    <input
                      type="date"
                      required
                      value={deliveryDate}
                      onChange={(e) => setDeliveryDate(e.target.value)}
                      min={new Date().toISOString().split("T")[0]}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-white/60 mb-1">Time *</label>
                    <select
                      value={deliveryTime}
                      onChange={(e) => setDeliveryTime(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-teal-500"
                    >
                      {DELIVERY_TIMES.map((t) => (
                        <option key={t} value={t} className="bg-cyan-950">
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-3 mb-4">
                  <p className="text-xs uppercase tracking-wider text-slate-400 font-bold">
                    Address (same as online booking)
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      required
                      placeholder="Door No *"
                      value={addressForm.doorNo}
                      onChange={(e) =>
                        setAddressForm({ ...addressForm, doorNo: e.target.value })
                      }
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-teal-500"
                    />
                    <input
                      type="text"
                      required
                      placeholder="Street Name *"
                      value={addressForm.streetName}
                      onChange={(e) =>
                        setAddressForm({ ...addressForm, streetName: e.target.value })
                      }
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-teal-500"
                    />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Area *"
                    value={addressForm.area}
                    onChange={(e) => setAddressForm({ ...addressForm, area: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-teal-500"
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <input
                        type="text"
                        required
                        placeholder="City *"
                        value={addressForm.city}
                        onChange={(e) =>
                          setAddressForm({ ...addressForm, city: e.target.value })
                        }
                        className={`w-full bg-white/5 border rounded-xl px-4 py-2.5 text-white focus:border-teal-500 ${
                          addressForm.city && !isMaduraiCity(addressForm.city)
                            ? "border-red-500/60"
                            : "border-white/10"
                        }`}
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        required
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="Pincode *"
                        value={addressForm.postalCode}
                        list="manual-madurai-pincodes"
                        onChange={(e) =>
                          setAddressForm({
                            ...addressForm,
                            postalCode: e.target.value.replace(/\D/g, "").slice(0, 6)
                          })
                        }
                        className={`w-full bg-white/5 border rounded-xl px-4 py-2.5 text-white focus:border-teal-500 ${
                          addressForm.postalCode.length === 6 &&
                          !isMaduraiPincode(addressForm.postalCode)
                            ? "border-red-500/60"
                            : "border-white/10"
                        }`}
                      />
                      <datalist id="manual-madurai-pincodes">
                        {MADURAI_PINCODES.map((pin) => (
                          <option key={pin} value={pin} />
                        ))}
                      </datalist>
                    </div>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Delivery phone *"
                    value={addressForm.phone}
                    onChange={(e) =>
                      setAddressForm({ ...addressForm, phone: e.target.value })
                    }
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-teal-500"
                  />
                  <input
                    type="text"
                    placeholder="Alternate number (optional)"
                    value={addressForm.alternatePhone}
                    onChange={(e) =>
                      setAddressForm({ ...addressForm, alternatePhone: e.target.value })
                    }
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-teal-500"
                  />
                  <div>
                    <input
                      type="url"
                      placeholder="Google Maps location link (optional)"
                      value={addressForm.mapUrl}
                      onChange={(e) =>
                        setAddressForm({ ...addressForm, mapUrl: e.target.value })
                      }
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-teal-500"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      Helps the delivery partner find the house faster.
                    </p>
                  </div>
                  <p className="text-[11px] text-amber-300/80">{MADURAI_DELIVERY_MESSAGE}</p>
                </div>

                <div className="flex justify-between text-sm text-slate-400 mb-3">
                  <span>Delivery fee</span>
                  <span className="text-teal-400 font-medium">Free</span>
                </div>

                <div className="border border-white/10 rounded-xl p-4 mb-4 space-y-3 bg-black/20">
                  <p className="text-xs uppercase tracking-wider text-slate-400 font-bold">
                    Discount / Addon (saved for future bookings)
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-white/60 mb-1">Discount (₹)</label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={adjustments.discountAmount || ""}
                        onChange={(e) =>
                          setAdjustments({
                            ...adjustments,
                            discountAmount: parseNonNegativeAmount(e.target.value)
                          })
                        }
                        placeholder="e.g. 50 or 100"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-teal-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-white/60 mb-1">Addon (₹)</label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={adjustments.addonAmount || ""}
                        onChange={(e) =>
                          setAdjustments({
                            ...adjustments,
                            addonAmount: parseNonNegativeAmount(e.target.value)
                          })
                        }
                        placeholder="e.g. extra charge"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-teal-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-white/60 mb-1">Discount note (why)</label>
                    <input
                      type="text"
                      value={adjustments.discountNote || ""}
                      onChange={(e) =>
                        setAdjustments({ ...adjustments, discountNote: e.target.value })
                      }
                      placeholder="e.g. Bulk order customer, frying shop discount"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-white/60 mb-1">Addon note (why)</label>
                    <input
                      type="text"
                      value={adjustments.addonNote || ""}
                      onChange={(e) =>
                        setAdjustments({ ...adjustments, addonNote: e.target.value })
                      }
                      placeholder="e.g. Extra packaging charge"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-teal-500"
                    />
                  </div>
                  {(Number(adjustments.discountAmount) > 0 || Number(adjustments.addonAmount) > 0) && (
                    <p className="text-[11px] text-amber-300/80">
                      These amounts apply to this order and auto-fill for this customer&apos;s next manual booking.
                    </p>
                  )}
                </div>

                <div className="flex justify-between text-base font-bold text-white mb-4">
                  <span>Approx. total</span>
                  <span className="text-teal-400">₹{formatPrice(orderTotal)}</span>
                </div>

                <button
                  type="submit"
                  disabled={submitting || cart.length === 0}
                  className="w-full bg-gradient-to-r from-teal-400 to-emerald-400 text-cyan-950 font-bold py-3 rounded-xl hover:from-teal-300 hover:to-emerald-300 transition-all disabled:opacity-50"
                >
                  {submitting ? "Booking..." : "Book Order & Generate Invoice"}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </DashboardShell>
  );
}

function ProductAddRow({
  product,
  onAdd
}: {
  product: any;
  onAdd: (p: any, c: any, q: number, notes?: string) => void;
}) {
  const isKg = !product.unit || product.unit.toLowerCase() === "kg";
  const [qty, setQty] = useState(isKg ? DEFAULT_WEIGHT_KG : 1);
  const [selectedCutIdx, setSelectedCutIdx] = useState(0);
  const [itemNotes, setItemNotes] = useState("");

  const cuts = product.availableCuts || [];
  const selectedCut = cuts.length > 0 ? cuts[selectedCutIdx] : null;
  const unitPrice =
    selectedCut && selectedCut.price > 0 ? selectedCut.price : product.minPrice;

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex flex-col gap-2">
      <div className="flex justify-between items-start">
        <div>
          <p className="font-semibold text-white text-sm">{product.name}</p>
          <p className="text-teal-400 text-xs">
            ₹{formatPrice(unitPrice)} / {product.unit || "kg"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-1 flex-wrap">
        {cuts.length > 0 && (
          <select
            value={selectedCutIdx}
            onChange={(e) => setSelectedCutIdx(Number(e.target.value))}
            className="flex-1 min-w-[120px] bg-white/10 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white outline-none"
          >
            {cuts.map((c: any, i: number) => (
              <option key={i} value={i} className="bg-cyan-950">
                {c.name} {c.price > 0 ? `(₹${c.price})` : ""}
              </option>
            ))}
          </select>
        )}

        {isKg ? (
          <select
            value={qty}
            onChange={(e) => setQty(Number(e.target.value))}
            className="min-w-[110px] bg-white/10 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white outline-none"
          >
            {WEIGHT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-cyan-950">
                {opt.label}
              </option>
            ))}
          </select>
        ) : (
          <input
            type="number"
            value={qty}
            onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
            step="1"
            min="1"
            className="w-16 bg-white/10 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white outline-none"
          />
        )}

        <button
          type="button"
          onClick={() => {
            onAdd(product, selectedCut, qty, itemNotes);
            setItemNotes("");
          }}
          className="bg-teal-500 text-white p-1.5 rounded-lg hover:bg-teal-400 transition-colors font-bold shrink-0"
        >
          +
        </button>
      </div>

      <textarea
        rows={2}
        value={itemNotes}
        onChange={(e) => setItemNotes(e.target.value)}
        placeholder="Cutting / cleaning notes for this item (optional)"
        className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white text-xs outline-none focus:border-teal-500/50 resize-y min-h-[44px]"
      />

      {isKg && (
        <p className="text-[10px] text-white/45">
          Selected: ₹{formatPrice(unitPrice * qty)}
        </p>
      )}
    </div>
  );
}
