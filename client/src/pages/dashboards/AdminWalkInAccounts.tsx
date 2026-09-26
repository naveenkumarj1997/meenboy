import { useEffect, useMemo, useRef, useState } from "react";
import DashboardShell from "./DashboardShell";
import { useAuth } from "../../context/AuthContext";
import { ADMIN_NAV_LINKS } from "../../lib/adminNavLinks";
import {
  collectWalkInPayment,
  createWalkInCashierExpense,
  deleteWalkInCashierExpense,
  getWalkInAccountsDaySummary,
  updateWalkInDrawer
} from "../../lib/api";
import { notifyWalkInBillChange, subscribeWalkInBillChanges } from "../../lib/walkInLiveSync";

const money = (n: unknown) => {
  const v = Number(n);
  return Number.isFinite(v) ? `₹${v.toFixed(2)}` : "₹0.00";
};

function localToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

type Tab = "collect" | "expenses" | "drawer";
type PayMethod = "cash" | "upi" | "card" | "other";

const inputCls =
  "w-full min-h-[44px] bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-teal-500";
const btnPrimary =
  "min-h-[44px] px-4 py-2.5 rounded-xl text-sm font-bold bg-teal-500 text-slate-950 disabled:opacity-50 active:scale-[0.99]";
const btnGhost =
  "min-h-[44px] px-4 py-2.5 rounded-xl text-sm font-bold border border-slate-700 text-slate-300 active:bg-slate-800";

export default function AdminWalkInAccounts() {
  const { token } = useAuth();
  const [date, setDate] = useState(localToday());
  const [tab, setTab] = useState<Tab>("collect");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [data, setData] = useState<Awaited<ReturnType<typeof getWalkInAccountsDaySummary>> | null>(
    null
  );
  const [billFilter, setBillFilter] = useState<"due" | "paid" | "all">("due");
  const [collectingId, setCollectingId] = useState<string | null>(null);
  const [collectMethod, setCollectMethod] = useState<PayMethod>("cash");
  const [collectAmount, setCollectAmount] = useState("");
  const [collectNotes, setCollectNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const [expCategory, setExpCategory] = useState("food");
  const [expAmount, setExpAmount] = useState("");
  const [expTitle, setExpTitle] = useState("");
  const [expNotes, setExpNotes] = useState("");
  const [expMethod, setExpMethod] = useState<PayMethod>("cash");

  const [openingCash, setOpeningCash] = useState("0");
  const [closingCash, setClosingCash] = useState("");
  const [cashToManager, setCashToManager] = useState("0");
  const [drawerNotes, setDrawerNotes] = useState("");
  const [liveNotice, setLiveNotice] = useState("");
  const knownIdsRef = useRef<Set<string>>(new Set());

  const applySummary = (
    res: Awaited<ReturnType<typeof getWalkInAccountsDaySummary>>,
    opts?: { announceNew?: boolean }
  ) => {
    const prevIds = knownIdsRef.current;
    const nextIds = new Set((res.sales || []).map((s) => String(s._id || s.id)));
    let newBills: any[] = [];
    if (opts?.announceNew && prevIds.size > 0) {
      newBills = (res.sales || []).filter((s) => !prevIds.has(String(s._id || s.id)));
    }
    knownIdsRef.current = nextIds;

    setData(res);
    setOpeningCash(String(res.summary?.openingCash ?? 0));
    setCashToManager(String(res.summary?.cashToManager ?? 0));
    setDrawerNotes(res.summary?.drawerNotes || "");
    setClosingCash(
      res.summary?.closingCashCounted == null ? "" : String(res.summary.closingCashCounted)
    );
    if (res.cashierCategories?.length && !res.cashierCategories.find((c) => c.id === expCategory)) {
      setExpCategory(res.cashierCategories[0].id);
    }

    if (newBills.length > 0) {
      const labels = newBills
        .slice(0, 3)
        .map((b) => b.billNumber || "New bill")
        .join(", ");
      setLiveNotice(
        newBills.length === 1
          ? `New bill arrived: ${labels} — collect payment`
          : `${newBills.length} new bills: ${labels}${newBills.length > 3 ? "…" : ""}`
      );
      setBillFilter("due");
      setTab("collect");
      window.setTimeout(() => setLiveNotice(""), 8000);
    }
  };

  const load = async (opts?: { silent?: boolean; announceNew?: boolean }) => {
    if (!token) return;
    try {
      if (!opts?.silent) {
        setLoading(true);
        setError("");
      }
      const res = await getWalkInAccountsDaySummary(token, date);
      applySummary(res, { announceNew: opts?.announceNew });
    } catch (err: any) {
      if (!opts?.silent) {
        setError(err.message || "Failed to load walk-in accounts");
      }
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  };

  useEffect(() => {
    knownIdsRef.current = new Set();
    setLiveNotice("");
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, date]);

  // Live: event from Walk-in tab + quiet poll so cashier sees new bills without refresh
  useEffect(() => {
    if (!token) return;

    const refreshLive = () => {
      void load({ silent: true, announceNew: true });
    };

    const unsub = subscribeWalkInBillChanges((detail) => {
      if (detail.saleDate && detail.saleDate !== date && date === localToday()) {
        // Bill for another day while viewing today — still refresh if same day match
      }
      if (!detail.saleDate || detail.saleDate === date) {
        refreshLive();
      }
    });

    const pollId = window.setInterval(() => {
      if (document.visibilityState === "hidden") return;
      refreshLive();
    }, 5000);

    const onVisible = () => {
      if (document.visibilityState === "visible") refreshLive();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      unsub();
      window.clearInterval(pollId);
      document.removeEventListener("visibilitychange", onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, date]);

  const summary = data?.summary;
  const categories = data?.cashierCategories || [];

  const bills = useMemo(() => {
    const list = data?.sales || [];
    if (billFilter === "due") return list.filter((s) => Number(s.amountDue) > 0.009);
    if (billFilter === "paid") return list.filter((s) => Number(s.amountDue) <= 0.009);
    return list;
  }, [data?.sales, billFilter]);

  const openCollect = (sale: any) => {
    setCollectingId(String(sale._id || sale.id));
    setCollectMethod("cash");
    setCollectAmount(String(Number(sale.amountDue || sale.total || 0).toFixed(2)));
    setCollectNotes("");
    setSuccess("");
    setError("");
  };

  const handleCollect = async () => {
    if (!token || !collectingId) return;
    try {
      setBusy(true);
      setError("");
      const amount = Number(collectAmount);
      const res = await collectWalkInPayment(token, collectingId, {
        amount: Number.isFinite(amount) && amount > 0 ? amount : undefined,
        paymentMethod: collectMethod,
        notes: collectNotes
      });
      setSuccess(res.message);
      notifyWalkInBillChange({
        type: "collected",
        billNumber: res.sale?.billNumber,
        saleDate: res.sale?.saleDate || date
      });
      setCollectingId(null);
      await load({ silent: true });
    } catch (err: any) {
      setError(err.message || "Collect failed");
    } finally {
      setBusy(false);
    }
  };

  const handleAddExpense = async () => {
    if (!token) return;
    try {
      setBusy(true);
      setError("");
      await createWalkInCashierExpense(token, {
        date,
        category: expCategory,
        amount: Number(expAmount),
        title: expTitle,
        notes: expNotes,
        paymentMethod: expMethod
      });
      setSuccess("Expense saved (also counted in Calculations costs)");
      setExpAmount("");
      setExpTitle("");
      setExpNotes("");
      await load();
    } catch (err: any) {
      setError(err.message || "Failed to save expense");
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!token) return;
    if (!window.confirm("Delete this cashier expense?")) return;
    try {
      setBusy(true);
      await deleteWalkInCashierExpense(token, id);
      setSuccess("Expense deleted");
      await load();
    } catch (err: any) {
      setError(err.message || "Delete failed");
    } finally {
      setBusy(false);
    }
  };

  const handleSaveDrawer = async (close = false) => {
    if (!token) return;
    try {
      setBusy(true);
      setError("");
      await updateWalkInDrawer(token, {
        date,
        openingCash: Number(openingCash) || 0,
        closingCashCounted: closingCash === "" ? null : Number(closingCash),
        cashToManager: Number(cashToManager) || 0,
        notes: drawerNotes,
        close
      });
      setSuccess(close ? "Day drawer closed" : "Drawer updated");
      await load();
    } catch (err: any) {
      setError(err.message || "Failed to update drawer");
    } finally {
      setBusy(false);
    }
  };

  return (
    <DashboardShell
      title="Walk-in Accounts"
      description="Collect walk-in payments, record petty spends, close the cash drawer. Links to Walk-in, Calculations & Money Management."
      navLinks={ADMIN_NAV_LINKS}
    >
      <div className="space-y-3 sm:space-y-5 min-w-0 overflow-x-hidden">
        {/* Date bar */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-3 sm:p-4 space-y-3">
          <div className="grid grid-cols-[1fr_auto] gap-2 sm:flex sm:flex-wrap sm:items-end">
            <div className="min-w-0 flex-1 sm:max-w-[12rem]">
              <label className="block text-[10px] uppercase text-slate-500 mb-1">Day</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={inputCls}
              />
            </div>
            <button
              type="button"
              onClick={() => load()}
              className={`${btnGhost} sm:self-end`}
            >
              Refresh
            </button>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-500 leading-snug">
            New Walk-in bills appear here automatically (live). Default:{" "}
            <span className="text-amber-200 font-semibold">unpaid</span> until collected.
          </p>
        </div>

        {liveNotice ? (
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/15 text-amber-100 text-sm px-3 sm:px-4 py-3 font-semibold animate-pulse">
            {liveNotice}
          </div>
        ) : null}

        {/* Tabs — equal width on mobile */}
        <div className="grid grid-cols-3 gap-1.5 sm:flex sm:gap-2 sm:overflow-x-auto">
          {(
            [
              ["collect", "Collect", "Collect payments"],
              ["expenses", "Spends", "Day expenses"],
              ["drawer", "Drawer", "Cash drawer"]
            ] as const
          ).map(([id, short, full]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`min-h-[44px] px-2 sm:px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold border whitespace-nowrap ${
                tab === id
                  ? "bg-teal-500/20 text-teal-200 border-teal-500/40"
                  : "bg-slate-950 text-slate-400 border-slate-700"
              }`}
            >
              <span className="sm:hidden">{short}</span>
              <span className="hidden sm:inline">{full}</span>
            </button>
          ))}
        </div>

        {error ? (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-200 text-sm px-3 sm:px-4 py-3 break-words">
            {error}
          </div>
        ) : null}
        {success ? (
          <div className="rounded-xl border border-teal-500/30 bg-teal-500/10 text-teal-200 text-sm px-3 sm:px-4 py-3 break-words">
            {success}
          </div>
        ) : null}

        {loading && !data ? (
          <div className="text-center text-slate-400 py-16 text-sm">Loading cashier day…</div>
        ) : null}

        {summary ? (
          <div className="grid gap-2 sm:gap-3 grid-cols-2 lg:grid-cols-4">
            <Stat label="Billed" value={money(summary.billed)} hint={`${summary.billCount} bills`} />
            <Stat
              label="Collected"
              value={money(summary.collected)}
              hint={`${summary.paidCount} paid`}
              tone="emerald"
            />
            <Stat
              label="Still due"
              value={money(summary.pending)}
              hint={`${summary.pendingCount} unpaid`}
              tone="amber"
            />
            <Stat
              label="Drawer cash"
              value={money(summary.expectedDrawerCash)}
              hint={`Open ${money(summary.openingCash)}`}
              tone="teal"
            />
          </div>
        ) : null}

        {summary ? (
          <div className="grid gap-1.5 grid-cols-2 sm:grid-cols-4 text-xs">
            {(
              [
                ["Cash", summary.byMethod?.cash],
                ["UPI", summary.byMethod?.upi],
                ["Card", summary.byMethod?.card],
                ["Other", summary.byMethod?.other]
              ] as const
            ).map(([label, val]) => (
              <div
                key={label}
                className="rounded-xl border border-slate-800 bg-slate-950/60 px-2.5 sm:px-3 py-2 flex justify-between gap-1 min-w-0"
              >
                <span className="text-slate-500 shrink-0">{label}</span>
                <span className="font-semibold text-white truncate tabular-nums">{money(val)}</span>
              </div>
            ))}
          </div>
        ) : null}

        {tab === "collect" && data ? (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-1.5 sm:flex sm:flex-wrap sm:gap-2">
              {(
                [
                  ["due", "Due"],
                  ["paid", "Paid"],
                  ["all", "All"]
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setBillFilter(id)}
                  className={`min-h-[40px] px-3 py-2 rounded-xl text-xs font-bold border ${
                    billFilter === id
                      ? "bg-slate-100 text-slate-900 border-slate-100"
                      : "bg-slate-950 text-slate-400 border-slate-700"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {bills.length === 0 ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/40 px-4 py-10 text-center text-sm text-slate-500">
                No bills in this filter for {date}.
              </div>
            ) : (
              <div className="space-y-2.5">
                {bills.map((sale) => {
                  const id = String(sale._id || sale.id);
                  const due = Number(sale.amountDue || 0);
                  const open = collectingId === id;
                  return (
                    <div
                      key={id}
                      className="rounded-2xl border border-slate-800 bg-slate-900/50 p-3 sm:p-4 min-w-0"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-bold text-white text-sm sm:text-base break-all">
                              {sale.billNumber}
                            </span>
                            <StatusPill status={sale.paymentStatus} due={due} />
                          </div>
                          <div className="text-sm text-slate-300 mt-1 break-words">
                            {sale.customerName}
                          </div>
                          <div className="text-xs text-slate-500">{sale.customerPhone}</div>
                          <div className="text-[11px] text-slate-500 mt-1.5 leading-snug break-words">
                            {(sale.items || [])
                              .map((i: any) => `${i.productName} (${i.quantity}${i.unit || "kg"})`)
                              .join(" · ")}
                          </div>
                        </div>
                        <div className="text-right shrink-0 pl-1">
                          <div className="text-base sm:text-lg font-black text-teal-200 tabular-nums">
                            {money(sale.total)}
                          </div>
                          <div className="text-[11px] text-emerald-300/90 mt-0.5">
                            Paid {money(sale.amountPaid)}
                          </div>
                          {due > 0.009 ? (
                            <div className="text-[11px] text-amber-300">Due {money(due)}</div>
                          ) : null}
                        </div>
                      </div>

                      {due > 0.009 && !open ? (
                        <button
                          type="button"
                          onClick={() => openCollect(sale)}
                          className={`${btnPrimary} w-full mt-3`}
                        >
                          Collect payment
                        </button>
                      ) : null}

                      {open ? (
                        <div className="mt-3 pt-3 border-t border-slate-800 space-y-3">
                          <div>
                            <label className="block text-[10px] uppercase text-slate-500 mb-1.5">
                              Method
                            </label>
                            <MethodChips value={collectMethod} onChange={setCollectMethod} />
                          </div>
                          <div>
                            <label className="block text-[10px] uppercase text-slate-500 mb-1">
                              Amount
                            </label>
                            <input
                              type="number"
                              inputMode="decimal"
                              min={0.01}
                              step={0.01}
                              value={collectAmount}
                              onChange={(e) => setCollectAmount(e.target.value)}
                              className={inputCls}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] uppercase text-slate-500 mb-1">
                              Note
                            </label>
                            <input
                              value={collectNotes}
                              onChange={(e) => setCollectNotes(e.target.value)}
                              placeholder="Ref / UPI id (optional)"
                              className={inputCls}
                            />
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <button
                              type="button"
                              disabled={busy}
                              onClick={handleCollect}
                              className={`${btnPrimary} w-full`}
                            >
                              Confirm collect
                            </button>
                            <button
                              type="button"
                              onClick={() => setCollectingId(null)}
                              className={`${btnGhost} w-full`}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : null}

                      {(sale.payments || []).length > 0 ? (
                        <div className="mt-3 text-[11px] text-slate-500 space-y-1 break-words">
                          {sale.payments.map((p: any, idx: number) => (
                            <div key={p._id || idx} className="leading-snug">
                              {money(p.amount)} · {p.paymentMethod}
                              {p.collectedBy?.name ? ` · ${p.collectedBy.name}` : ""}
                              {p.notes ? ` · ${p.notes}` : ""}
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : null}

        {tab === "expenses" && data ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-3 sm:p-4 space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="min-w-0">
                  <label className="block text-[10px] uppercase text-slate-500 mb-1">Category</label>
                  <select
                    value={expCategory}
                    onChange={(e) => setExpCategory(e.target.value)}
                    className={inputCls}
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="min-w-0">
                  <label className="block text-[10px] uppercase text-slate-500 mb-1">Amount</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0.01}
                    step={0.01}
                    value={expAmount}
                    onChange={(e) => setExpAmount(e.target.value)}
                    className={inputCls}
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] uppercase text-slate-500 mb-1.5">Paid by</label>
                <MethodChips value={expMethod} onChange={setExpMethod} />
              </div>
              <div className="min-w-0">
                <label className="block text-[10px] uppercase text-slate-500 mb-1">Title</label>
                <input
                  value={expTitle}
                  onChange={(e) => setExpTitle(e.target.value)}
                  placeholder="e.g. Lunch for 2 staff"
                  className={inputCls}
                />
              </div>
              <div className="min-w-0">
                <label className="block text-[10px] uppercase text-slate-500 mb-1">Notes</label>
                <input
                  value={expNotes}
                  onChange={(e) => setExpNotes(e.target.value)}
                  placeholder="Optional detail"
                  className={inputCls}
                />
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={handleAddExpense}
                className={`${btnPrimary} w-full sm:w-auto`}
              >
                Add expense
              </button>
              <p className="text-[11px] text-slate-500 leading-snug">
                Cash spends reduce drawer. All spends count in Calculations → costs.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 overflow-hidden min-w-0">
              <div className="px-3 sm:px-4 py-3 border-b border-slate-800 text-sm font-bold text-white">
                Today&apos;s spends · {money(summary?.expenseTotal)}
              </div>
              {(data.expenses || []).length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-slate-500">No spends yet.</div>
              ) : (
                <div className="divide-y divide-slate-800/70">
                  {data.expenses.map((e: any) => (
                    <div key={String(e._id)} className="px-3 sm:px-4 py-3 space-y-2 text-sm">
                      <div className="flex items-start justify-between gap-2 min-w-0">
                        <div className="min-w-0">
                          <div className="font-semibold text-white break-words">
                            {e.title ||
                              categories.find((c) => c.id === e.category)?.label ||
                              e.category}
                          </div>
                          <div className="text-xs text-slate-500 break-words mt-0.5">
                            {e.category} · {e.paymentMethod}
                            {e.notes ? ` · ${e.notes}` : ""}
                          </div>
                        </div>
                        <span className="font-bold text-amber-200 shrink-0 tabular-nums">
                          {money(e.amount)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteExpense(String(e._id))}
                        className="w-full sm:w-auto min-h-[40px] text-xs text-rose-300 border border-rose-500/30 px-3 py-2 rounded-xl"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}

        {tab === "drawer" && summary ? (
          <div className="space-y-3 sm:space-y-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-3 sm:p-5 space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Opening cash (float)" value={openingCash} onChange={setOpeningCash} />
                <Field
                  label="Cash to manager / bank"
                  value={cashToManager}
                  onChange={setCashToManager}
                />
                <Field
                  label="Closing cash counted"
                  value={closingCash}
                  onChange={setClosingCash}
                  placeholder="Count till"
                />
                <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3 text-sm space-y-1.5">
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-400">Cash collected</span>
                    <span className="text-white font-semibold tabular-nums">
                      {money(summary.byMethod?.cash)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-400">Cash expenses</span>
                    <span className="text-amber-200 font-semibold tabular-nums">
                      {money(summary.expenseCash)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-400">Expected</span>
                    <span className="text-teal-200 font-bold tabular-nums">
                      {money(summary.expectedDrawerCash)}
                    </span>
                  </div>
                  {summary.variance != null ? (
                    <div className="flex justify-between gap-2 pt-1.5 border-t border-slate-800">
                      <span className="text-slate-400">Variance</span>
                      <span
                        className={`font-bold tabular-nums ${
                          Math.abs(Number(summary.variance)) < 0.5
                            ? "text-emerald-300"
                            : "text-rose-300"
                        }`}
                      >
                        {money(summary.variance)}
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>
              <div>
                <label className="block text-[10px] uppercase text-slate-500 mb-1">Drawer notes</label>
                <textarea
                  value={drawerNotes}
                  onChange={(e) => setDrawerNotes(e.target.value)}
                  rows={3}
                  placeholder="Handover note, shortage reason…"
                  className={`${inputCls} min-h-[88px] resize-y`}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handleSaveDrawer(false)}
                  className={`${btnPrimary} w-full`}
                >
                  Save drawer
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handleSaveDrawer(true)}
                  className={`${btnGhost} w-full border-teal-500/40 text-teal-200`}
                >
                  Save &amp; close day
                </button>
              </div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 sm:px-4 py-3 text-[11px] sm:text-xs text-slate-400 leading-relaxed">
              Opening + cash collected − cash spends − handover = expected drawer. Count till for
              variance. UPI/card count in totals but not in the drawer.
            </div>
          </div>
        ) : null}
      </div>
    </DashboardShell>
  );
}

function MethodChips({
  value,
  onChange
}: {
  value: PayMethod;
  onChange: (v: PayMethod) => void;
}) {
  return (
    <div className="grid grid-cols-4 gap-1.5">
      {(["cash", "upi", "card", "other"] as const).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => onChange(m)}
          className={`min-h-[40px] rounded-xl text-xs font-bold border capitalize ${
            value === m
              ? "bg-teal-500/20 text-teal-200 border-teal-500/40"
              : "bg-slate-950 text-slate-400 border-slate-700"
          }`}
        >
          {m}
        </button>
      ))}
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  tone = "teal"
}: {
  label: string;
  value: string;
  hint: string;
  tone?: "teal" | "emerald" | "amber";
}) {
  const wrap =
    tone === "emerald"
      ? "border-emerald-500/25 bg-emerald-500/5"
      : tone === "amber"
        ? "border-amber-500/25 bg-amber-500/5"
        : "border-teal-500/25 bg-teal-500/5";
  const color =
    tone === "emerald" ? "text-emerald-300" : tone === "amber" ? "text-amber-200" : "text-teal-200";
  return (
    <div className={`rounded-2xl border p-2.5 sm:p-4 min-w-0 ${wrap}`}>
      <div className="text-[10px] sm:text-[11px] uppercase tracking-wider text-slate-400 font-bold">
        {label}
      </div>
      <div className={`text-lg sm:text-2xl font-black mt-1 break-all tabular-nums ${color}`}>
        {value}
      </div>
      <div className="text-[10px] sm:text-[11px] text-slate-500 mt-1.5 leading-snug">{hint}</div>
    </div>
  );
}

function StatusPill({ status, due }: { status?: string; due: number }) {
  if (due <= 0.009 || status === "paid") {
    return (
      <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border border-emerald-500/30 text-emerald-200 bg-emerald-500/10">
        Paid
      </span>
    );
  }
  if (status === "partial") {
    return (
      <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border border-amber-500/30 text-amber-200 bg-amber-500/10">
        Partial
      </span>
    );
  }
  return (
    <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border border-rose-500/30 text-rose-200 bg-rose-500/10">
      Due
    </span>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="min-w-0">
      <label className="block text-[10px] uppercase text-slate-500 mb-1">{label}</label>
      <input
        type="number"
        inputMode="decimal"
        min={0}
        step={0.01}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={inputCls}
      />
    </div>
  );
}
