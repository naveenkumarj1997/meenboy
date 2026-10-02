import { useEffect, useState, type ComponentType } from "react";
import { useSearchParams } from "react-router-dom";
import DashboardShell from "./DashboardShell";
import { useAuth } from "../../context/AuthContext";
import { ADMIN_NAV_LINKS } from "../../lib/adminNavLinks";
import {
  getToolProducts,
  getToolsSettings,
  updateToolsSettings,
  type ToolProduct,
  type ToolsSettings
} from "../../lib/api";
import { ReminderTool, UpiQrTool } from "./tools/PaymentTools";
import { PriceCalcTool, YieldTool } from "./tools/CalculatorTools";
import { LabelsTool, PurchasePlanTool, RouteTool } from "./tools/OrderTools";
import { DuplicatesTool, ExportTool, QuotationTool } from "./tools/DataTools";
import { Card, Field, Notice } from "./tools/toolsUi";
import { btnPrimary, inputCls, type ToolProps } from "./tools/toolsHelpers";

type ToolId =
  | "upi_qr"
  | "reminder"
  | "price_calc"
  | "yield"
  | "labels"
  | "purchase_plan"
  | "route"
  | "quotation"
  | "dedupe"
  | "export"
  | "settings";

const TOOLS: Array<{ id: ToolId; icon: string; label: string; hint: string; Component: ComponentType<ToolProps> }> = [
  { id: "upi_qr", icon: "📱", label: "UPI QR", hint: "QR for an exact amount", Component: UpiQrTool },
  { id: "reminder", icon: "💬", label: "Payment Reminder", hint: "WhatsApp pending customers", Component: ReminderTool },
  { id: "labels", icon: "🏷️", label: "Packing Labels", hint: "Print order stickers", Component: LabelsTool },
  { id: "route", icon: "🗺️", label: "Route Opener", hint: "All stops in Google Maps", Component: RouteTool },
  { id: "purchase_plan", icon: "🛒", label: "Purchase Planner", hint: "What to buy tomorrow", Component: PurchasePlanTool },
  { id: "price_calc", icon: "🧮", label: "Price Calculator", hint: "Cost + margin → price", Component: PriceCalcTool },
  { id: "yield", icon: "⚖️", label: "Cleaning Yield", hint: "Whole vs cleaned weight", Component: YieldTool },
  { id: "quotation", icon: "📄", label: "Quotation", hint: "PDF for bulk / events", Component: QuotationTool },
  { id: "dedupe", icon: "👥", label: "Duplicate Customers", hint: "Find and merge", Component: DuplicatesTool },
  { id: "export", icon: "📊", label: "Excel / CSV Export", hint: "Orders, customers, money", Component: ExportTool },
  { id: "settings", icon: "⚙️", label: "Settings", hint: "UPI ID, reminder message", Component: SettingsTool }
];

function SettingsTool({ token, settings, onSettingsSaved }: ToolProps) {
  const [upiId, setUpiId] = useState(settings.upiId);
  const [payeeName, setPayeeName] = useState(settings.payeeName);
  const [template, setTemplate] = useState(settings.reminderTemplate);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const save = async () => {
    try {
      setSaving(true);
      setMsg(null);
      const res = await updateToolsSettings(token, { upiId, payeeName, reminderTemplate: template });
      onSettingsSaved(res.settings);
      setMsg({ tone: "success", text: res.message });
    } catch (e: any) {
      setMsg({ tone: "error", text: e.message || "Failed to save" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card title="Tools settings" subtitle="Shared by every admin who uses the Tools section.">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Shop UPI ID" hint="Used for UPI QR codes and in the reminder message.">
          <input className={inputCls} value={upiId} placeholder="shopname@okaxis" onChange={(e) => setUpiId(e.target.value)} />
        </Field>
        <Field label="Payee name" hint="Shown in the customer's UPI app.">
          <input className={inputCls} value={payeeName} onChange={(e) => setPayeeName(e.target.value)} />
        </Field>
      </div>
      <Field
        label="Payment reminder message"
        hint="{name} = customer name, {amount} = pending amount, {upi} = UPI ID, {last} = last order date."
      >
        <textarea className={`${inputCls} h-28 py-2`} value={template} onChange={(e) => setTemplate(e.target.value)} />
      </Field>
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
      <button type="button" className={btnPrimary} disabled={saving} onClick={save}>
        {saving ? "Saving…" : "Save settings"}
      </button>
    </Card>
  );
}

export default function AdminTools() {
  const { token } = useAuth();
  const [params, setParams] = useSearchParams();
  const active = (TOOLS.find((t) => t.id === params.get("tool"))?.id || "upi_qr") as ToolId;
  const [settings, setSettings] = useState<ToolsSettings | null>(null);
  const [products, setProducts] = useState<ToolProduct[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    Promise.all([getToolsSettings(token), getToolProducts(token)])
      .then(([s, p]) => {
        setSettings(s.settings);
        setProducts(p.products);
      })
      .catch((e) => setError(e.message || "Failed to load tools"));
  }, [token]);

  const openTool = (id: ToolId) => {
    setParams({ tool: id }, { replace: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const tool = TOOLS.find((t) => t.id === active)!;
  const Active = tool.Component;

  return (
    <DashboardShell title="Tools" description="Handy tools for daily shop work." navLinks={ADMIN_NAV_LINKS}>
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {TOOLS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => openTool(t.id)}
              className={`text-left rounded-2xl border p-3 transition-colors ${
                active === t.id
                  ? "border-teal-400/60 bg-teal-500/15"
                  : "border-white/10 bg-white/5 hover:bg-white/10"
              }`}
            >
              <div className="text-xl">{t.icon}</div>
              <div className={`text-sm font-bold ${active === t.id ? "text-teal-100" : "text-white"}`}>{t.label}</div>
              <div className="text-xs text-slate-400">{t.hint}</div>
            </button>
          ))}
        </div>

        {error && <Notice tone="error">{error}</Notice>}
        {!settings || !token ? (
          !error && <p className="text-sm text-slate-400">Loading tools…</p>
        ) : (
          <Active
            key={active}
            token={token}
            settings={settings}
            products={products}
            onSettingsSaved={setSettings}
            openSettings={() => openTool("settings")}
          />
        )}
      </div>
    </DashboardShell>
  );
}
