/** Legacy launch whitelist + reference for old test vs real accounts. New users default to real. */
const REAL_CUSTOMER_EMAILS = ["ramola@gmail.com"];

const REAL_PARTNER_EMAILS = [
  "siva8220571@gmail.com",
  "naveen@gmail.com",
  "jaga@gmail.com"
];

/** Known test accounts — hidden from real-user dropdowns and reports */
const TEST_USER_EMAILS = [
  "wesleyrobinson98@gmail.com",
  "shalu@gmail.com"
];

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

const isRealUserEmail = (email) => {
  const e = normalizeEmail(email);
  return REAL_CUSTOMER_EMAILS.includes(e) || REAL_PARTNER_EMAILS.includes(e);
};

const isTestUserEmail = (email) => TEST_USER_EMAILS.includes(normalizeEmail(email));

const ALL_REAL_EMAILS = [...REAL_CUSTOMER_EMAILS, ...REAL_PARTNER_EMAILS];

module.exports = {
  REAL_CUSTOMER_EMAILS,
  REAL_PARTNER_EMAILS,
  TEST_USER_EMAILS,
  ALL_REAL_EMAILS,
  isRealUserEmail,
  isTestUserEmail,
  normalizeEmail
};
