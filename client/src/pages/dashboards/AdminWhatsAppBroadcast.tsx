import { useEffect, useMemo, useState } from "react";
import DashboardShell from "./DashboardShell";
import { useAuth } from "../../context/AuthContext";
import { getAllUsers } from "../../lib/api";
import { ADMIN_NAV_LINKS } from "../../lib/adminNavLinks";
import WhatsAppQuillEditor, { htmlToWhatsAppText } from "../../components/WhatsAppQuillEditor";

const toWhatsAppNumber = (phone?: string) => {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 10) return `91${digits}`;
  if (digits.startsWith("91") && digits.length === 12) return digits;
  if (digits.startsWith("0") && digits.length === 11) return `91${digits.slice(1)}`;
  return digits;
};

const customerWhatsAppUrl = (phone: string, message: string) => {
  const num = toWhatsAppNumber(phone);
  if (!num) return "";
  return `https://wa.me/${num}?text=${encodeURIComponent(message)}`;
};

const DEFAULT_HTML = `<p>Hi {{name}}!</p><p><br></p><p><strong>Fish Friendly update:</strong></p><p>Write your announcement here. Use the image button to add an open-order banner.</p><p><br></p><p>Thank you!<br>— Fish Friendly</p>`;

const SENT_KEY = "ff_whatsapp_broadcast_sent";

const isEmptyHtml = (html: string) => {
  const text = htmlToWhatsAppText(html).trim();
  return text.length < 2;
};

const readSentIds = (): Set<string> => {
  try {
    const raw = sessionStorage.getItem(SENT_KEY);
    const arr = raw ? (JSON.parse(raw) as string[]) : [];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
};

const writeSentIds = (ids: Set<string>) => {
  sessionStorage.setItem(SENT_KEY, JSON.stringify([...ids]));
};

export default function AdminWhatsAppBroadcast() {
  const { token } = useAuth();
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [messageHtml, setMessageHtml] = useState(DEFAULT_HTML);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "with_phone" | "pending">("with_phone");
  const [sentIds, setSentIds] = useState<Set<string>>(() => readSentIds());
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    if (!token) return;
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await getAllUsers(token, { role: "customer", realOnly: true });
        setCustomers(res.users || []);
      } catch (err: any) {
        setError(err.message || "Failed to load customers");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filter]);

  const personalize = (template: string, customer: any) =>
    template
      .replace(/\{\{name\}\}/gi, customer.name || "Customer")
      .replace(/\{\{phone\}\}/gi, customer.phone || "")
      .replace(/\{\{email\}\}/gi, customer.email || "");

  const previewText = useMemo(
    () => personalize(htmlToWhatsAppText(messageHtml), { name: "Customer" }),
    [messageHtml]
  );

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return customers
      .map((c) => {
        const id = String(c._id || c.id);
        const wa = toWhatsAppNumber(c.phone);
        const altWa = toWhatsAppNumber(c.alternatePhone);
        return {
          ...c,
          id,
          waPhone: wa || altWa,
          phoneDisplay: c.phone || c.alternatePhone || "",
          sent: sentIds.has(id)
        };
      })
      .filter((c) => {
        if (filter === "with_phone" && !c.waPhone) return false;
        if (filter === "pending" && (!c.waPhone || c.sent)) return false;
        if (!q) return true;
        const hay = `${c.name} ${c.email} ${c.phone} ${c.alternatePhone}`.toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
  }, [customers, search, filter, sentIds]);

  const totalPages = Math.ceil(rows.length / itemsPerPage) || 1;
  const page = Math.min(currentPage, totalPages);
  const pageRows = rows.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const withPhoneCount = customers.filter(
    (c) => toWhatsAppNumber(c.phone) || toWhatsAppNumber(c.alternatePhone)
  ).length;
  const pendingCount = rows.filter((c) => c.waPhone && !c.sent).length;

  const markSent = (id: string) => {
    setSentIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      writeSentIds(next);
      return next;
    });
  };

  const clearSent = () => {
    sessionStorage.removeItem(SENT_KEY);
    setSentIds(new Set());
  };

  const openWhatsApp = (customer: any) => {
    if (!customer.waPhone) {
      setError(`${customer.name} has no valid WhatsApp phone number`);
      return;
    }
    if (isEmptyHtml(messageHtml)) {
      setError("Write an announcement message first");
      return;
    }
    const plain = htmlToWhatsAppText(messageHtml);
    const text = personalize(plain, customer);
    const url = customerWhatsAppUrl(customer.waPhone, text);
    window.open(url, "_blank", "noopener,noreferrer");
    markSent(customer.id);
    setError("");
  };

  return (
    <DashboardShell
      title="Broadcast WhatsApp"
      description="Send announcements to customers one-by-one. Each click opens that customer's WhatsApp chat with your message ready to send."
      navLinks={ADMIN_NAV_LINKS}
    >
      <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
        Use the editor to write text and insert a banner image. WhatsApp web links can only send
        <strong> text</strong> automatically — the banner is added as an image link in the message.
        After WhatsApp opens, you can also attach the same banner file manually if you want.
        Use {"{{name}}"} for the customer name.
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-white font-bold">Announcement (Quill editor)</h3>
            <button
              type="button"
              onClick={() => setMessageHtml(DEFAULT_HTML)}
              className="text-xs text-slate-400 hover:text-white"
            >
              Reset template
            </button>
          </div>
          <WhatsAppQuillEditor
            value={messageHtml}
            onChange={setMessageHtml}
            token={token}
            onError={setError}
          />
          <p className="text-xs text-slate-500">
            Toolbar → image icon to upload open-order banner. Placeholders: {"{{name}}"},{" "}
            {"{{phone}}"}, {"{{email}}"}
          </p>

          <div>
            <p className="text-xs text-slate-400 mb-1">WhatsApp text preview</p>
            <pre className="whitespace-pre-wrap text-xs text-slate-300 bg-slate-950 border border-slate-800 rounded-xl p-3 max-h-40 overflow-y-auto">
              {previewText || "(empty)"}
            </pre>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-slate-950 border border-slate-800 p-3">
              <div className="text-lg font-bold text-white">{customers.length}</div>
              <div className="text-[10px] text-slate-500 uppercase">Customers</div>
            </div>
            <div className="rounded-xl bg-slate-950 border border-slate-800 p-3">
              <div className="text-lg font-bold text-teal-300">{withPhoneCount}</div>
              <div className="text-[10px] text-slate-500 uppercase">With phone</div>
            </div>
            <div className="rounded-xl bg-slate-950 border border-slate-800 p-3">
              <div className="text-lg font-bold text-amber-300">{pendingCount}</div>
              <div className="text-[10px] text-slate-500 uppercase">Pending</div>
            </div>
          </div>
          <button
            type="button"
            onClick={clearSent}
            className="text-xs text-slate-400 hover:text-white underline"
          >
            Clear “sent” marks for this session
          </button>
        </div>

        <div className="lg:col-span-7 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, phone, email…"
              className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
            />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as typeof filter)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
            >
              <option value="with_phone">With WhatsApp number</option>
              <option value="pending">Not sent yet</option>
              <option value="all">All customers</option>
            </select>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            {loading ? (
              <p className="p-6 text-sm text-slate-400">Loading customers…</p>
            ) : pageRows.length === 0 ? (
              <p className="p-6 text-sm text-slate-400">No customers match.</p>
            ) : (
              <ul className="divide-y divide-slate-800">
                {pageRows.map((c) => (
                  <li
                    key={c.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-white truncate">{c.name}</p>
                        {c.sent ? (
                          <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300">
                            Opened
                          </span>
                        ) : null}
                      </div>
                      <p className="text-xs text-slate-400 truncate">{c.email}</p>
                      <p className="text-sm text-teal-300 mt-0.5">
                        {c.waPhone ? c.phoneDisplay || c.waPhone : "No phone"}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={!c.waPhone || isEmptyHtml(messageHtml)}
                      onClick={() => openWhatsApp(c)}
                      className="shrink-0 px-4 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#1ebe57] disabled:opacity-40 text-white text-sm font-semibold"
                    >
                      {c.sent ? "Send again" : "Send on WhatsApp"}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {!loading && rows.length > 0 && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <p className="text-sm text-slate-400">
                Showing {(page - 1) * itemsPerPage + 1}–
                {Math.min(page * itemsPerPage, rows.length)} of {rows.length}
              </p>
              <div className="flex gap-2 items-center">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 bg-slate-800 text-white rounded text-sm disabled:opacity-30"
                >
                  Prev
                </button>
                <span className="text-sm text-slate-300">
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 bg-slate-800 text-white rounded text-sm disabled:opacity-30"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
