import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface NavLink {
  label: string;
  href: string;
}

interface DashboardShellProps {
  title: string;
  description: string;
  navLinks?: NavLink[];
  children?: React.ReactNode;
}

const DashboardShell = ({ title, description, navLinks, children }: DashboardShellProps) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Lock body scroll while mobile sidebar is open
  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isMobileMenuOpen]);

  const onLogout = () => {
    logout();
    navigate("/login");
  };

  const SidebarContent = () => (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 p-5 sm:p-6 flex flex-col items-start gap-1 border-b border-slate-800">
        <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-500 tracking-wider">
          FISHFRIENDLY
        </h1>
        <span className="text-xs text-slate-500 font-medium uppercase tracking-widest">Workspace</span>
      </div>

      {/* Scrollable nav links — min-h-0 is required for mobile overflow */}
      <nav className="flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y py-4 px-3 space-y-1.5">
        {navLinks?.map((link) => {
          const isActive = location.pathname === link.href;
          return (
            <Link
              key={link.href}
              to={link.href}
              className="block relative"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <div
                className={`relative px-4 py-3 rounded-xl text-sm font-medium transition-colors z-10 flex items-center gap-3 ${
                  isActive
                    ? "text-teal-300 bg-teal-500/10 border border-teal-500/20"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent"
                }`}
              >
                {link.label}
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="shrink-0 p-4 border-t border-slate-800 bg-slate-900/30">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
          <div className="min-w-0">
            <div className="text-sm font-bold text-slate-200 truncate">{user?.name}</div>
            <div className="text-xs text-teal-500 capitalize font-medium">{user?.role?.replace("_", " ")}</div>
          </div>

          <div className="flex gap-2">
            {user?.role === "customer" && (
              <Link
                to="/"
                className="flex-1 flex justify-center items-center rounded-lg border border-teal-500/30 py-2 text-xs text-teal-400 hover:bg-teal-500/10 transition-colors"
              >
                Home
              </Link>
            )}
            <button
              onClick={onLogout}
              className="flex-1 rounded-lg border border-slate-700 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col md:flex-row font-sans">
      {/* Mobile Top Header */}
      <div className="md:hidden flex items-center justify-between border-b border-slate-800 bg-slate-900/95 backdrop-blur px-4 py-3 sticky top-0 z-50">
        <h1 className="text-lg font-bold text-teal-400 tracking-wider truncate">FISHFRIENDLY</h1>
        <button
          type="button"
          aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
          aria-expanded={isMobileMenuOpen}
          onClick={() => setIsMobileMenuOpen((open) => !open)}
          className="text-slate-300 hover:text-white p-2 rounded-lg hover:bg-white/5"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {isMobileMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "tween", duration: 0.25 }}
            className="fixed top-0 left-0 z-50 flex h-dvh max-h-dvh w-[min(18rem,85vw)] flex-col overflow-hidden bg-slate-900 border-r border-slate-800 shadow-2xl md:hidden"
          >
            <SidebarContent />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-72 shrink-0 sticky top-0 h-screen max-h-screen overflow-hidden bg-slate-900/50 border-r border-slate-800">
        <SidebarContent />
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 w-full min-w-0 flex flex-col min-h-screen overflow-x-hidden">
        <div className="p-4 sm:p-6 md:p-8 lg:p-10 max-w-7xl mx-auto w-full">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-6 md:mb-8"
          >
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2 break-words">{title}</h2>
            <p className="text-slate-400 text-sm sm:text-base">{description}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="w-full min-w-0"
          >
            {children}
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default DashboardShell;
