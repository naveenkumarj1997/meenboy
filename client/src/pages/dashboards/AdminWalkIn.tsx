import { useEffect, useMemo, useState } from "react";
import DashboardShell from "./DashboardShell";
import { useAuth } from "../../context/AuthContext";
import { ADMIN_NAV_LINKS } from "../../lib/adminNavLinks";
import {
  createWalkInSale,
  downloadWalkInBill,
  getAdminProducts,
  getAdminTodayCatch,
  getWalkInStats,
  listWalkInSales
} from "../../lib/api";
import { triggerPdfDownload } from "../../lib/downloadPdf";
import { formatQuantityLabel, WEIGHT_OPTIONS } from "../../lib/weightOptions";
import { printThermalBill } from "../../lib/thermalPrint";

type CartLine = {
  key: string;
  catchItemId: string;
  product?: string;
  productName: string;
  category: string;
  cutName: string;
  quantity: number;
  unit: "kg" | "piece";
  unitPrice: number;
  totalPrice: number;
};

type CatchStockItem = {
  id: string;
  name: string;
  price: number;
  unit: string;
  availableQty: number;
  productId: string | null;
  note?: string;
};

const money = (n: number) => `₹${Number(n || 0).toFixed(2)}`;

const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const mapCatchItems = (items: any[]): CatchStockItem[] =>
  (items || []).map((it: any) => ({
    id: String(it.id),
    name: it.name,
    price: Number(it.price) || 0,
    unit: String(it.unit || "kg"),
    availableQty: Number(it.availableQty) || 0,
    productId: it.productId ? String(it.productId) : null,
    note: it.note || ""
  }));

const printWalkInThermal = (sale: any) => {
  printThermalBill({
    billNumber: sale.billNumber,
    titleBadge: "CASH MEMO",
    customerName: sale.customerName,
    customerPhone: sale.customerPhone,
    paymentMethod: sale.paymentMethod || "cash",
    dateLine: `${sale.saleDate || ""}${
      sale.createdAt ? ` ${new Date(sale.createdAt).toLocaleTimeString()}` : ""
    }`,
    notes: sale.notes,
    total: sale.total,
    items: sale.items
  });
};

export default function AdminWalkIn() {
  const { token } = useAuth();
  const [tab, setTab] = useState<"new" | "history">("new");
  const [products, setProducts] = useState<any[]>([]);
  const [catchItems, setCatchItems] = useState<CatchStockItem[]>([]);
  const [stats, setStats] = useState({
    today: { date: localToday(), count: 0, amount: 0 },
    total: { count: 0, amount: 0 }
  });
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "upi" | "other">("cash");
  const [notes, setNotes] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);

  const [productSearch, setProductSearch] = useState("");
  const [selectedCatchId, setSelectedCatchId] = useState("");
  const [selectedCut, setSelectedCut] = useState("");
  const [qty, setQty] = useState(1);
  const [unitPrice, setUnitPrice] = useState<number | "">("");

  const [historyDate, setHistoryDate] = useState(localToday());
  const [historyPhone, setHistoryPhone] = useState("");
  const [historyLoading, setHistoryLoading] = useState(false);

  const selectedCatch = useMemo(
    () => catchItems.find((c) => c.id === selectedCatchId) || null,
    [catchItems, selectedCatchId]
  );

  const linkedProduct = useMemo(() => {
    if (!selectedCatch?.productId) return null;
    return products.find((p) => String(p._id) === String(selectedCatch.productId)) || null;
  }, [products, selectedCatch]);

  const remainingForCatch = (catchItemId: string) => {
    const stock = catchItems.find((c) => c.id === catchItemId);
    if (!stock) return 0;
    const inCart = cart
      .filter((l) => l.catchItemId === catchItemId)
      .reduce((s, l) => s + Number(l.quantity || 0), 0);
    return Math.round((Number(stock.availableQty || 0) - inCart) * 10) / 10;
  };

  const filteredCatchItems = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    return catchItems.filter((c) => {
      if (Number(c.availableQty) <= 0) return false;
      if (!q) return true;
      return String(c.name || "").toLowerCase().includes(q);
    });
  }, [catchItems, productSearch]);

  const cartTotal = useMemo(
    () => cart.reduce((sum, line) => sum + Number(line.totalPrice || 0), 0),
    [cart]
  );

  const refreshStats = async () => {
    if (!token) return;
    const res = await getWalkInStats(token);
    setStats(res);
  };

  const refreshCatchStock = async () => {
    if (!token) return;
    const catchRes = await getAdminTodayCatch(token);
    setCatchItems(mapCatchItems(catchRes.todayCatch?.items || []));
  };

  const loadHistory = async () => {
    if (!token) return;
    try {
      setHistoryLoading(true);
      const res = await listWalkInSales(token, {
        date: historyDate || undefined,
        phone: historyPhone || undefined,
        limit: 50
      });
      setSales(res.sales || []);
    } catch (err: any) {
      setError(err.message || "Failed to load sales history");
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        setLoading(true);
        const [prodRes] = await Promise.all([
          getAdminProducts(token),
          refreshStats(),
          refreshCatchStock()
        ]);
        setProducts((prodRes.data?.products || []).filter((p: any) => p.isActive !== false));
      } catch (err: any) {
        setError(err.message || "Failed to load walk-in data");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (tab === "history" && token) loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, token]);

  useEffect(() => {
    if (!selectedCatch) {
      setUnitPrice("");
      setSelectedCut("");
      return;
    }
    setUnitPrice(Number(selectedCatch.price) || 0);
    setQty(String(selectedCatch.unit).toLowerCase() === "piece" ? 1 : 1);
    const cuts = linkedProduct?.availableCuts || [];
    if (cuts.length > 0) {
      const cut = cuts[0];
      setSelectedCut(cut.name || "");
      if (Number(cut.price) > 0) setUnitPrice(Number(cut.price));
    } else {
      setSelectedCut("");
    }
  }, [selectedCatchId]); // eslint-disable-line react-hooks/exhaustive-deps

  const applyCut = (cutName: string) => {
    setSelectedCut(cutName);
    if (!linkedProduct) return;
    const cut = (linkedProduct.availableCuts || []).find((c: any) => c.name === cutName);
    if (cut && Number(cut.price) > 0) setUnitPrice(Number(cut.price));
    else if (selectedCatch) setUnitPrice(Number(selectedCatch.price) || 0);
  };

  const addToCart = () => {
    setError("");
    if (!selectedCatch) {
      setError("Select an item from Today's Catch stock");
      return;
    }
    const quantity = Number(qty);
    const price = Number(unitPrice);
    if (!(quantity > 0)) {
      setError("Enter a valid weight / quantity");
      return;
    }
    if (!(price >= 0)) {
      setError("Enter a valid rate");
      return;
    }
    const left = remainingForCatch(selectedCatch.id);
    if (quantity > left + 0.001) {
      setError(
        `Only ${left} ${selectedCatch.unit || "kg"} left in Today's Catch for "${selectedCatch.name}".`
      );
      return;
    }
    const unit = String(selectedCatch.unit).toLowerCase() === "piece" ? "piece" : "kg";
    const totalPrice = Math.round(quantity * price * 100) / 100;
    setCart((prev) => [
      ...prev,
      {
        key: `${selectedCatch.id}-${selectedCut}-${Date.now()}`,
        catchItemId: selectedCatch.id,
        product: selectedCatch.productId || undefined,
        productName: selectedCatch.name,
        category: linkedProduct?.category || "",
        cutName: selectedCut,
        quantity,
        unit,
        unitPrice: price,
        totalPrice
      }
    ]);
  };

  const removeLine = (key: string) => setCart((prev) => prev.filter((l) => l.key !== key));

  const resetForm = () => {
    setCustomerName("");
    setCustomerPhone("");
    setPaymentMethod("cash");
    setNotes("");
    setCart([]);
    setSelectedCatchId("");
    setProductSearch("");
  };

  const handleSave = async (andPrint: boolean) => {
    if (!token) return;
    setError("");
    setSuccess("");
    if (!customerName.trim() || customerPhone.replace(/\D/g, "").length < 10) {
      setError("Enter customer name and a valid 10-digit phone number");
      return;
    }
    if (cart.length === 0) {
      setError("Add at least one item from Today's Catch stock");
      return;
    }

    try {
      setSaving(true);
      const res = await createWalkInSale(token, {
        customerName: customerName.trim(),
        customerPhone,
        paymentMethod,
        notes,
        items: cart.map((l) => ({
          catchItemId: l.catchItemId,
          product: l.product,
          productName: l.productName,
          category: l.category,
          cutName: l.cutName,
          quantity: l.quantity,
          unit: l.unit,
          unitPrice: l.unitPrice
        }))
      });
      setSuccess(`Bill ${res.sale.billNumber} saved · stock updated · ${money(res.sale.total)}`);
      if (res.todayCatch?.items) {
        setCatchItems(mapCatchItems(res.todayCatch.items));
      } else {
        await refreshCatchStock();
      }
      await refreshStats();
      if (andPrint) printWalkInThermal(res.sale);
      resetForm();
    } catch (err: any) {
      setError(err.message || "Failed to save walk-in sale");
      await refreshCatchStock();
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadBill = async (saleId: string, billNumber: string) => {
    if (!token) return;
    try {
      const blob = await downloadWalkInBill(token, saleId);
      triggerPdfDownload(blob, `WalkIn-${billNumber}.pdf`);
    } catch (err: any) {
      setError(err.message || "Failed to download bill");
    }
  };

  return (
    <DashboardShell
      title="Walk-in Shop"
      description="Sell only from Today's Catch stock. Each bill auto-reduces remaining quantity there."
      navLinks={ADMIN_NAV_LINKS}
    >
      {error && (
        <div className="mb-4 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">{error}</div>
      )}
      {success && (
        <div className="mb-4 p-4 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-300">{success}</div>
      )}

      <div className="mb-4 rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-sm text-amber-100">
        Stock comes from <span className="font-semibold text-amber-50">Today&apos;s Catch</span>. Add /
        update qty there first. Walk-in sales deduct stock automatically.
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="bg-teal-500/10 border border-teal-500/20 rounded-xl p-4">
          <div className="text-[10px] uppercase tracking-wider text-teal-300 mb-1">Today bills</div>
          <div className="text-2xl font-black text-teal-300">{stats.today.count}</div>
        </div>
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
          <div className="text-[10px] uppercase tracking-wider text-emerald-300 mb-1">Today sales</div>
          <div className="text-2xl font-black text-emerald-300">{money(stats.today.amount)}</div>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">Catch items in stock</div>
          <div className="text-2xl font-black text-white">
            {catchItems.filter((c) => c.availableQty > 0).length}
          </div>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">Total shop sales</div>
          <div className="text-2xl font-black text-white">{money(stats.total.amount)}</div>
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        <button
          type="button"
          onClick={() => setTab("new")}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
            tab === "new" ? "bg-teal-500 text-white" : "bg-slate-800 text-slate-300"
          }`}
        >
          New bill
        </button>
        <button
          type="button"
          onClick={() => setTab("history")}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
            tab === "history" ? "bg-teal-500 text-white" : "bg-slate-800 text-slate-300"
          }`}
        >
          History / visits
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 border-4 border-teal-500/30 border-t-teal-500 rounded-full animate-spin" />
        </div>
      ) : tab === "new" ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 space-y-3">
              <h3 className="text-white font-bold">Customer</h3>
              <div>
                <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Name</label>
                <input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-white outline-none focus:border-teal-500"
                  placeholder="Customer name"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Phone</label>
                <input
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  inputMode="tel"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-white outline-none focus:border-teal-500"
                  placeholder="10-digit mobile"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Payment</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-white outline-none focus:border-teal-500"
                >
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Note (optional)</label>
                <input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-white outline-none focus:border-teal-500"
                  placeholder="Any remark"
                />
              </div>
            </div>

            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-white font-bold">Add from Today&apos;s Catch stock</h3>
                <button
                  type="button"
                  onClick={() => refreshCatchStock()}
                  className="text-[11px] font-bold text-teal-300 hover:text-teal-200"
                >
                  Refresh stock
                </button>
              </div>

              {catchItems.length === 0 ? (
                <p className="text-sm text-rose-300">
                  No items in Today&apos;s Catch. Open Today&apos;s Catch, add products with available qty,
                  then come back.
                </p>
              ) : filteredCatchItems.length === 0 ? (
                <p className="text-sm text-amber-200">
                  No stock left (qty 0). Update quantities in Today&apos;s Catch.
                </p>
              ) : null}

              <input
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Search stock item..."
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:border-teal-500"
              />

              <select
                value={selectedCatchId}
                onChange={(e) => setSelectedCatchId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-white outline-none focus:border-teal-500"
              >
                <option value="">-- Select stock item --</option>
                {filteredCatchItems.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} · left {c.availableQty} {c.unit} · ₹{c.price}/{c.unit}
                  </option>
                ))}
              </select>

              {selectedCatch && (
                <p className="text-xs text-teal-300">
                  Available now (after cart): {remainingForCatch(selectedCatch.id)}{" "}
                  {selectedCatch.unit}
                  {selectedCatch.note ? ` · ${selectedCatch.note}` : ""}
                </p>
              )}

              {linkedProduct && (linkedProduct.availableCuts || []).length > 0 && (
                <select
                  value={selectedCut}
                  onChange={(e) => applyCut(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:border-teal-500"
                >
                  {(linkedProduct.availableCuts || []).map((c: any) => (
                    <option key={c.name} value={c.name}>
                      {c.name} {c.price ? `· ₹${c.price}` : ""}
                    </option>
                  ))}
                </select>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    {String(selectedCatch?.unit || "").toLowerCase() === "piece"
                      ? "Pieces"
                      : "Weight (kg)"}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={qty}
                    onChange={(e) => setQty(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:border-teal-500"
                  />
                  {String(selectedCatch?.unit || "").toLowerCase() !== "piece" && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {[...WEIGHT_OPTIONS, { value: 2.5, label: "2.5 kg" }, { value: 3, label: "3 kg" }].map(
                        (opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setQty(opt.value)}
                            className="text-[10px] px-2 py-1 rounded bg-slate-800 border border-slate-700 text-slate-300 hover:border-teal-500"
                          >
                            {opt.label}
                          </button>
                        )
                      )}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Rate (₹ / {selectedCatch?.unit || "kg"})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={addToCart}
                className="w-full py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold"
              >
                Add to bill
              </button>
            </div>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex flex-col min-h-[420px]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-bold">Current bill</h3>
              <div className="text-teal-300 font-black text-xl">{money(cartTotal)}</div>
            </div>

            {cart.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-slate-500 text-sm text-center px-4">
                No items yet — pick from Today&apos;s Catch stock on the left.
              </div>
            ) : (
              <div className="flex-1 space-y-2 overflow-y-auto mb-4">
                {cart.map((line) => (
                  <div
                    key={line.key}
                    className="flex items-start justify-between gap-3 bg-slate-950/70 border border-slate-800 rounded-lg p-3"
                  >
                    <div className="min-w-0">
                      <div className="text-white font-medium truncate">
                        {line.productName}
                        {line.cutName ? ` · ${line.cutName}` : ""}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {formatQuantityLabel(line.quantity, line.unit)} × {money(line.unitPrice)}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-teal-300 font-bold">{money(line.totalPrice)}</div>
                      <button
                        type="button"
                        onClick={() => removeLine(line.key)}
                        className="text-[11px] text-rose-400 hover:underline mt-1"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-auto">
              <button
                type="button"
                disabled={saving}
                onClick={() => handleSave(false)}
                className="py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save bill"}
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => handleSave(true)}
                className="py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold disabled:opacity-50 shadow-lg shadow-amber-500/20"
              >
                {saving ? "Saving..." : "Save & Thermal Print"}
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              Saving deducts qty from Today&apos;s Catch automatically.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row gap-3 sm:items-end">
            <div className="flex-1">
              <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">
                Date (clear for all)
              </label>
              <input
                type="date"
                value={historyDate}
                onChange={(e) => setHistoryDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:border-teal-500 [color-scheme:dark]"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">
                Phone (customer visits)
              </label>
              <input
                value={historyPhone}
                onChange={(e) => setHistoryPhone(e.target.value)}
                placeholder="Search by phone"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:border-teal-500"
              />
            </div>
            <button
              type="button"
              onClick={loadHistory}
              className="px-4 py-2.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-white font-bold"
            >
              Search
            </button>
          </div>

          {historyLoading ? (
            <div className="text-center text-slate-400 py-10">Loading...</div>
          ) : sales.length === 0 ? (
            <div className="text-center text-slate-400 py-10 border border-slate-800 rounded-xl">
              No walk-in sales found for this filter.
            </div>
          ) : (
            <div className="space-y-3">
              {sales.map((sale) => (
                <div key={sale._id} className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-white font-bold">{sale.billNumber}</span>
                        <span className="text-xs text-slate-500">
                          {sale.saleDate}
                          {sale.createdAt ? ` · ${new Date(sale.createdAt).toLocaleTimeString()}` : ""}
                        </span>
                        <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {sale.paymentMethod}
                        </span>
                      </div>
                      <div className="text-sm text-slate-300">
                        {sale.customerName} · {sale.customerPhone}
                      </div>
                      <div className="mt-2 text-xs text-slate-400 space-y-0.5">
                        {(sale.items || []).map((item: any, idx: number) => (
                          <div key={idx}>
                            {item.productName}
                            {item.cutName ? ` (${item.cutName})` : ""} —{" "}
                            {formatQuantityLabel(item.quantity, item.unit)} · {money(item.totalPrice)}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col sm:items-end gap-2 shrink-0">
                      <div className="text-teal-300 font-black text-lg">{money(sale.total)}</div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => printWalkInThermal(sale)}
                          className="px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-200 text-xs font-bold hover:bg-amber-500/30"
                        >
                          Thermal Print
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownloadBill(sale._id, sale.billNumber)}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold hover:bg-slate-700"
                        >
                          PDF (A4)
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </DashboardShell>
  );
}
