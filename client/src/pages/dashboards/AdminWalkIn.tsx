import { useEffect, useMemo, useState } from "react";
import DashboardShell from "./DashboardShell";
import { useAuth } from "../../context/AuthContext";
import { ADMIN_NAV_LINKS } from "../../lib/adminNavLinks";
import {
  createWalkInSale,
  downloadWalkInBill,
  getAdminProducts,
  getWalkInStats,
  listWalkInSales
} from "../../lib/api";
import { triggerPdfDownload } from "../../lib/downloadPdf";
import { formatQuantityLabel, WEIGHT_OPTIONS } from "../../lib/weightOptions";

type CartLine = {
  key: string;
  product?: string;
  productName: string;
  category: string;
  cutName: string;
  quantity: number;
  unit: "kg" | "piece";
  unitPrice: number;
  totalPrice: number;
};

const money = (n: number) => `₹${Number(n || 0).toFixed(2)}`;

const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const printShopBill = (sale: any) => {
  const rows = (sale.items || [])
    .map(
      (item: any, i: number) => `
      <tr>
        <td>${i + 1}</td>
        <td>${item.productName}${item.cutName ? ` (${item.cutName})` : ""}</td>
        <td>${formatQuantityLabel(item.quantity, item.unit)}</td>
        <td style="text-align:right">${Number(item.unitPrice).toFixed(2)}</td>
        <td style="text-align:right">${Number(item.totalPrice).toFixed(2)}</td>
      </tr>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Bill ${sale.billNumber}</title>
  <style>
    @page { margin: 10mm; }
    body { font-family: Arial, sans-serif; color: #111; max-width: 80mm; margin: 0 auto; padding: 8px; }
    h1 { font-size: 16px; margin: 0 0 4px; text-align: center; }
    .muted { font-size: 11px; color: #444; text-align: center; line-height: 1.35; }
    .title { text-align: center; font-weight: bold; margin: 10px 0 6px; font-size: 13px; }
    .meta { font-size: 12px; margin: 8px 0; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th, td { padding: 4px 2px; border-bottom: 1px solid #ddd; vertical-align: top; }
    th { text-align: left; }
    .total { font-size: 14px; font-weight: bold; text-align: right; margin-top: 10px; }
    .thanks { text-align: center; font-size: 11px; margin-top: 14px; }
    @media print {
      body { max-width: none; }
    }
  </style>
</head>
<body>
  <h1>FISHFRIENDLY</h1>
  <div class="muted">Balusamy konnar street, Madakkulam<br/>Bypass Road in Kalavasal<br/>Madurai, Tamil Nadu - 625003<br/>+91 9087894319</div>
  <div class="title">SHOP BILL / CASH MEMO</div>
  <div class="meta">
    <div><strong>Bill:</strong> ${sale.billNumber}</div>
    <div><strong>Date:</strong> ${sale.saleDate}${sale.createdAt ? ` ${new Date(sale.createdAt).toLocaleTimeString()}` : ""}</div>
    <div><strong>Customer:</strong> ${sale.customerName}</div>
    <div><strong>Phone:</strong> ${sale.customerPhone}</div>
    <div><strong>Payment:</strong> ${String(sale.paymentMethod || "cash").toUpperCase()}</div>
  </div>
  <table>
    <thead>
      <tr><th>#</th><th>Item</th><th>Qty</th><th style="text-align:right">Rate</th><th style="text-align:right">Amt</th></tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="total">TOTAL: ₹${Number(sale.total || 0).toFixed(2)}</div>
  ${sale.notes ? `<div class="meta">Note: ${sale.notes}</div>` : ""}
  <div class="thanks">Thank you for visiting FISHFRIENDLY!</div>
  <script>
    window.onload = function () {
      window.focus();
      window.print();
    };
  </script>
</body>
</html>`;

  const win = window.open("", "_blank", "width=420,height=720");
  if (!win) {
    alert("Please allow pop-ups to print the bill.");
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
};

export default function AdminWalkIn() {
  const { token } = useAuth();
  const [tab, setTab] = useState<"new" | "history">("new");
  const [products, setProducts] = useState<any[]>([]);
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
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedCut, setSelectedCut] = useState("");
  const [qty, setQty] = useState(1);
  const [unitPrice, setUnitPrice] = useState<number | "">("");

  const [historyDate, setHistoryDate] = useState(localToday());
  const [historyPhone, setHistoryPhone] = useState("");
  const [historyLoading, setHistoryLoading] = useState(false);

  const selectedProduct = useMemo(
    () => products.find((p) => p._id === selectedProductId) || null,
    [products, selectedProductId]
  );

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    return products.filter((p) => {
      if (categoryFilter !== "all" && p.category !== categoryFilter) return false;
      if (!q) return true;
      return String(p.name || "").toLowerCase().includes(q);
    });
  }, [products, productSearch, categoryFilter]);

  const cartTotal = useMemo(
    () => cart.reduce((sum, line) => sum + Number(line.totalPrice || 0), 0),
    [cart]
  );

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => p.category && set.add(p.category));
    return Array.from(set);
  }, [products]);

  const refreshStats = async () => {
    if (!token) return;
    const res = await getWalkInStats(token);
    setStats(res);
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
        const [prodRes] = await Promise.all([getAdminProducts(token), refreshStats()]);
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
    if (!selectedProduct) {
      setUnitPrice("");
      setSelectedCut("");
      return;
    }
    const cuts = selectedProduct.availableCuts || [];
    if (cuts.length > 0) {
      const cut = cuts[0];
      setSelectedCut(cut.name || "");
      setUnitPrice(Number(cut.price) > 0 ? Number(cut.price) : Number(selectedProduct.minPrice) || 0);
    } else {
      setSelectedCut("");
      setUnitPrice(Number(selectedProduct.minPrice) || 0);
    }
    setQty(selectedProduct.unit === "piece" ? 1 : 1);
  }, [selectedProductId]); // eslint-disable-line react-hooks/exhaustive-deps

  const applyCut = (cutName: string) => {
    setSelectedCut(cutName);
    if (!selectedProduct) return;
    const cut = (selectedProduct.availableCuts || []).find((c: any) => c.name === cutName);
    if (cut && Number(cut.price) > 0) setUnitPrice(Number(cut.price));
    else setUnitPrice(Number(selectedProduct.minPrice) || 0);
  };

  const addToCart = () => {
    setError("");
    if (!selectedProduct) {
      setError("Select a product from the menu");
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
    const unit = selectedProduct.unit === "piece" ? "piece" : "kg";
    const totalPrice = Math.round(quantity * price * 100) / 100;
    const line: CartLine = {
      key: `${selectedProduct._id}-${selectedCut}-${Date.now()}`,
      product: selectedProduct._id,
      productName: selectedProduct.name,
      category: selectedProduct.category || "",
      cutName: selectedCut,
      quantity,
      unit,
      unitPrice: price,
      totalPrice
    };
    setCart((prev) => [...prev, line]);
  };

  const removeLine = (key: string) => setCart((prev) => prev.filter((l) => l.key !== key));

  const resetForm = () => {
    setCustomerName("");
    setCustomerPhone("");
    setPaymentMethod("cash");
    setNotes("");
    setCart([]);
    setSelectedProductId("");
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
      setError("Add at least one item to the bill");
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
          product: l.product,
          productName: l.productName,
          category: l.category,
          cutName: l.cutName,
          quantity: l.quantity,
          unit: l.unit,
          unitPrice: l.unitPrice
        }))
      });
      setSuccess(`Bill ${res.sale.billNumber} saved · ${money(res.sale.total)}`);
      await refreshStats();
      if (andPrint) printShopBill(res.sale);
      resetForm();
    } catch (err: any) {
      setError(err.message || "Failed to save walk-in sale");
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
      description="Counter sales for customers visiting the physical shop — create bill, print, and track visits."
      navLinks={ADMIN_NAV_LINKS}
    >
      {error && (
        <div className="mb-4 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">{error}</div>
      )}
      {success && (
        <div className="mb-4 p-4 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-300">{success}</div>
      )}

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
          <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">Total bills</div>
          <div className="text-2xl font-black text-white">{stats.total.count}</div>
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
              <h3 className="text-white font-bold">Add from menu</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Search fish / chicken / mutton..."
                  className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:border-teal-500"
                />
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:border-teal-500"
                >
                  <option value="all">All categories</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-white outline-none focus:border-teal-500"
              >
                <option value="">-- Select product --</option>
                {filteredProducts.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name} ({p.category})
                  </option>
                ))}
              </select>

              {selectedProduct && (selectedProduct.availableCuts || []).length > 0 && (
                <select
                  value={selectedCut}
                  onChange={(e) => applyCut(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:border-teal-500"
                >
                  {(selectedProduct.availableCuts || []).map((c: any) => (
                    <option key={c.name} value={c.name}>
                      {c.name} {c.price ? `· ₹${c.price}` : ""}
                    </option>
                  ))}
                </select>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    {selectedProduct?.unit === "piece" ? "Pieces" : "Weight (kg)"}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={qty}
                    onChange={(e) => setQty(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:border-teal-500"
                  />
                  {selectedProduct?.unit !== "piece" && (
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
                  <label className="block text-xs text-slate-400 mb-1">Rate (₹ / {selectedProduct?.unit || "kg"})</label>
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
              <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
                No items yet — add fish / chicken / mutton from the menu.
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
                className="py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-white font-bold disabled:opacity-50 shadow-lg shadow-teal-500/20"
              >
                {saving ? "Saving..." : "Save & Print"}
              </button>
            </div>
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
                <div
                  key={sale._id}
                  className="bg-slate-900/50 border border-slate-800 rounded-xl p-4"
                >
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
                          onClick={() => printShopBill(sale)}
                          className="px-3 py-1.5 rounded-lg bg-teal-500/20 border border-teal-500/30 text-teal-300 text-xs font-bold hover:bg-teal-500/30"
                        >
                          Print
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownloadBill(sale._id, sale.billNumber)}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold hover:bg-slate-700"
                        >
                          PDF
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
