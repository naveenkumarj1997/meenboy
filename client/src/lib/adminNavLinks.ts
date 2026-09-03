import { ADMIN_SECTION_DEFS, getAdminNavLinksForUser } from "./adminSections";

/** All admin nav links (full list). Prefer getAdminNavLinksForUser for the sidebar. */
export const ADMIN_NAV_LINKS = ADMIN_SECTION_DEFS.map(({ label, href }) => ({ label, href }));

export { getAdminNavLinksForUser };
