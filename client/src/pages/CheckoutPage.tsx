import React, { useState, useEffect } from "react";
import { useNavigate, Link, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { createOrder, createPayment, getMyOrders, getAvailabilityByDate, type OrderPayload } from "../lib/api";

const formatPrice = (price: number) => {
  if (isNaN(price) || price === null || price === undefined) return "0";
  const num = Number(price);
  return num % 1 === 0 ? num.toString() : num.toFixed(2);
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
  address: string;
  mapUrl: string;
  deliveryDate: string;
  deliveryTime: string;
}

const CheckoutPage = () => {
  const { cartItems, cartTotal, clearCart } = useCart();
  const { token, user } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState<CheckoutForm>({
    name: "",
    phone: "",
    address: "",
    mapUrl: "",
    deliveryDate: "",
    deliveryTime: DELIVERY_TIMES[0],
  });

  const [paymentMethod, setPaymentMethod] = useState<"cash_on_delivery" | "upi">("cash_on_delivery");
  const [errors, setErrors] = useState<Partial<CheckoutForm>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessingUPI, setIsProcessingUPI] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [lockedFields, setLockedFields] = useState({
    name: false,
    phone: false,
    address: false,
    mapUrl: false
  });
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);

  useEffect(() => {
    if (user && token) {
      setForm(prev => ({ ...prev, name: user.name || "" }));
      setLockedFields(prev => ({ ...prev, name: !!user.name }));
      
      getMyOrders(token)
        .then(res => {
          if (res.orders && res.orders.length > 0) {
            const lastOrder = res.orders[0];
            const hasPhone = !!lastOrder.address?.phone;
            const hasAddress = !!lastOrder.address?.line1;
            const hasMapUrl = !!lastOrder.mapUrl;

            setForm(prev => ({
              ...prev,
              phone: hasPhone ? lastOrder.address.phone : prev.phone,
              address: hasAddress ? lastOrder.address.line1 : prev.address,
              mapUrl: hasMapUrl ? lastOrder.mapUrl : prev.mapUrl
            }));

            setLockedFields(prev => ({
              ...prev,
              phone: hasPhone,
              address: hasAddress,
              mapUrl: hasMapUrl
            }));
          }
        })
        .catch(err => console.error("Could not fetch previous orders", err));
    }
  }, [user, token]);

  // Helper to get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  };

  useEffect(() => {
    if (!form.deliveryDate) {
      setAvailabilityError(null);
      return;
    }
    const checkDate = async () => {
      try {
        const res = await getAvailabilityByDate(form.deliveryDate);
        if (res.availability.isClosed) {
          setAvailabilityError("Delivery is closed for the selected date. Please choose another date.");
          return;
        }
        if (res.availability.unavailableCategories && res.availability.unavailableCategories.length > 0) {
          const invalidItems = cartItems.filter(item => 
            item.category && res.availability.unavailableCategories.includes(item.category)
          );
          if (invalidItems.length > 0) {
            const names = invalidItems.map(item => item.name).join(", ");
            setAvailabilityError(`The following items cannot be delivered on the selected date due to availability: ${names}. Please remove them or choose a different date.`);
            return;
          }
        }
        setAvailabilityError(null);
      } catch (error) {
        console.error("Availability check failed", error);
      }
    };
    checkDate();
  }, [form.deliveryDate, cartItems]);

  const validate = (): boolean => {
    const newErrors: Partial<CheckoutForm> = {};
    let isValid = true;

    if (!form.name.trim()) {
      newErrors.name = "Name is required";
      isValid = false;
    }

    // Phone validation: basic length check
    if (!form.phone.trim() || form.phone.length < 10) {
      newErrors.phone = "Valid phone number is required";
      isValid = false;
    }

    if (!form.address.trim()) {
      newErrors.address = "Delivery address is required";
      isValid = false;
    }

    // Map URL validation (optional, but if provided must be a URL)
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
    if (availabilityError) {
      alert(availabilityError);
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Build payload for backend
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
          line1: form.address,
          city: "Chennai", // Hardcoded for dummy UI, normally parsed or selected
          state: "Tamil Nadu",
          postalCode: "600001",
          phone: form.phone
        },
        deliveryDate: form.deliveryDate,
        deliveryTime: form.deliveryTime,
        mapUrl: form.mapUrl || undefined
      };

      const orderRes = await createOrder(token, payload);
      const orderId = orderRes.order._id;

      if (paymentMethod === "upi") {
        setIsProcessingUPI(true);
        // Simulate UPI processing delay
        await new Promise((resolve) => setTimeout(resolve, 2000));
        setIsProcessingUPI(false);
      }

      await createPayment(token, {
        order: orderId,
        provider: paymentMethod,
        amount: cartTotal
      });

      clearCart();
      navigate("/payment-status", { 
        state: { 
          orderId, 
          status: paymentMethod === "upi" ? "Authorized" : "Pending",
          method: paymentMethod === "upi" ? "UPI" : "Cash on Delivery",
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

  // Enforce login for checkout
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
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-white/60 mb-1.5">Full Address *</label>
                  <textarea
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    readOnly={lockedFields.address}
                    rows={3}
                    className={`w-full bg-cyan-950/50 border ${errors.address ? 'border-red-500' : 'border-white/10'} rounded-xl px-4 py-3 text-white focus:outline-none focus:border-teal-500 transition-colors resize-none ${lockedFields.address ? 'opacity-60 cursor-not-allowed' : ''}`}
                    placeholder="House No., Street Name, Landmark..."
                  />
                  {errors.address && <p className="text-red-400 text-xs mt-1.5">{errors.address}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/60 mb-1.5">Google Maps URL (Optional)</label>
                  <input
                    type="url"
                    value={form.mapUrl}
                    onChange={(e) => setForm({ ...form, mapUrl: e.target.value })}
                    readOnly={lockedFields.mapUrl}
                    className={`w-full bg-cyan-950/50 border ${errors.mapUrl ? 'border-red-500' : 'border-white/10'} rounded-xl px-4 py-3 text-white focus:outline-none focus:border-teal-500 transition-colors ${lockedFields.mapUrl ? 'opacity-60 cursor-not-allowed' : ''}`}
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

                <label className={`relative flex cursor-pointer rounded-2xl border p-4 focus:outline-none ${paymentMethod === 'upi' ? 'bg-teal-500/10 border-teal-500' : 'border-white/10 bg-white/5'}`}>
                  <input
                    type="radio"
                    name="payment_method"
                    value="upi"
                    className="sr-only"
                    checked={paymentMethod === 'upi'}
                    onChange={() => setPaymentMethod('upi')}
                  />
                  <span className="flex flex-1">
                    <span className="flex flex-col">
                      <span className="block text-sm font-medium text-white">UPI (GPay, PhonePe, etc.)</span>
                      <span className="mt-1 flex items-center text-xs text-white/50">Pay securely via UPI.</span>
                    </span>
                  </span>
                  <div className={`h-5 w-5 rounded-full border flex items-center justify-center ${paymentMethod === 'upi' ? 'border-teal-400' : 'border-white/30'}`}>
                    {paymentMethod === 'upi' && <span className="h-2.5 w-2.5 rounded-full bg-teal-400" />}
                  </div>
                </label>
              </div>
            </section>
          </form>
        </div>

        {/* Right Column: Summary */}
        <div className="bg-gradient-to-br from-teal-500/10 to-cyan-500/5 border border-teal-500/20 p-6 rounded-3xl sticky top-24">
          <h3 className="text-xl font-bold text-white mb-6">Order Summary</h3>
          
          <div className="max-h-60 overflow-y-auto pr-2 space-y-4 mb-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            {cartItems.map((item) => (
              <div key={item.id} className="flex items-center gap-3">
                <div className="w-12 h-12 bg-cyan-900/50 rounded-lg overflow-hidden shrink-0 border border-white/5">
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-semibold text-white truncate">{item.name}</h4>
                  <div className="text-xs text-white/50 flex gap-2">
                    <span>
                      Qty: {item.unit === "kg" 
                        ? (item.quantity < 1 ? `${Math.round(item.quantity * 1000)}g` : `${item.quantity}kg`) 
                        : item.quantity}
                    </span>
                    {item.cutName && <span>• {item.cutName}</span>}
                  </div>
                </div>
                <div className="text-sm font-bold text-teal-400">
                  ₹{formatPrice(item.price * item.quantity)}
                </div>
              </div>
            ))}
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
              <span className="font-bold text-white text-base">Total</span>
              <span className="text-2xl font-black text-teal-400">
                ₹{formatPrice(cartTotal)}
              </span>
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !!availabilityError}
            className={`w-full bg-teal-500 hover:bg-teal-400 text-white font-bold py-4 rounded-xl shadow-lg shadow-teal-500/20 transition-all flex items-center justify-center gap-2 ${(isSubmitting || availabilityError) ? 'opacity-75 cursor-not-allowed' : ''}`}
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
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
