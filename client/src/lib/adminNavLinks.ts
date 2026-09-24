import { ADMIN_SECTION_DEFS, getAdminNavLinksForUser } from "./adminSections";

/** Always derive from current section defs (avoids stale HMR / module snapshots). */
export const getAllAdminNavLinks = () =>
  ADMIN_SECTION_DEFS.map(({ label, href }) => ({ label, href }));

/**
 * Full admin nav list for page props. DashboardShell rebuilds admin menus from
 * getAdminNavLinksForUser / getAllAdminNavLinks so new sections stay visible.
 */
export const ADMIN_NAV_LINKS = getAllAdminNavLinks();

export { getAdminNavLinksForUser };
