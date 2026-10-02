import { useMemo, useState } from "react";
import { updateToolsSettings } from "../../../lib/api";
import { Card, Field, Notice } from "./toolsUi";
import { btnPrimary, btnSmall, inputCls, money, selectCls, shortName, type ToolProps } from "./toolsHelpers";

const num = (s: string) => {
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};
const roundUpTo = (n: number, step: number) => Math.ceil(n / step - 1e-9) * step;

function ProductSelect({ products, value, onChange }: {
  products: ToolProps["products"];
  value: string;
  onChange: (id: string) => void;
}) {
  const groups = useMemo(() => {
    const map = new Map<string, ToolProps["products"]>();
    products.forEach((p) => {
      if (!map.has(p.category)) map.set(p.category, []);
      map.get(p.category)!.push(p);
    });
    return [...map.entries()];
  }, [products]);
  return (
    <select className={selectCls} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">— Any product —</option>
      {groups.map(([cat, list]) => (
        <optgroup key={cat} label={cat}>
          {list.map((p) => (
            <option key={p._id} value={p._id}>
              {shortName(p.name)}
              {p.isActive ? "" : " (inactive)"}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

export function PriceCalcTool({ settings, products }: ToolProps) {
  const [productId, setProductId] = useState("");
  const [cost, setCost] = useState("");
  const [yieldPct, setYieldPct] = useState("100");
  const [extra, setExtra] = useState("0");
  const [margin, setMargin] = useState("25");
  const [roundStep, setRoundStep] = useState("10");

  const product = products.find((p) => p._id === productId);

  const chooseProduct = (id: string) => {
    setProductId(id);
    const saved = settings.yields.find((y) => y.productId === id);
    setYieldPct(saved ? String(saved.percent) : "100");
  };

  const c = num(cost);
  const y = Math.min(100, Math.max(1, num(yieldPct) || 100));
  const costPerCleaned = c > 0 ? c / (y / 100) + num(extra) : 0;
  const raw = costPerCleaned * (1 + num(margin) / 100);
  const step = num(roundStep);
  const suggested = raw > 0 ? (step > 0 ? roundUpTo(raw, step) : Math.round(raw * 100) / 100) : 0;
  const profitPerKg = suggested - costPerCleaned;
  const marginAt = (price: number) =>
    costPerCleaned > 0 && price > 0 ? ((price - costPerCleaned) / costPerCleaned) * 100 : null;
  const unit = product?.unit || "kg";

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
      <Card title="Selling price calculator" subtitle="From your buying price, cleaning loss and margin to a selling price.">
        <Field label="Product (optional)" hint="Fills in its saved cleaning yield and shows its website price range.">
          <ProductSelect products={products} value={productId} onChange={chooseProduct} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={`Buying price per ${unit} (₹)`} hint="What you pay the vendor for the whole item.">
            <input className={inputCls} type="number" min="0" inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="e.g. 600" />
          </Field>
          <Field label="Cleaning yield (%)" hint="Cleaned weight ÷ whole weight. 100 if nothing is lost.">
            <input className={inputCls} type="number" min="1" max="100" inputMode="decimal" value={yieldPct} onChange={(e) => setYieldPct(e.target.value)} />
          </Field>
          <Field label={`Other cost per ${unit} (₹)`} hint="Ice, packing, cutting labour, transport.">
            <input className={inputCls} type="number" min="0" inputMode="decimal" value={extra} onChange={(e) => setExtra(e.target.value)} />
          </Field>
          <Field label="Margin (%)">
            <input className={inputCls} type="number" min="0" inputMode="decimal" value={margin} onChange={(e) => setMargin(e.target.value)} />
          </Field>
          <Field label="Round price up to">
            <select className={selectCls} value={roundStep} onChange={(e) => setRoundStep(e.target.value)}>
              <option value="0">No rounding</option>
              <option value="1">₹1</option>
              <option value="5">₹5</option>
              <option value="10">₹10</option>
              <option value="50">₹50</option>
            </select>
          </Field>
        </div>
      </Card>

      <Card title="Result">
        {costPerCleaned <= 0 ? (
          <p className="text-sm text-slate-400">Enter the buying price to see the selling price.</p>
        ) : (
          <div className="space-y-4">
            <div className="rounded-2xl bg-teal-500/10 border border-teal-400/30 p-4 text-center">
              <div className="text-xs font-bold uppercase tracking-wide text-teal-300">Suggested selling price</div>
              <div className="text-4xl font-black text-white mt-1">
                {money(suggested)}
                <span className="text-base font-semibold text-slate-400">/{unit}</span>
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-y-2 text-sm">
              <dt className="text-slate-400">Real cost per cleaned {unit}</dt>
              <dd className="text-right font-bold text-white">{money(Math.round(costPerCleaned * 100) / 100)}</dd>
              <dt className="text-slate-400">Profit per {unit}</dt>
              <dd className="text-right font-bold text-emerald-300">{money(Math.round(profitPerKg * 100) / 100)}</dd>
            </dl>
            {product && (
              <div className="space-y-2 border-t border-white/10 pt-3 text-sm">
                <div className="font-bold text-white">{shortName(product.name)} on the website</div>
                {[
                  ["Min price", product.minPrice],
                  ["Max price", product.maxPrice]
                ].map(([label, price]) => {
                  const m = marginAt(price as number);
                  return (
                    <div key={label as string} className="flex justify-between">
                      <span className="text-slate-400">
                        {label} {money(price as number)}
                      </span>
                      <span className={`font-bold ${m === null ? "text-slate-500" : m < 0 ? "text-red-300" : "text-emerald-300"}`}>
                        {m === null ? "-" : `${m >= 0 ? "+" : ""}${m.toFixed(1)}% margin`}
                      </span>
                    </div>
                  );
                })}
                {product.minPrice > 0 && product.minPrice < costPerCleaned && (
                  <Notice tone="error">
                    Selling at the min price loses {money(Math.round((costPerCleaned - product.minPrice) * 100) / 100)} per {unit}.
                  </Notice>
                )}
                {product.minPrice > 0 && product.minPrice >= costPerCleaned && product.minPrice < suggested && (
                  <Notice tone="warn">The website min price is below the suggested price for a {margin}% margin.</Notice>
                )}
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

export function YieldTool({ token, settings, products, onSettingsSaved }: ToolProps) {
  const [productId, setProductId] = useState("");
  const [whole, setWhole] = useState("");
  const [cleaned, setCleaned] = useState("");
  const [needCleaned, setNeedCleaned] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const w = num(whole);
  const cl = num(cleaned);
  const pct = w > 0 && cl > 0 && cl <= w ? Math.round((cl / w) * 1000) / 10 : 0;
  const saved = settings.yields.find((y) => y.productId === productId);
  const usePct = pct || saved?.percent || 0;
  const need = num(needCleaned);
  const buyWhole = usePct && need > 0 ? Math.ceil((need / (usePct / 100)) * 4 - 1e-9) / 4 : 0;

  const saveYields = async (yields: ToolProps["settings"]["yields"], text: string) => {
    try {
      setSaving(true);
      const res = await updateToolsSettings(token, { yields });
      onSettingsSaved(res.settings);
      setMsg({ tone: "success", text });
    } catch (e: any) {
      setMsg({ tone: "error", text: e.message || "Failed to save" });
    } finally {
      setSaving(false);
    }
  };

  const saveCurrent = () => {
    if (!productId || !pct) return;
    const name = shortName(products.find((p) => p._id === productId)?.name || "");
    saveYields(
      [...settings.yields.filter((y) => y.productId !== productId), { productId, percent: pct }],
      `Saved ${pct}% yield for ${name}. The price calculator and purchase planner will use it.`
    );
  };

  const savedRows = settings.yields
    .map((y) => ({ ...y, product: products.find((p) => p._id === y.productId) }))
    .filter((r) => r.product)
    .sort((a, b) => a.product!.name.localeCompare(b.product!.name));

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card title="Cleaning yield calculator" subtitle="Weigh before and after cleaning to know how much you really get.">
        <Field label="Product">
          <ProductSelect products={products} value={productId} onChange={setProductId} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Whole weight (kg)">
            <input className={inputCls} type="number" min="0" step="0.01" inputMode="decimal" value={whole} onChange={(e) => setWhole(e.target.value)} placeholder="e.g. 5" />
          </Field>
          <Field label="Cleaned weight (kg)">
            <input className={inputCls} type="number" min="0" step="0.01" inputMode="decimal" value={cleaned} onChange={(e) => setCleaned(e.target.value)} placeholder="e.g. 3.6" />
          </Field>
        </div>
        {cl > w && w > 0 && <Notice tone="error">Cleaned weight can't be more than the whole weight.</Notice>}
        {pct > 0 && (
          <div className="rounded-2xl bg-teal-500/10 border border-teal-400/30 p-4 grid grid-cols-2 text-center">
            <div>
              <div className="text-xs font-bold uppercase text-teal-300">Yield</div>
              <div className="text-3xl font-black text-white">{pct}%</div>
            </div>
            <div>
              <div className="text-xs font-bold uppercase text-teal-300">Waste</div>
              <div className="text-3xl font-black text-white">{Math.round((w - cl) * 1000) / 1000} kg</div>
            </div>
          </div>
        )}
        <button type="button" className={btnPrimary} disabled={!productId || !pct || saving} onClick={saveCurrent}>
          {saving ? "Saving…" : "Save yield for this product"}
        </button>
        {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
        <div className="border-t border-white/10 pt-4 space-y-3">
          <Field label="How much cleaned do you need? (kg)" hint={usePct ? `Using ${usePct}% yield.` : "Enter weights above or pick a product with a saved yield."}>
            <input className={inputCls} type="number" min="0" step="0.25" inputMode="decimal" value={needCleaned} onChange={(e) => setNeedCleaned(e.target.value)} />
          </Field>
          {buyWhole > 0 && (
            <p className="text-sm text-slate-300">
              Buy about <span className="text-xl font-black text-white">{buyWhole} kg</span> whole.
            </p>
          )}
        </div>
      </Card>

      <Card title="Saved yields" subtitle="Used by the price calculator and purchase planner.">
        {!savedRows.length ? (
          <p className="text-sm text-slate-400">No yields saved yet.</p>
        ) : (
          <div className="divide-y divide-white/10 rounded-xl border border-white/10">
            {savedRows.map((r) => (
              <div key={r.productId} className="flex items-center justify-between gap-3 p-3">
                <div>
                  <div className="font-bold text-white">{shortName(r.product!.name)}</div>
                  <div className="text-xs text-slate-400">{r.product!.category}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-lg font-black text-teal-300">{r.percent}%</span>
                  <button
                    type="button"
                    className={btnSmall}
                    disabled={saving}
                    onClick={() =>
                      saveYields(
                        settings.yields.filter((y) => y.productId !== r.productId),
                        `Removed the yield for ${shortName(r.product!.name)}.`
                      )
                    }
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
