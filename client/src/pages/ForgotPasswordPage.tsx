import { motion } from "framer-motion";
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { resetPasswordByEmail, verifyEmailForPasswordReset } from "../lib/api";

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<"email" | "password">("email");
  const [email, setEmail] = useState("");
  const [verifiedName, setVerifiedName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleVerify = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await verifyEmailForPasswordReset(email.trim());
      if (!res.exists) {
        setError(res.message || "No account found with this email.");
        setStep("email");
        return;
      }
      setVerifiedName(res.name || "");
      setStep("password");
      setSuccess(res.message || "Email verified. Set a new password.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not verify email");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await resetPasswordByEmail({
        email: email.trim(),
        password,
        confirmPassword
      });
      setSuccess(res.message || "Password updated.");
      setTimeout(() => navigate("/login"), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/60 p-8"
      >
        <h1 className="text-2xl font-bold text-white">Forgot password</h1>
        <p className="mt-1 text-sm text-slate-300">
          Enter your registered email, verify, then set a new password.
        </p>

        {error ? <p className="mt-4 text-sm text-rose-400">{error}</p> : null}
        {success ? <p className="mt-4 text-sm text-teal-400">{success}</p> : null}

        {step === "email" ? (
          <form onSubmit={handleVerify} className="mt-6 space-y-4">
            <input
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-indigo-500"
              type="email"
              placeholder="Registered email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-indigo-500 px-4 py-2.5 font-semibold text-white hover:bg-indigo-400 disabled:opacity-60"
            >
              {loading ? "Checking…" : "Verify email"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleReset} className="mt-6 space-y-4">
            <div className="rounded-lg border border-teal-500/20 bg-teal-500/10 px-3 py-2 text-sm text-teal-200">
              Verified{verifiedName ? `: ${verifiedName}` : ""} · {email}
            </div>
            <input
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-indigo-500"
              type="password"
              placeholder="New password (min 8 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
            <input
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-indigo-500"
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-indigo-500 px-4 py-2.5 font-semibold text-white hover:bg-indigo-400 disabled:opacity-60"
            >
              {loading ? "Saving…" : "Save new password"}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep("email");
                setPassword("");
                setConfirmPassword("");
                setSuccess("");
                setError("");
              }}
              className="w-full rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
            >
              Use a different email
            </button>
          </form>
        )}

        <p className="mt-5 text-sm text-slate-300">
          Remembered it?{" "}
          <Link to="/login" className="text-indigo-400 hover:text-indigo-300">
            Back to login
          </Link>
        </p>
        <p className="mt-3 text-xs text-slate-500">
          Or ask the shop admin to set a new password from Users.
        </p>
      </motion.div>
    </main>
  );
};

export default ForgotPasswordPage;
