const nodemailer = require("nodemailer");
const AlertEmailSettings = require("../models/AlertEmailSettings");

const DEFAULT_KEY = "default";

const isSmtpConfigured = () =>
  Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS
  );

const normalizeEmail = (raw) => String(raw || "").trim().toLowerCase();

const isValidEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());

const shapeSettings = (doc) => {
  const raw = doc?.toObject ? doc.toObject() : doc || {};
  const emails = [...new Set((raw.emails || []).map(normalizeEmail).filter(isValidEmail))];
  return {
    emails,
    notifyWebsiteBooking: raw.notifyWebsiteBooking !== false,
    notifyContactQuery: raw.notifyContactQuery !== false,
    updatedAt: raw.updatedAt || null,
    smtpConfigured: isSmtpConfigured()
  };
};

const getOrCreateSettings = async () => {
  let doc = await AlertEmailSettings.findOne({ key: DEFAULT_KEY });
  if (doc) return doc;
  try {
    doc = await AlertEmailSettings.create({
      key: DEFAULT_KEY,
      emails: [],
      notifyWebsiteBooking: true,
      notifyContactQuery: true
    });
    return doc;
  } catch (error) {
    if (error?.code === 11000) {
      doc = await AlertEmailSettings.findOne({ key: DEFAULT_KEY });
      if (doc) return doc;
    }
    throw error;
  }
};

let cachedTransporter = null;
let cachedKey = "";

const getTransporter = () => {
  if (!isSmtpConfigured()) return null;
  const key = [
    process.env.SMTP_HOST,
    process.env.SMTP_PORT,
    process.env.SMTP_USER,
    process.env.SMTP_PASS
  ].join("|");
  if (cachedTransporter && cachedKey === key) return cachedTransporter;

  const port = Number(process.env.SMTP_PORT || 587);
  cachedTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
  cachedKey = key;
  return cachedTransporter;
};

/**
 * Soft-fail alert mail to all configured recipients.
 * Never throws to callers — logs and returns { sent, reason? }.
 */
const sendAlertMail = async ({ subject, text, html, requireFlag }) => {
  try {
    const doc = await getOrCreateSettings();
    const settings = shapeSettings(doc);

    if (requireFlag === "websiteBooking" && !settings.notifyWebsiteBooking) {
      return { sent: false, reason: "website_booking_disabled" };
    }
    if (requireFlag === "contactQuery" && !settings.notifyContactQuery) {
      return { sent: false, reason: "contact_query_disabled" };
    }
    if (!settings.emails.length) {
      return { sent: false, reason: "no_recipients" };
    }
    if (!settings.smtpConfigured) {
      console.warn("[mailAlert] SMTP not configured — skipped:", subject);
      return { sent: false, reason: "smtp_not_configured" };
    }

    const transporter = getTransporter();
    if (!transporter) {
      return { sent: false, reason: "smtp_not_configured" };
    }

    const from =
      String(process.env.SMTP_FROM || "").trim() ||
      process.env.SMTP_USER;

    await transporter.sendMail({
      from,
      to: settings.emails.join(", "),
      subject: String(subject || "Fish Friendly alert").slice(0, 200),
      text: text || "",
      html: html || undefined
    });

    return { sent: true, recipients: settings.emails.length };
  } catch (error) {
    console.error("[mailAlert] send failed:", error?.message || error);
    return { sent: false, reason: "send_failed", error: error?.message };
  }
};

const notifyWebsiteBooking = async (order, customer) => {
  const orderId = String(order?._id || "").slice(-6).toUpperCase();
  const name = customer?.name || "Customer";
  const phone = order?.address?.phone || customer?.phone || "-";
  const date = order?.deliveryDate || "-";
  const time = order?.deliveryTime || "-";
  const total = Number(order?.total || order?.estimatedTotal || 0).toFixed(2);
  const items = (order?.items || [])
    .map((i) => `- ${i.productName || i.name || "Item"} × ${i.quantity}`)
    .join("\n");

  const subject = `New website booking #${orderId} — ${name}`;
  const text = [
    "New website booking received.",
    "",
    `Order: #${orderId}`,
    `Customer: ${name}`,
    `Phone: ${phone}`,
    `Delivery: ${date} ${time}`,
    `Total: ₹${total}`,
    "",
    "Items:",
    items || "(none)",
    "",
    "Open Order Management to assign a delivery partner."
  ].join("\n");

  return sendAlertMail({
    subject,
    text,
    requireFlag: "websiteBooking"
  });
};

const notifyContactQuery = async ({ name, email, message }) => {
  const subject = `Contact query from ${name || "visitor"}`;
  const text = [
    "New contact form query.",
    "",
    `Name: ${name}`,
    `Email: ${email}`,
    "",
    "Message:",
    message
  ].join("\n");

  return sendAlertMail({
    subject,
    text,
    requireFlag: "contactQuery"
  });
};

module.exports = {
  isSmtpConfigured,
  isValidEmail,
  normalizeEmail,
  shapeSettings,
  getOrCreateSettings,
  sendAlertMail,
  notifyWebsiteBooking,
  notifyContactQuery
};
