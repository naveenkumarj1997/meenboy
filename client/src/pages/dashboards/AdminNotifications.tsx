import { useEffect, useState } from "react";
import DashboardShell from "./DashboardShell";
import { useAuth } from "../../context/AuthContext";
import { ADMIN_NAV_LINKS } from "../../lib/adminNavLinks";
import {
  getAdminAlertEmails,
  updateAdminAlertEmails,
  sendTestAlertEmail,
  type AlertEmailSettingsPayload
} from "../../lib/api";

const emptySettings = (): AlertEmailSettingsPayload => ({
  emails: [],
  notifyWebsiteBooking: true,
  notifyContactQuery: true,
  smtpConfigured: false
});

export default function AdminNotifications() {
  const { token } = useAuth();
  const [settings, setSettings] = useState<AlertEmailSettingsPayload>(emptySettings());
  const [newEmail, setNewEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  const load = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await getAdminAlertEmails(token);
      setSettings(res.settings || emptySettings());
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Failed to load notification settings" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const addEmail = () => {
    const email = newEmail.trim().toLowerCase();
    if (!email) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFeedback({ type: "error", text: "Enter a valid email address" });
      return;
    }
    if (settings.emails.includes(email)) {
      setFeedback({ type: "error", text: "That email is already in the list" });
      return;
    }
    if (settings.emails.length >= 30) {
      setFeedback({ type: "error", text: "Maximum 30 emails" });
      return;
    }
    setSettings((s) => ({ ...s, emails: [...s.emails, email] }));
    setNewEmail("");
    setFeedback(null);
  };

  const removeEmail = (email: string) => {
    setSettings((s) => ({ ...s, emails: s.emails.filter((e) => e !== email) }));
  };

  const handleSave = async () => {
    if (!token) return;
    try {
      setSaving(true);
      setFeedback(null);
      const res = await updateAdminAlertEmails(token, {
        emails: settings.emails,
        notifyWebsiteBooking: settings.notifyWebsiteBooking,
        notifyContactQuery: settings.notifyContactQuery
      });
      setSettings(res.settings || settings);
      setFeedback({ type: "success", text: res.message || "Saved" });
      setTimeout(() => setFeedback(null), 3500);
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Failed to save" });
    } finally {
      setSaving(false);
    }
  };

  const handleTestMail = async () => {
    if (!token) return;
    try {
      setTesting(true);
      setFeedback(null);
      // Persist current list first so test uses the emails shown on screen
      await updateAdminAlertEmails(token, {
        emails: settings.emails,
        notifyWebsiteBooking: settings.notifyWebsiteBooking,
        notifyContactQuery: settings.notifyContactQuery
      });
      const res = await sendTestAlertEmail(token);
      setFeedback({ type: "success", text: res.message || "Test mail sent" });
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Test mail failed" });
    } finally {
      setTesting(false);
    }
  };

  return (
    <DashboardShell
      title="Notifications"
      description="Add admin/manager emails to get free SMTP alerts for website bookings and contact queries."
      navLinks={ADMIN_NAV_LINKS}
    >
      <div className="max-w-2xl space-y-6">
        <div
          className={`rounded-2xl border p-4 text-sm ${
            settings.smtpConfigured
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
              : "border-amber-500/30 bg-amber-500/10 text-amber-100"
          }`}
        >
          {settings.smtpConfigured ? (
            <p>
              SMTP is configured on the server. Alerts will send to the emails below when toggles are
              on.
            </p>
          ) : (
            <div className="space-y-1">
              <p className="font-semibold text-amber-200">SMTP not configured yet</p>
              <p className="text-amber-100/90">
                Bookings still work. To send free mail, set{" "}
                <code className="text-xs bg-black/30 px-1 rounded">SMTP_HOST</code>,{" "}
                <code className="text-xs bg-black/30 px-1 rounded">SMTP_PORT</code>,{" "}
                <code className="text-xs bg-black/30 px-1 rounded">SMTP_USER</code>,{" "}
                <code className="text-xs bg-black/30 px-1 rounded">SMTP_PASS</code>, and optional{" "}
                <code className="text-xs bg-black/30 px-1 rounded">SMTP_FROM</code> on the server (Gmail
                App Password or Resend free tier).
              </p>
            </div>
          )}
        </div>

        <div className="bg-cyan-950/50 border border-white/10 rounded-2xl p-6 shadow-xl">
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="w-8 h-8 border-4 border-teal-500/30 border-t-teal-500 rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-white mb-1">Alert emails</h3>
                <p className="text-sm text-white/50 mb-4">
                  These addresses receive alerts (max 30). Manual booking does not send email.
                </p>

                <div className="flex flex-col sm:flex-row gap-2 mb-3">
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addEmail();
                      }
                    }}
                    placeholder="manager@example.com"
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-teal-500"
                  />
                  <button
                    type="button"
                    onClick={addEmail}
                    className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold"
                  >
                    Add
                  </button>
                </div>

                {settings.emails.length === 0 ? (
                  <p className="text-sm text-slate-500">No emails added yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {settings.emails.map((email) => (
                      <li
                        key={email}
                        className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                      >
                        <span className="text-sm text-white truncate">{email}</span>
                        <button
                          type="button"
                          onClick={() => removeEmail(email)}
                          className="text-xs font-bold text-rose-300 hover:text-rose-200 shrink-0"
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="space-y-3 border-t border-white/10 pt-5">
                <h3 className="text-sm font-bold text-white/60 uppercase tracking-wide">
                  When to email
                </h3>
                <label className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3 cursor-pointer">
                  <div>
                    <div className="text-white font-semibold">Website booking</div>
                    <div className="text-xs text-white/45">New customer checkout orders</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.notifyWebsiteBooking}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, notifyWebsiteBooking: e.target.checked }))
                    }
                    className="h-5 w-5 accent-teal-500"
                  />
                </label>
                <label className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3 cursor-pointer">
                  <div>
                    <div className="text-white font-semibold">Contact page query</div>
                    <div className="text-xs text-white/45">Messages from /contact form</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.notifyContactQuery}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, notifyContactQuery: e.target.checked }))
                    }
                    className="h-5 w-5 accent-teal-500"
                  />
                </label>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                {feedback ? (
                  <span
                    className={`text-sm font-semibold ${
                      feedback.type === "success" ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {feedback.text}
                  </span>
                ) : (
                  <span className="text-xs text-white/40">
                    Save settings, then use Test mail to verify delivery
                  </span>
                )}
                <div className="flex flex-wrap gap-2 self-end">
                  <button
                    type="button"
                    onClick={handleTestMail}
                    disabled={testing || saving || settings.emails.length === 0}
                    className="px-5 py-2.5 bg-amber-500/90 hover:bg-amber-400 text-slate-950 font-bold rounded-xl disabled:opacity-50"
                  >
                    {testing ? "Sending test..." : "Test mail"}
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving || testing}
                    className="px-5 py-2.5 bg-teal-500 hover:bg-teal-400 text-white font-bold rounded-xl disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save settings"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
