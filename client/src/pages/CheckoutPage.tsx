import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, Link, Navigate, useLocation } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { createOrder, createPayment, getMyOrders, type OrderPayload } from "../lib/api";
import { checkCartAvailability, type ItemAvailability } from "../lib/cartAvailability";
import {
  MADURAI_CITY,
  MADURAI_STATE,
  MADURAI_PINCODES,
  MADURAI_DELIVERY_MESSAGE,
  isMaduraiCity,
  isMaduraiPincode,
  isMaduraiDeliveryAllowed
} from "../lib/maduraiDelivery";
import OrderPriceNotice from "../components/OrderPriceNotice";
import { SHOP_PHONE_DISPLAY, SHOP_PHONE_TEL, shopWhatsAppUrl } from "../lib/shopContact";

const CART_CHECK_DATE_KEY = "meenboy_cart_check_date";

const formatPrice = (price: number) => {
  if (isNaN(price) || price === null || price === undefined) return "0";
  const num = Number(price);
  return num % 1 === 0 ? num.toString() : num.toFixed(2);
};

const getLocalDateString = (date = new Date()) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const DELIVERY_TIMES = [
  "06:00 AM - 07:00 AM",
  "07:00 AM - 08:00 AM",
  "08:00 AM - 09:00 AM",
  "09:00 AM - 10:00 AM",
  "10:00 AM - 11:00 AM",
];

interface CheckoutForm {
  name: string;
  phone: string;
  doorNo: string;
  streetName: string;
  area: string;
  city: string;
  pincode: string;
  mapUrl: string;
  deliveryDate: string;
  deliveryTime: string;
}

/** Restore Door / Street / Area from last order (new structured line1 or old single-line address). */
const parseSavedAddress = (addr: {
  line1?: string;
  line2?: string;
  city?: string;
  postalCode?: string;
}) => {
  const line1 = (addr.line1 || "").trim();
  const line2 = (addr.line2 || "").trim();
  const parts = line1
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  let doorNo = "";
  let streetName = "";
  let area = "";

  if (parts.length >= 3) {
    doorNo = parts[0];
    streetName = parts.slice(1, -1).join(", ");
    area = parts[parts.length - 1];
  } else if (parts.length === 2) {
    doorNo = parts[0];
    streetName = parts[1];
    area = line2;
  } else if (parts.length === 1) {
    streetName = parts[0];
    area = line2;
  }

  if (!area && line2) area = line2;

  const city = addr.city && isMaduraiCity(addr.city) ? MADURAI_CITY : "";
  const pincode =
    addr.postalCode && isMaduraiPincode(String(addr.postalCode))
      ? String(addr.postalCode)
      : "";

  return { doorNo, streetName, area, city, pincode };
};

const CheckoutPage = () => {
  const { cartItems, cartTotal, clearCart } = useCart();
  const { token, user, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const initialDeliveryDate = (() => {
    const fromCart = (location.state as { deliveryDate?: string } | null)?.deliveryDate;
    const fromStorage = localStorage.getItem(CART_CHECK_DATE_KEY) || "";
    const today = getLocalDateString();
    const candidate = fromCart || fromStorage || "";
    // Ignore past dates
    if (candidate && candidate >= today) return candidate;
    return "";
  })();

  const [form, setForm] = useState<CheckoutForm>({
    name: "",
    phone: "",
    doorNo: "",
    streetName: "",
    area: "",
    city: MADURAI_CITY,
    pincode: "",
    mapUrl: "",
    deliveryDate: initialDeliveryDate,
    deliveryTime: DELIVERY_TIMES[0],
  });

  const [paymentMethod, setPaymentMethod] = useState<"cash_on_delivery" | "upi">("cash_on_delivery");
  const [errors, setErrors] = useState<Partial<CheckoutForm>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessingUPI, setIsProcessingUPI] = useState(false);

  const [lockedFields, setLockedFields] = useState({
    name: false,
    phone: false,
    mapUrl: false,
    doorNo: false,
    streetName: false,
    area: false,
    city: false,
    pincode: false
  });
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [unavailableByCartId, setUnavailableByCartId] = useState<Record<string, ItemAvailability>>({});

  const deliveryZoneError = useMemo(() => {
    const cityFilled = form.city.trim().length > 0;
    const pinFilled = form.pincode.trim().length > 0;
    if (!cityFilled && !pinFilled) return null;
    if (cityFilled && !isMaduraiCity(form.city)) return MADURAI_DELIVERY_MESSAGE;
    if (pinFilled && form.pincode.trim().length === 6 && !isMaduraiPincode(form.pincode)) {
      return MADURAI_DELIVERY_MESSAGE;
    }
    if (cityFilled && pinFilled && !isMaduraiDeliveryAllowed(form.city, form.pincode)) {
      return MADURAI_DELIVERY_MESSAGE;
    }
    return null;
  }, [form.city, form.pincode]);

  useEffect(() => {
    if (user && token) {
      setForm(prev => ({ ...prev, name: user.name || "" }));
      setLockedFields(prev => ({ ...prev, name: !!user.name }));
      
      getMyOrders(token)
        .then(res => {
          if (res.orders && res.orders.length > 0) {
            const lastOrder = res.orders[0];
            const hasPhone = !!lastOrder.address?.phone;
            const hasMapUrl = !!lastOrder.mapUrl;
            const addr = lastOrder.address || {};
            const parsed = parseSavedAddress(addr);
            const hasSavedAddress = !!(addr.line1 || addr.line2 || addr.postalCode);

            setForm((prev) => ({
              ...prev,
              phone: hasPhone ? lastOrder.address.phone : prev.phone,
              mapUrl: hasMapUrl ? lastOrder.mapUrl : prev.mapUrl,
              doorNo: parsed.doorNo || prev.doorNo,
              streetName: parsed.streetName || prev.streetName,
              area: parsed.area || prev.area,
              city: parsed.city || prev.city || MADURAI_CITY,
              pincode: parsed.pincode || prev.pincode
            }));

            setLockedFields((prev) => ({
              ...prev,
              phone: hasPhone,
              mapUrl: hasMapUrl,
              doorNo: hasSavedAddress && !!parsed.doorNo,
              streetName: hasSavedAddress && !!parsed.streetName,
              area: hasSavedAddress && !!parsed.area,
              city: hasSavedAddress && !!parsed.city,
              pincode: hasSavedAddress && !!parsed.pincode
            }));
          }
        })
        .catch(err => console.error("Could not fetch previous orders", err));
    }
  }, [user, token]);

  // Keep cart + checkout dates in sync
  useEffect(() => {
    if (form.deliveryDate) {
      localStorage.setItem(CART_CHECK_DATE_KEY, form.deliveryDate);
    }
  }, [form.deliveryDate]);

  // Helper to get today's date in local YYYY-MM-DD format
  const getTodayDate = () => getLocalDateString();

  useEffect(() => {
    if (!form.deliveryDate) {
      setAvailabilityError(null);
      setUnavailableByCartId({});
      return;
    }

    let cancelled = false;
    const checkDate = async () => {
      try {
        const result = await checkCartAvailability(cartItems, form.deliveryDate);
        if (cancelled) return;

        const map: Record<string, ItemAvailability> = {};
        result.items.forEach((item) => {
          map[item.cartItemId] = item;
        });
        setUnavailableByCartId(map);
        setAvailabilityError(result.warning);
      } catch (error) {
        console.error("Availability check failed", error);
      }
    };
    void checkDate();
    return () => {
      cancelled = true;
    };
  }, [form.deliveryDate, cartItems]);

  const validate = (): boolean => {
    const newErrors: Partial<CheckoutForm> = {};
    let isValid = true;

    if (!form.name.trim()) {
      newErrors.name = "Name is required";
      isValid = false;
    }

    if (!form.phone.trim() || form.phone.length < 10) {
      newErrors.phone = "Valid phone number is required";
      isValid = false;
    }

    if (!form.doorNo.trim()) {
      newErrors.doorNo = "Door / Flat No. is required";
      isValid = false;
    }
    if (!form.streetName.trim()) {
      newErrors.streetName = "Street name is required";
      isValid = false;
    }
    if (!form.area.trim()) {
      newErrors.area = "Area is required";
      isValid = false;
    }
    if (!form.city.trim()) {
      newErrors.city = "City is required";
      isValid = false;
    } else if (!isMaduraiCity(form.city)) {
      newErrors.city = MADURAI_DELIVERY_MESSAGE;
      isValid = false;
    }
    if (!form.pincode.trim()) {
      newErrors.pincode = "Pincode is required";
      isValid = false;
    } else if (!/^\d{6}$/.test(form.pincode.trim())) {
      newErrors.pincode = "Enter a valid 6-digit pincode";
      isValid = false;
    } else if (!isMaduraiPincode(form.pincode)) {
      newErrors.pincode = MADURAI_DELIVERY_MESSAGE;
      isValid = false;
    }

    if (form.mapUrl.trim()) {
      try {
        new URL(form.mapUrl);
      } catch {
        newErrors.mapUrl = "Please enter a valid URL";
        isValid = false;
      }
    }

    if (!form.deliveryDate) {
      newErrors.deliveryDate = "Delivery date is required";
      isValid = false;
    } else if (form.deliveryDate < getTodayDate()) {
      newErrors.deliveryDate = "Delivery date cannot be in the past";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      alert("Please login to place an order.");
      return navigate("/login");
    }
    if (!validate()) return;
    if (deliveryZoneError) {
      alert(deliveryZoneError);
      return;
    }
    if (availabilityError) {
      alert(availabilityError);
      return;
    }

    setIsSubmitting(true);
    
    try {
      const line1 = `${form.doorNo.trim()}, ${form.streetName.trim()}, ${form.area.trim()}`;

      const payload: OrderPayload = {
        items: cartItems.map(item => ({
          product: item.productId,
          productName: item.name,
          productImage: item.image,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.price,
          totalPrice: item.price * item.quantity,
          cutName: item.cutName,
          notes: item.notes
        })),
        address: {
          line1,
          line2: form.area.trim(),
          city: MADURAI_CITY,
          state: MADURAI_STATE,
          postalCode: form.pincode.trim(),
          phone: form.phone
        },
        deliveryDate: form.deliveryDate,
        deliveryTime: form.deliveryTime,
        mapUrl: form.mapUrl || undefined
      };

      const orderRes = await createOrder(token, payload);
      const orderId = orderRes.order._id;

      const selectedMethod = "cash_on_delivery" as const;

      await createPayment(token, {
        order: orderId,
        provider: selectedMethod,
        amount: cartTotal
      });

      clearCart();
      navigate("/payment-status", { 
        state: { 
          orderId, 
          status: "Pending",
          method: "Cash on Delivery",
          amount: cartTotal
        }
      });
    } catch (err: any) {
      alert(`Order placement failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
      setIsProcessingUPI(false);
    }
  };

  // Enforce login for checkout — wait until session restore finishes
  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-slate-300">
        Loading...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: "/checkout" }} />;
  }

  if (cartItems.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
        <h2 className="text-2xl font-bold text-white mb-4">Your cart is empty</h2>
        <Link to="/products" className="text-teal-400 hover:text-teal-300 transition-colors">
          &larr; Back to Products
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-10 lg:py-16">
      <div className="mb-8">
        <Link to="/cart" className="text-teal-400 hover:text-teal-300 transition-colors text-sm flex items-center gap-2">
          &larr; Back to Cart
        </Link>
        <h1 className="text-3xl md:text-4xl font-black text-white mt-4">Checkout</h1>
      </div>

      {availabilityError && (
        <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl font-medium flex items-start gap-3">
          <span className="mt-0.5">⚠️</span>
          <p>{availabilityError}</p>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-10 items-start">
        {/* Left Column: Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="bg-white/5 border border-white/10 p-6 md:p-8 rounded-3xl space-y-8">
            {/* Contact Info */}
            <section>
              <h3 className="text-xl font-bold text-white mb-5 flex items-center gap-2">
                <span className="text-teal-400">1.</span> Contact Details
              </h3>
              <div className="grid md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-white/60 mb-1.5">Full Name *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    readOnly={lockedFields.name}
                    className={`w-full bg-cyan-950/50 border ${errors.name ? 'border-red-500' : 'border-white/10'} rounded-xl px-4 py-3 text-white focus:outline-none focus:border-teal-500 transition-colors ${lockedFields.name ? 'opacity-60 cursor-not-allowed' : ''}`}
                    placeholder="John Doe"
                  />
                  {errors.name && <p className="text-red-400 text-xs mt-1.5">{errors.name}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/60 mb-1.5">Phone Number *</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    readOnly={lockedFields.phone}
                    className={`w-full bg-cyan-950/50 border ${errors.phone ? 'border-red-500' : 'border-white/10'} rounded-xl px-4 py-3 text-white focus:outline-none focus:border-teal-500 transition-colors ${lockedFields.phone ? 'opacity-60 cursor-not-allowed' : ''}`}
                    placeholder="+91 98765 43210"
                  />
                  {errors.phone && <p className="text-red-400 text-xs mt-1.5">{errors.phone}</p>}
                </div>
              </div>
            </section>

            <div className="border-t border-white/10" />

            {/* Address */}
            <section>
              <h3 className="text-xl font-bold text-white mb-5 flex items-center gap-2">
                <span className="text-teal-400">2.</span> Delivery Address
              </h3>
              <p className="text-sm text-teal-300/80 mb-4">
                We currently deliver only within <span className="font-semibold text-teal-300">Madurai city</span>.
              </p>

              {deliveryZoneError && (
                <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/25 text-rose-300 rounded-xl text-sm flex items-start gap-2">
                  <span>⚠️</span>
                  <span>{deliveryZoneError}</span>
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-white/60 mb-1.5">Door / Flat No. *</label>
                  <input
                    type="text"
                    value={form.doorNo}
                    readOnly={lockedFields.doorNo}
                    onChange={(e) => setForm({ ...form, doorNo: e.target.value })}
                    className={`w-full bg-cyan-950/50 border ${errors.doorNo ? "border-red-500" : "border-white/10"} rounded-xl px-4 py-3 text-white focus:outline-none focus:border-teal-500 transition-colors ${lockedFields.doorNo ? "opacity-60 cursor-not-allowed" : ""}`}
                    placeholder="e.g. 12A"
                  />
                  {errors.doorNo && <p className="text-red-400 text-xs mt-1.5">{errors.doorNo}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/60 mb-1.5">Street Name *</label>
                  <input
                    type="text"
                    value={form.streetName}
                    readOnly={lockedFields.streetName}
                    onChange={(e) => setForm({ ...form, streetName: e.target.value })}
                    className={`w-full bg-cyan-950/50 border ${errors.streetName ? "border-red-500" : "border-white/10"} rounded-xl px-4 py-3 text-white focus:outline-none focus:border-teal-500 transition-colors ${lockedFields.streetName ? "opacity-60 cursor-not-allowed" : ""}`}
                    placeholder="e.g. West Masi Street"
                  />
                  {errors.streetName && <p className="text-red-400 text-xs mt-1.5">{errors.streetName}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/60 mb-1.5">Area *</label>
                  <input
                    type="text"
                    value={form.area}
                    readOnly={lockedFields.area}
                    onChange={(e) => setForm({ ...form, area: e.target.value })}
                    className={`w-full bg-cyan-950/50 border ${errors.area ? "border-red-500" : "border-white/10"} rounded-xl px-4 py-3 text-white focus:outline-none focus:border-teal-500 transition-colors ${lockedFields.area ? "opacity-60 cursor-not-allowed" : ""}`}
                    placeholder="e.g. Tallakulam"
                  />
                  {errors.area && <p className="text-red-400 text-xs mt-1.5">{errors.area}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/60 mb-1.5">City *</label>
                  <input
                    type="text"
                    value={form.city}
                    readOnly={lockedFields.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className={`w-full bg-cyan-950/50 border ${errors.city || (form.city && !isMaduraiCity(form.city)) ? "border-red-500" : "border-white/10"} rounded-xl px-4 py-3 text-white focus:outline-none focus:border-teal-500 transition-colors ${lockedFields.city ? "opacity-60 cursor-not-allowed" : ""}`}
                    placeholder="Madurai"
                  />
                  {errors.city && <p className="text-red-400 text-xs mt-1.5">{errors.city}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/60 mb-1.5">Pincode *</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={form.pincode}
                    readOnly={lockedFields.pincode}
                    onChange={(e) =>
                      setForm({ ...form, pincode: e.target.value.replace(/\D/g, "").slice(0, 6) })
                    }
                    list="madurai-pincodes"
                    className={`w-full bg-cyan-950/50 border ${errors.pincode || (form.pincode.length === 6 && !isMaduraiPincode(form.pincode)) ? "border-red-500" : "border-white/10"} rounded-xl px-4 py-3 text-white focus:outline-none focus:border-teal-500 transition-colors ${lockedFields.pincode ? "opacity-60 cursor-not-allowed" : ""}`}
                    placeholder="e.g. 625001"
                  />
                  <datalist id="madurai-pincodes">
                    {MADURAI_PINCODES.map((pin) => (
                      <option key={pin} value={pin} />
                    ))}
                  </datalist>
                  {errors.pincode && <p className="text-red-400 text-xs mt-1.5">{errors.pincode}</p>}
                  <p className="text-white/40 text-xs mt-1.5">
                    Allowed Madurai pincodes only (e.g. 625001–625023, 625402).
                  </p>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-white/60 mb-1.5">Google Maps URL (Optional)</label>
                  <input
                    type="url"
                    value={form.mapUrl}
                    onChange={(e) => setForm({ ...form, mapUrl: e.target.value })}
                    readOnly={lockedFields.mapUrl}
                    className={`w-full bg-cyan-950/50 border ${errors.mapUrl ? "border-red-500" : "border-white/10"} rounded-xl px-4 py-3 text-white focus:outline-none focus:border-teal-500 transition-colors ${lockedFields.mapUrl ? "opacity-60 cursor-not-allowed" : ""}`}
                    placeholder="https://maps.app.goo.gl/..."
                  />
                  <p className="text-white/40 text-xs mt-1.5">Helps our delivery partner find you faster.</p>
                  {errors.mapUrl && <p className="text-red-400 text-xs mt-1.5">{errors.mapUrl}</p>}
                </div>
              </div>
            </section>

            <div className="border-t border-white/10" />

            {/* Slot */}
            <section>
              <h3 className="text-xl font-bold text-white mb-5 flex items-center gap-2">
                <span className="text-teal-400">3.</span> Preferred Delivery Slot
              </h3>
              <div className="grid md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-white/60 mb-1.5">Date *</label>
                  <input
                    type="date"
                    min={getTodayDate()}
                    value={form.deliveryDate}
                    onChange={(e) => setForm({ ...form, deliveryDate: e.target.value })}
                    className={`w-full bg-cyan-950/50 border ${errors.deliveryDate ? 'border-red-500' : 'border-white/10'} rounded-xl px-4 py-3 text-white focus:outline-none focus:border-teal-500 transition-colors [color-scheme:dark]`}
                  />
                  {errors.deliveryDate && <p className="text-red-400 text-xs mt-1.5">{errors.deliveryDate}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/60 mb-1.5">Time Slot *</label>
                  <select
                    value={form.deliveryTime}
                    onChange={(e) => setForm({ ...form, deliveryTime: e.target.value })}
                    className="w-full bg-cyan-950/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-teal-500 transition-colors"
                  >
                    {DELIVERY_TIMES.map((slot) => (
                      <option key={slot} value={slot}>
                        {slot}
                      </option>
                    ))}
                  </select>
                  <p className="text-white/40 text-xs mt-1.5">Morning delivery window: 6 AM to 11 AM.</p>
                </div>
              </div>
            </section>

            <div className="border-t border-white/10" />

            {/* Payment Method */}
            <section>
              <h3 className="text-xl font-bold text-white mb-5 flex items-center gap-2">
                <span className="text-teal-400">4.</span> Payment Method
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                <label className={`relative flex cursor-pointer rounded-2xl border p-4 focus:outline-none ${paymentMethod === 'cash_on_delivery' ? 'bg-teal-500/10 border-teal-500' : 'border-white/10 bg-white/5'}`}>
                  <input
                    type="radio"
                    name="payment_method"
                    value="cash_on_delivery"
                    className="sr-only"
                    checked={paymentMethod === 'cash_on_delivery'}
                    onChange={() => setPaymentMethod('cash_on_delivery')}
                  />
                  <span className="flex flex-1">
                    <span className="flex flex-col">
                      <span className="block text-sm font-medium text-white">Cash on Delivery</span>
                      <span className="mt-1 flex items-center text-xs text-white/50">Pay when your order arrives.</span>
                    </span>
                  </span>
                  <div className={`h-5 w-5 rounded-full border flex items-center justify-center ${paymentMethod === 'cash_on_delivery' ? 'border-teal-400' : 'border-white/30'}`}>
                    {paymentMethod === 'cash_on_delivery' && <span className="h-2.5 w-2.5 rounded-full bg-teal-400" />}
                  </div>
                </label>

                <label
                  aria-disabled="true"
                  title="UPI is currently unavailable"
                  className="relative flex cursor-not-allowed rounded-2xl border border-white/10 bg-white/[0.03] p-4 opacity-50"
                >
                  <input
                    type="radio"
                    name="payment_method"
                    value="upi"
                    className="sr-only"
                    checked={false}
                    disabled
                    readOnly
                  />
                  <span className="flex flex-1">
                    <span className="flex flex-col">
                      <span className="block text-sm font-medium text-white/70">
                        UPI (GPay, PhonePe, etc.)
                        <span className="ml-2 inline-block rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/50">
                          Disabled
                        </span>
                      </span>
                      <span className="mt-1 flex items-center text-xs text-white/40">
                        Temporarily unavailable. Please use Cash on Delivery.
                      </span>
                    </span>
                  </span>
                  <div className="h-5 w-5 rounded-full border border-white/20 flex items-center justify-center" />
                </label>
              </div>
            </section>
          </form>
        </div>

        {/* Right Column: Summary */}
        <div className="bg-gradient-to-br from-teal-500/10 to-cyan-500/5 border border-teal-500/20 p-6 rounded-3xl sticky top-24">
          <h3 className="text-xl font-bold text-white mb-6">Order Summary</h3>
          
          <div className="max-h-60 overflow-y-auto pr-2 space-y-4 mb-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            {cartItems.map((item) => {
              const status = unavailableByCartId[item.id];
              const isUnavailable = !!status?.unavailable;
              return (
                <div
                  key={item.id}
                  className={`flex items-center gap-3 rounded-xl p-2 ${
                    isUnavailable ? "bg-rose-500/10 border border-rose-500/25" : ""
                  }`}
                >
                  <div className="w-12 h-12 bg-cyan-900/50 rounded-lg overflow-hidden shrink-0 border border-white/5 relative">
                    <img
                      src={item.image}
                      alt={item.name}
                      className={`w-full h-full object-cover ${isUnavailable ? "opacity-50 grayscale" : ""}`}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className={`text-sm font-semibold truncate ${isUnavailable ? "text-rose-200" : "text-white"}`}>
                        {item.name}
                      </h4>
                      {isUnavailable && (
                        <span className="text-[10px] font-bold uppercase tracking-wide bg-rose-500 text-white px-1.5 py-0.5 rounded-full">
                          Unavailable
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-white/50 flex gap-2">
                      <span>
                        Qty:{" "}
                        {item.unit === "kg"
                          ? item.quantity < 1
                            ? `${Math.round(item.quantity * 1000)}g`
                            : `${item.quantity}kg`
                          : item.quantity}
                      </span>
                      {item.cutName && <span>• {item.cutName}</span>}
                    </div>
                    {isUnavailable && (
                      <p className="text-[11px] text-rose-300 mt-1">{status.reason}</p>
                    )}
                  </div>
                  <div className="text-sm font-bold text-teal-400">
                    ₹{formatPrice(item.price * item.quantity)}
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="border-t border-white/10 pt-4 space-y-3 mb-8 text-sm">
            <div className="flex justify-between text-white/60">
              <span>Subtotal</span>
              <span className="text-white font-medium">₹{formatPrice(cartTotal)}</span>
            </div>
            <div className="flex justify-between text-white/60">
              <span>Delivery</span>
              <span className="text-teal-400 font-medium">Free</span>
            </div>
            <div className="flex justify-between items-center pt-3 mt-3 border-t border-white/10">
              <span className="font-bold text-white text-base">Approximate total</span>
              <span className="text-2xl font-black text-teal-400">
                ₹{formatPrice(cartTotal)}
              </span>
            </div>
            <div className="pt-3">
              <OrderPriceNotice dailyPriceUpdated={false} total={cartTotal} estimatedTotal={cartTotal} compact />
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !!availabilityError || !!deliveryZoneError}
            className={`w-full bg-teal-500 hover:bg-teal-400 text-white font-bold py-4 rounded-xl shadow-lg shadow-teal-500/20 transition-all flex items-center justify-center gap-2 ${(isSubmitting || availabilityError || deliveryZoneError) ? 'opacity-75 cursor-not-allowed' : ''}`}
          >
            {isSubmitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {isProcessingUPI ? "Processing UPI..." : "Processing..."}
              </>
            ) : (
              <>
                {paymentMethod === 'upi' ? 'Pay & Place Order' : 'Place Order'}
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </>
            )}
          </button>

          <div className="mt-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-sm text-slate-300 leading-relaxed">
            <p>
              Need <span className="text-amber-300 font-semibold">more than 2 kg</span> of a particular fish?
              Contact us directly to discuss availability and pricing.
            </p>
            <div className="mt-3 flex flex-col sm:flex-row gap-2">
              <a
                href={shopWhatsAppUrl(
                  "Hi Fish Friendly, I want to enquire about ordering more than 2 kg of a particular fish."
                )}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25 font-medium transition-colors"
              >
                WhatsApp
              </a>
              <a
                href={SHOP_PHONE_TEL}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-teal-500/15 border border-teal-500/30 text-teal-300 hover:bg-teal-500/25 font-medium transition-colors"
              >
                Call {SHOP_PHONE_DISPLAY}
              </a>
            </div>
          </div>

          {deliveryZoneError && (
            <div className="mt-4 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl font-medium flex items-start gap-3">
              <span className="mt-0.5 shrink-0">⚠️</span>
              <p className="text-sm leading-relaxed">{deliveryZoneError}</p>
            </div>
          )}

          {availabilityError && (
            <div className="mt-4 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl font-medium flex items-start gap-3">
              <span className="mt-0.5 shrink-0">⚠️</span>
              <p className="text-sm leading-relaxed">{availabilityError}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
