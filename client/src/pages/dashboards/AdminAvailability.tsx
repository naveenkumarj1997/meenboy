import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  getAvailabilityByDate,
  updateAvailability,
  getAdminProducts,
  getAdminBookingBanner,
  updateBookingBanner,
  getAdminCategoryWeekdayRules,
  updateAdminCategoryWeekdayRules,
  type CategoryWeekdayRulePayload
} from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { CATEGORIES } from "../../data/products";
import DashboardShell from "./DashboardShell";
import { ADMIN_NAV_LINKS } from "../../lib/adminNavLinks";
import { WEEKDAY_OPTIONS } from "../../lib/categoryWeekdayRules";

const AdminAvailability = () => {
  const { token } = useAuth();

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

  const [bannerEnabled, setBannerEnabled] = useState(false);
  const [bannerMessage, setBannerMessage] = useState("");
  const [bannerLoading, setBannerLoading] = useState(false);
  const [bannerSaving, setBannerSaving] = useState(false);
  const [bannerFeedback, setBannerFeedback] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  const [weekdayEnabled, setWeekdayEnabled] = useState(true);
  const [weekdayRules, setWeekdayRules] = useState<CategoryWeekdayRulePayload[]>([]);
  const [weekdayLoading, setWeekdayLoading] = useState(false);
  const [weekdaySaving, setWeekdaySaving] = useState(false);
  const [weekdayFeedback, setWeekdayFeedback] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  const validCategories = CATEGORIES.filter((c) => c !== "All");

  const loadBanner = async () => {
    if (!token) return;
    try {
      setBannerLoading(true);
      const res = await getAdminBookingBanner(token);
      setBannerEnabled(Boolean(res.banner?.enabled));
      setBannerMessage(String(res.banner?.message || ""));
    } catch (err: any) {
      console.error(err);
      setBannerFeedback({ type: "error", text: err.message || "Failed to load fish banner" });
    } finally {
      setBannerLoading(false);
    }
  };

  const loadWeekdayRules = async () => {
    if (!token) return;
    try {
      setWeekdayLoading(true);
      const res = await getAdminCategoryWeekdayRules(token);
      setWeekdayEnabled(res.config?.enabled !== false);
      setWeekdayRules(res.config?.rules || []);
    } catch (err: any) {
      console.error(err);
      setWeekdayFeedback({ type: "error", text: err.message || "Failed to load weekday rules" });
    } finally {
      setWeekdayLoading(false);
    }
  };

  const loadData = async (date: string) => {
    if (!token || !date) return;
    try {
      setLoading(true);
      setMessage(null);

      const [availRes, productsRes] = await Promise.all([
        getAvailabilityByDate(date),
        getAdminProducts(token)
      ]);

      const data = availRes.availability;
      setIsClosed(data.isClosed);
      setUnavailableCategories(data.unavailableCategories || []);
      setNotes(data.notes || "");

      const products = productsRes.success ? productsRes.data.products || [] : [];
      setAllProducts(products);

      const savedUnavailable = (data.unavailableProducts || []).map((id: string) => String(id));
      const hiddenIds = products
        .filter((p: any) => p.isActive === false)
        .map((p: any) => String(p._id));
      const mergedUnavailable = Array.from(new Set([...savedUnavailable, ...hiddenIds]));
      setUnavailableProducts(mergedUnavailable);

      const needsPersist = hiddenIds.some((id) => !savedUnavailable.includes(id));
      if (needsPersist) {
        try {
          await updateAvailability(token, date, {
            isClosed: data.isClosed,
            unavailableCategories: data.unavailableCategories || [],
            unavailableProducts: mergedUnavailable,
            notes: data.notes || ""
          });
        } catch (persistErr) {
          console.error("Failed to persist hidden products for date", persistErr);
        }
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

  useEffect(() => {
    loadBanner();
    loadWeekdayRules();
  }, [token]);

  const handleSaveBanner = async () => {
    if (!token) return;
    try {
      setBannerSaving(true);
      setBannerFeedback(null);
      const res = await updateBookingBanner(token, {
        enabled: bannerEnabled,
        message: bannerMessage.trim()
      });
      setBannerEnabled(Boolean(res.banner?.enabled));
      setBannerMessage(String(res.banner?.message || ""));
      setBannerFeedback({
        type: "success",
        text: bannerEnabled
          ? "Sky banner saved — helicopter will show on the customer homepage."
          : "Sky banner saved and hidden from homepage."
      });
      setTimeout(() => setBannerFeedback(null), 3500);
    } catch (err: any) {
      setBannerFeedback({ type: "error", text: err.message || "Failed to save fish banner" });
    } finally {
      setBannerSaving(false);
    }
  };

  const handleSaveWeekdayRules = async () => {
    if (!token) return;
    try {
      setWeekdaySaving(true);
      setWeekdayFeedback(null);
      const res = await updateAdminCategoryWeekdayRules(token, {
        enabled: weekdayEnabled,
        rules: weekdayRules
      });
      setWeekdayEnabled(res.config?.enabled !== false);
      setWeekdayRules(res.config?.rules || []);
      setWeekdayFeedback({
        type: "success",
        text: "Weekday category rules saved. Applies to website booking only (manual booking stays free)."
      });
      setTimeout(() => setWeekdayFeedback(null), 4000);
    } catch (err: any) {
      setWeekdayFeedback({ type: "error", text: err.message || "Failed to save weekday rules" });
    } finally {
      setWeekdaySaving(false);
    }
  };

  const updateRule = (category: string, patch: Partial<CategoryWeekdayRulePayload>) => {
    setWeekdayRules((prev) =>
      prev.map((r) => (r.category === category ? { ...r, ...patch } : r))
    );
  };

  const toggleRuleWeekday = (category: string, day: number) => {
    setWeekdayRules((prev) =>
      prev.map((r) => {
        if (r.category !== category) return r;
        const has = r.deliveryWeekdays.includes(day);
        const deliveryWeekdays = has
          ? r.deliveryWeekdays.filter((d) => d !== day)
          : [...r.deliveryWeekdays, day].sort((a, b) => a - b);
        return { ...r, deliveryWeekdays };
      })
    );
  };

  const handleSave = async () => {
    if (!token || !selectedDate) return;
    try {
      setSaving(true);
      setMessage(null);
      const hiddenIds = allProducts
        .filter((p) => p.isActive === false)
        .map((p) => String(p._id));
      const mergedUnavailable = Array.from(new Set([...unavailableProducts, ...hiddenIds]));

      await updateAvailability(token, selectedDate, {
        isClosed,
        unavailableCategories,
        unavailableProducts: mergedUnavailable,
        notes
      });
      setUnavailableProducts(mergedUnavailable);
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
    setUnavailableCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const toggleProduct = (productId: string, isHidden: boolean) => {
    if (isHidden) return;
    const id = String(productId);
    setUnavailableProducts((prev) =>
      prev.includes(id) ? prev.filter((pid) => pid !== id) : [...prev, id]
    );
  };

  return (
    <DashboardShell
      title="Date & Category Availability"
      description="Manage weekday category delivery days, website booking cutoffs, homepage banner, and per-date open/close."
      navLinks={ADMIN_NAV_LINKS}
    >
      <div className="max-w-2xl space-y-6">
        <div className="bg-cyan-950/50 border border-teal-500/20 rounded-2xl p-6 shadow-xl shadow-cyan-950/50">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h3 className="text-lg font-bold text-white">Homepage Sky Banner</h3>
              <p className="text-sm text-white/50 mt-1">
                A helicopter slowly flies across the customer home page with your message. Turn off anytime to
                hide it safely — no other features break.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setBannerEnabled(!bannerEnabled)}
              disabled={bannerLoading}
              className={`relative inline-flex h-7 w-14 shrink-0 items-center rounded-full transition-colors ${
                bannerEnabled ? "bg-teal-500" : "bg-white/20"
              }`}
              aria-label="Toggle fish banner"
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                  bannerEnabled ? "translate-x-8" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {bannerLoading ? (
            <div className="flex items-center justify-center py-6">
              <div className="w-7 h-7 border-4 border-teal-500/30 border-t-teal-500 rounded-full animate-spin" />
            </div>
          ) : (
            <>
              <label className="block text-sm font-bold text-white/60 mb-2 uppercase tracking-wide">
                Banner message
              </label>
              <textarea
                value={bannerMessage}
                onChange={(e) => setBannerMessage(e.target.value.slice(0, 180))}
                placeholder="e.g. Pre-booking OPEN for Sunday delivery — book before Saturday 8 PM"
                rows={3}
                maxLength={180}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-teal-500 transition-colors resize-none"
              />
              <div className="mt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <span className="text-xs text-white/40">{bannerMessage.length}/180</span>
                {bannerFeedback ? (
                  <span
                    className={`text-sm font-semibold ${
                      bannerFeedback.type === "success" ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {bannerFeedback.text}
                  </span>
                ) : null}
                <button
                  type="button"
                  onClick={handleSaveBanner}
                  disabled={bannerSaving}
                  className="px-5 py-2 bg-teal-500 hover:bg-teal-400 text-white font-bold rounded-xl transition-colors disabled:opacity-50 self-end"
                >
                  {bannerSaving ? "Saving..." : "Save Banner"}
                </button>
              </div>
            </>
          )}
        </div>

        <div className="bg-cyan-950/50 border border-amber-500/20 rounded-2xl p-6 shadow-xl shadow-cyan-950/50">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div>
              <h3 className="text-lg font-bold text-white">Weekday category delivery</h3>
              <p className="text-sm text-white/50 mt-1">
                Choose which weekdays each category can be delivered. Optional cutoff times apply to{" "}
                <span className="text-amber-200 font-semibold">website booking only</span> — manual booking
                stays unrestricted. Default: Fish &amp; Seafood on Wednesday &amp; Sunday (order by Mon / Fri
                9 PM IST).
              </p>
            </div>
            <button
              type="button"
              onClick={() => setWeekdayEnabled(!weekdayEnabled)}
              disabled={weekdayLoading}
              className={`relative inline-flex h-7 w-14 shrink-0 items-center rounded-full transition-colors ${
                weekdayEnabled ? "bg-teal-500" : "bg-white/20"
              }`}
              aria-label="Toggle weekday category rules"
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                  weekdayEnabled ? "translate-x-8" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {weekdayLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-7 h-7 border-4 border-teal-500/30 border-t-teal-500 rounded-full animate-spin" />
            </div>
          ) : (
            <>
              <div className={`space-y-4 ${weekdayEnabled ? "" : "opacity-50 pointer-events-none"}`}>
                {weekdayRules.map((rule) => (
                  <div
                    key={rule.category}
                    className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-white">{rule.category}</span>
                      <label className="flex items-center gap-2 text-xs text-white/60 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={rule.cutoffEnabled}
                          onChange={(e) =>
                            updateRule(rule.category, { cutoffEnabled: e.target.checked })
                          }
                          className="rounded border-white/30"
                        />
                        Website cutoff
                      </label>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {WEEKDAY_OPTIONS.map(({ label, value }) => {
                        const on = rule.deliveryWeekdays.includes(value);
                        return (
                          <button
                            key={`${rule.category}-${value}`}
                            type="button"
                            onClick={() => toggleRuleWeekday(rule.category, value)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors ${
                              on
                                ? "bg-teal-500/20 border-teal-400/40 text-teal-200"
                                : "bg-transparent border-white/10 text-white/40"
                            }`}
                          >
                            {label.slice(0, 3)}
                          </button>
                        );
                      })}
                    </div>

                    {rule.cutoffEnabled && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                        <label className="text-xs text-white/50">
                          Days before delivery
                          <input
                            type="number"
                            min={0}
                            max={14}
                            value={rule.cutoffDaysBefore}
                            onChange={(e) =>
                              updateRule(rule.category, {
                                cutoffDaysBefore: Math.max(0, Math.min(14, Number(e.target.value) || 0))
                              })
                            }
                            className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                          />
                        </label>
                        <label className="text-xs text-white/50">
                          Hour (IST 0–23)
                          <input
                            type="number"
                            min={0}
                            max={23}
                            value={rule.cutoffHour}
                            onChange={(e) =>
                              updateRule(rule.category, {
                                cutoffHour: Math.max(0, Math.min(23, Number(e.target.value) || 0))
                              })
                            }
                            className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                          />
                        </label>
                        <label className="text-xs text-white/50">
                          Minute
                          <input
                            type="number"
                            min={0}
                            max={59}
                            value={rule.cutoffMinute}
                            onChange={(e) =>
                              updateRule(rule.category, {
                                cutoffMinute: Math.max(0, Math.min(59, Number(e.target.value) || 0))
                              })
                            }
                            className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                          />
                        </label>
                        <p className="sm:col-span-3 text-[11px] text-amber-200/80">
                          Example with 2 days + 21:00 — Wednesday delivery must be booked by Monday 9:00 PM;
                          Sunday by Friday 9:00 PM.
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4">
                {weekdayFeedback ? (
                  <span
                    className={`text-sm font-semibold ${
                      weekdayFeedback.type === "success" ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {weekdayFeedback.text}
                  </span>
                ) : (
                  <span className="text-xs text-white/40">
                    {weekdayEnabled ? "Rules active for website checkout" : "Rules currently off"}
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleSaveWeekdayRules}
                  disabled={weekdaySaving}
                  className="px-5 py-2 bg-teal-500 hover:bg-teal-400 text-white font-bold rounded-xl transition-colors disabled:opacity-50 self-end"
                >
                  {weekdaySaving ? "Saving..." : "Save Weekday Rules"}
                </button>
              </div>
            </>
          )}
        </div>

        <div className="bg-cyan-950/50 border border-white/10 rounded-2xl p-6 shadow-xl shadow-cyan-950/50">
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
              <div className="flex items-center justify-between p-5 bg-white/5 border border-white/10 rounded-2xl">
                <div>
                  <h3 className="text-lg font-bold text-white">Close All Bookings</h3>
                  <p className="text-sm text-white/50 mt-1">
                    If enabled, no customers can place orders for {selectedDate}.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsClosed(!isClosed)}
                  className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${
                    isClosed ? "bg-rose-500" : "bg-white/20"
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                      isClosed ? "translate-x-8" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              <AnimatePresence>
                {!isClosed && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-4 overflow-hidden"
                  >
                    <h3 className="text-sm font-bold text-white/60 uppercase tracking-wide mb-2">
                      Disable Specific Categories or Items
                    </h3>
                    <p className="text-xs text-amber-300/80 mb-3">
                      Hidden products from Products page appear in amber and stay unavailable by default for
                      every date.
                    </p>
                    <div className="space-y-4">
                      {validCategories.map((cat) => {
                        const isCatDisabled = unavailableCategories.includes(cat);
                        const catProducts = allProducts.filter((p) => p.category === cat);

                        return (
                          <div key={cat} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                            <div
                              className={`flex items-center justify-between p-4 cursor-pointer transition-colors ${
                                isCatDisabled ? "bg-rose-500/20" : "hover:bg-white/5"
                              }`}
                            >
                              <div className="flex flex-col">
                                <span className={`font-bold ${isCatDisabled ? "text-rose-400" : "text-white"}`}>
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
                                  type="button"
                                  onClick={() => toggleCategory(cat)}
                                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                    isCatDisabled ? "bg-rose-500" : "bg-white/20"
                                  }`}
                                >
                                  <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                      isCatDisabled ? "translate-x-6" : "translate-x-1"
                                    }`}
                                  />
                                </button>
                              </div>
                            </div>

                            <AnimatePresence>
                              {!isCatDisabled && catProducts.length > 0 && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: "auto" }}
                                  exit={{ opacity: 0, height: 0 }}
                                  className="border-t border-white/10"
                                >
                                  {catProducts.map((product) => {
                                    const productId = String(product._id);
                                    const isHidden = product.isActive === false;
                                    const isProductDisabled =
                                      unavailableProducts.includes(productId) || isHidden;
                                    return (
                                      <div
                                        key={productId}
                                        onClick={() => toggleProduct(productId, isHidden)}
                                        className={`flex items-center justify-between px-6 py-3 border-b border-white/5 last:border-0 transition-colors ${
                                          isHidden
                                            ? "bg-amber-500/15 cursor-not-allowed"
                                            : isProductDisabled
                                              ? "bg-rose-500/10 cursor-pointer"
                                              : "hover:bg-white/5 cursor-pointer"
                                        }`}
                                      >
                                        <div className="min-w-0 flex flex-col">
                                          <span
                                            className={`text-sm ${
                                              isHidden
                                                ? "text-amber-200 font-medium"
                                                : isProductDisabled
                                                  ? "text-rose-300 font-medium"
                                                  : "text-white/80"
                                            }`}
                                          >
                                            {product.name}
                                          </span>
                                          {isHidden && (
                                            <span className="text-[10px] text-amber-300/80 font-semibold uppercase tracking-wide mt-0.5">
                                              Hidden in catalog · default unavailable
                                            </span>
                                          )}
                                        </div>
                                        <div
                                          className={`w-4 h-4 rounded-sm flex items-center justify-center border transition-colors ${
                                            isHidden
                                              ? "bg-amber-500 border-amber-400"
                                              : isProductDisabled
                                                ? "bg-rose-500 border-rose-500"
                                                : "border-white/30"
                                          }`}
                                        >
                                          {isProductDisabled && (
                                            <svg
                                              className="w-3 h-3 text-white"
                                              fill="none"
                                              viewBox="0 0 24 24"
                                              stroke="currentColor"
                                            >
                                              <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={3}
                                                d="M6 18L18 6M6 6l12 12"
                                              />
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

              <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                {message ? (
                  <div
                    className={`text-sm font-semibold ${
                      message.type === "success" ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {message.text}
                  </div>
                ) : (
                  <div />
                )}

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
      </div>
    </DashboardShell>
  );
};

export default AdminAvailability;
