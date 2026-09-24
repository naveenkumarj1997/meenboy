import { Link, useLocation, useNavigate } from "react-router-dom";
import { peekStoredUser, useAuth } from "../../context/AuthContext";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ADMIN_SECTION_DEFS,
  getAdminNavLinksForUser,
  hasAdminSection
} from "../../lib/adminSections";
import { getAllAdminNavLinks } from "../../lib/adminNavLinks";
import {
  getDueDatesAttentionCount,
  getNewCustomersCount,
  getUnassignedWebsiteOrdersCount
} from "../../lib/api";
import BrandLogo from "../../components/BrandLogo";

interface NavLink {
  label: string;
  href: string;
  badgeCount?: number;
}

interface DashboardShellProps {
  title: string;
  description: string;
  navLinks?: NavLink[];
  children?: React.ReactNode;
}

const formatBadgeCount = (n: number) => (n > 99 ? "99+" : String(n));

/** Stable component (not nested) so Framer Motion / HMR cannot keep a stale menu. */
const SidebarContent = ({
  links,
  userName,
  userRole,
  onLogout,
  onNavigate
}: {
  links: NavLink[];
  userName?: string;
  userRole?: string;
  onLogout: () => void;
  onNavigate: () => void;
}) => {
  const location = useLocation();

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 p-5 sm:p-6 flex flex-col items-start gap-1 border-b border-slate-800">
        <BrandLogo size="lg" />
        <span className="text-xs text-slate-500 font-medium uppercase tracking-widest">Workspace</span>
      </div>

      <nav className="flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y py-4 px-3 space-y-1.5 [-webkit-overflow-scrolling:touch]">
        {links.map((link) => {
          const isActive = location.pathname === link.href;
          const badge = Number(link.badgeCount) || 0;
          return (
            <Link
              key={link.href}
              to={link.href}
              className="block relative"
              onClick={onNavigate}
            >
              <div
                className={`relative px-4 py-3 rounded-xl text-sm font-medium transition-colors z-10 flex items-center justify-between gap-3 ${
                  isActive
                    ? "text-teal-300 bg-teal-500/10 border border-teal-500/20"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent"
                }`}
              >
                <span className="truncate">{link.label}</span>
                {badge > 0 ? (
                  <span
                    className="shrink-0 min-w-[1.35rem] h-5 px-1.5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center shadow-sm shadow-rose-500/40"
                    aria-label={`${badge} new`}
                  >
                    {formatBadgeCount(badge)}
                  </span>
                ) : null}
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="shrink-0 p-4 border-t border-slate-800 bg-slate-900/30">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
          <div className="min-w-0">
            <div className="text-sm font-bold text-slate-200 truncate">{userName}</div>
            <div className="text-xs text-teal-500 capitalize font-medium">
              {userRole?.replace("_", " ")}
            </div>
          </div>

          <div className="flex gap-2">
            {userRole === "customer" && (
              <Link
                to="/"
                className="flex-1 flex justify-center items-center rounded-lg border border-teal-500/30 py-2 text-xs text-teal-400 hover:bg-teal-500/10 transition-colors"
              >
                Home
              </Link>
            )}
            <button
              type="button"
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
};

const DashboardShell = ({ title, description, navLinks, children }: DashboardShellProps) => {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [newCustomersCount, setNewCustomersCount] = useState(0);
  const [unassignedWebsiteCount, setUnassignedWebsiteCount] = useState(0);
  const [dueDatesAttentionCount, setDueDatesAttentionCount] = useState(0);

  const canSeeNewCustomers =
    user?.role === "admin" && hasAdminSection(user, "new_customers");
  const canSeeDeliveries =
    user?.role === "admin" && hasAdminSection(user, "deliveries");
  const canSeeDueDates =
    user?.role === "admin" && hasAdminSection(user, "due_dates");

  const refreshNewCustomersCount = useCallback(async () => {
    if (!token || !canSeeNewCustomers) {
      setNewCustomersCount(0);
      return;
    }
    try {
      const res = await getNewCustomersCount(token);
      setNewCustomersCount(Number(res.count) || 0);
    } catch {
      /* keep last known count */
    }
  }, [token, canSeeNewCustomers]);

  const refreshUnassignedWebsiteCount = useCallback(async () => {
    if (!token || !canSeeDeliveries) {
      setUnassignedWebsiteCount(0);
      return;
    }
    try {
      const res = await getUnassignedWebsiteOrdersCount(token);
      setUnassignedWebsiteCount(Number(res.count) || 0);
    } catch {
      /* keep last known count */
    }
  }, [token, canSeeDeliveries]);

  const refreshDueDatesCount = useCallback(async () => {
    if (!token || !canSeeDueDates) {
      setDueDatesAttentionCount(0);
      return;
    }
    try {
      const res = await getDueDatesAttentionCount(token);
      setDueDatesAttentionCount(Number(res.attentionCount) || 0);
    } catch {
      /* keep last known count */
    }
  }, [token, canSeeDueDates]);

  useEffect(() => {
    refreshNewCustomersCount();
    refreshUnassignedWebsiteCount();
    refreshDueDatesCount();
  }, [
    refreshNewCustomersCount,
    refreshUnassignedWebsiteCount,
    refreshDueDatesCount,
    location.pathname
  ]);

  useEffect(() => {
    if (!canSeeNewCustomers) return;
    const onRefresh = () => refreshNewCustomersCount();
    window.addEventListener("ff:new-customers-count", onRefresh);
    return () => window.removeEventListener("ff:new-customers-count", onRefresh);
  }, [canSeeNewCustomers, refreshNewCustomersCount]);

  useEffect(() => {
    if (!canSeeDeliveries) return;
    const onRefresh = () => refreshUnassignedWebsiteCount();
    window.addEventListener("ff:unassigned-website-count", onRefresh);
    return () => window.removeEventListener("ff:unassigned-website-count", onRefresh);
  }, [canSeeDeliveries, refreshUnassignedWebsiteCount]);

  useEffect(() => {
    if (!canSeeDueDates) return;
    const onRefresh = () => refreshDueDatesCount();
    window.addEventListener("ff:due-dates-count", onRefresh);
    return () => window.removeEventListener("ff:due-dates-count", onRefresh);
  }, [canSeeDueDates, refreshDueDatesCount]);

  useEffect(() => {
    if (!canSeeNewCustomers && !canSeeDeliveries && !canSeeDueDates) return;
    const id = window.setInterval(() => {
      refreshNewCustomersCount();
      refreshUnassignedWebsiteCount();
      refreshDueDatesCount();
    }, 60000);
    return () => window.clearInterval(id);
  }, [
    canSeeNewCustomers,
    canSeeDeliveries,
    canSeeDueDates,
    refreshNewCustomersCount,
    refreshUnassignedWebsiteCount,
    refreshDueDatesCount
  ]);

  // Include section count so new menu items (Calculations, GST, …) appear after
  // code updates without needing a full remount / waiting on a stale useMemo.
  const adminSectionCount = ADMIN_SECTION_DEFS.length;

  const resolvedNavLinks = useMemo(() => {
    const stored = !user ? peekStoredUser() : null;
    const adminUser =
      user?.role === "admin" ? user : stored?.role === "admin" ? stored : null;

    let links: NavLink[] = adminUser
      ? getAdminNavLinksForUser(adminUser)
      : navLinks || [];

    // Never blank the admin sidebar while a session exists (auth HMR / brief null user)
    if (links.length === 0 && (adminUser || (token && peekStoredUser()?.role === "admin"))) {
      links = getAllAdminNavLinks();
    }

    return links.map((link) => {
      if (canSeeNewCustomers && newCustomersCount > 0 && link.href === "/dashboard/admin/new-customers") {
        return { ...link, badgeCount: newCustomersCount };
      }
      if (
        canSeeDeliveries &&
        unassignedWebsiteCount > 0 &&
        link.href === "/dashboard/admin/deliveries"
      ) {
        return { ...link, badgeCount: unassignedWebsiteCount };
      }
      if (
        canSeeDueDates &&
        dueDatesAttentionCount > 0 &&
        link.href === "/dashboard/admin/due-dates"
      ) {
        return { ...link, badgeCount: dueDatesAttentionCount };
      }
      return link;
    });
  }, [
    user,
    token,
    navLinks,
    adminSectionCount,
    canSeeNewCustomers,
    newCustomersCount,
    canSeeDeliveries,
    unassignedWebsiteCount,
    canSeeDueDates,
    dueDatesAttentionCount
  ]);

  const navLinksKey = resolvedNavLinks.map((l) => l.href).join("|");

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

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

  const mobileAttentionCount =
    newCustomersCount + unassignedWebsiteCount + dueDatesAttentionCount;

  const sidebarProps = {
    links: resolvedNavLinks,
    userName: user?.name || peekStoredUser()?.name,
    userRole: user?.role || peekStoredUser()?.role,
    onLogout,
    onNavigate: () => setIsMobileMenuOpen(false)
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col md:flex-row font-sans">
      <div className="md:hidden flex items-center justify-between border-b border-slate-800 bg-slate-900/95 backdrop-blur px-4 py-3 sticky top-0 z-50 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <BrandLogo size="sm" />
        <button
          type="button"
          aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
          aria-expanded={isMobileMenuOpen}
          onClick={() => setIsMobileMenuOpen((open) => !open)}
          className="relative text-slate-300 hover:text-white p-2 rounded-lg hover:bg-white/5"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {isMobileMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
            )}
          </svg>
          {!isMobileMenuOpen && mobileAttentionCount > 0 ? (
            <span className="absolute top-1 right-1 min-w-[1.1rem] h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
              {formatBadgeCount(mobileAttentionCount)}
            </span>
          ) : null}
        </button>
      </div>

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

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.aside
            key={`mobile-nav-${navLinksKey}`}
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "tween", duration: 0.25 }}
            className="fixed top-0 left-0 z-50 flex h-dvh max-h-dvh w-[min(18rem,85vw)] flex-col overflow-hidden bg-slate-900 border-r border-slate-800 shadow-2xl md:hidden pb-[env(safe-area-inset-bottom)]"
          >
            <SidebarContent key={navLinksKey} {...sidebarProps} />
          </motion.aside>
        )}
      </AnimatePresence>

      <aside className="hidden md:flex flex-col w-72 shrink-0 sticky top-0 h-screen max-h-screen overflow-hidden bg-slate-900/50 border-r border-slate-800">
        <SidebarContent key={navLinksKey} {...sidebarProps} />
      </aside>

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
