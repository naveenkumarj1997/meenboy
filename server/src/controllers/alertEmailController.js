const {
  getOrCreateSettings,
  shapeSettings,
  isValidEmail,
  normalizeEmail,
  notifyContactQuery,
  sendAlertMail,
  isSmtpConfigured
} = require("../utils/mailAlert");

// @route GET /api/alert-emails/admin
const getAdminAlertEmails = async (req, res, next) => {
  try {
    const doc = await getOrCreateSettings();
    res.json({ settings: shapeSettings(doc) });
  } catch (error) {
    next(error);
  }
};

// @route PUT /api/alert-emails/admin
const updateAdminAlertEmails = async (req, res, next) => {
  try {
    const { emails, notifyWebsiteBooking, notifyContactQuery } = req.body;
    const doc = await getOrCreateSettings();

    if (emails !== undefined) {
      if (!Array.isArray(emails)) {
        return res.status(400).json({ message: "emails must be an array" });
      }
      const cleaned = [
        ...new Set(
          emails
            .map(normalizeEmail)
            .filter((e) => e && isValidEmail(e))
        )
      ].slice(0, 30);
      doc.emails = cleaned;
    }

    if (notifyWebsiteBooking !== undefined) {
      doc.notifyWebsiteBooking = Boolean(notifyWebsiteBooking);
    }
    if (notifyContactQuery !== undefined) {
      doc.notifyContactQuery = Boolean(notifyContactQuery);
    }

    doc.updatedBy = req.user._id;
    await doc.save();

    res.json({
      settings: shapeSettings(doc),
      message: "Notification settings saved"
    });
  } catch (error) {
    next(error);
  }
};

// @route POST /api/alert-emails/admin/test
const sendTestAlertEmail = async (req, res, next) => {
  try {
    const doc = await getOrCreateSettings();
    const settings = shapeSettings(doc);

    if (!settings.emails.length) {
      return res.status(400).json({
        message: "Add at least one email and Save settings before sending a test."
      });
    }
    if (!isSmtpConfigured()) {
      return res.status(400).json({
        message:
          "SMTP is not configured on the server. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS (and optional SMTP_FROM) in server .env, then restart."
      });
    }

    const result = await sendAlertMail({
      subject: "Fish Friendly — test alert mail",
      text: [
        "This is a test email from Fish Friendly Admin → Notifications.",
        "",
        "If you received this, alert mail is working.",
        `Sent at: ${new Date().toISOString()}`,
        `Recipients: ${settings.emails.join(", ")}`
      ].join("\n")
    });

    if (!result.sent) {
      const reason = result.reason || "unknown";
      const detail = result.error ? ` (${result.error})` : "";
      return res.status(400).json({
        message: `Test mail failed: ${reason}${detail}`
      });
    }

    res.json({
      message: `Test mail sent to ${settings.emails.length} address(es). Check inbox (and spam).`,
      recipients: settings.emails
    });
  } catch (error) {
    next(error);
  }
};

// @route POST /api/alert-emails/contact (public)
const submitContactQuery = async (req, res, next) => {
  try {
    const name = String(req.body?.name || "").trim().slice(0, 120);
    const email = normalizeEmail(req.body?.email).slice(0, 160);
    const message = String(req.body?.message || "").trim().slice(0, 2000);

    if (!name || !email || !message) {
      return res.status(400).json({ message: "Name, email and message are required" });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ message: "Valid email is required" });
    }

    // Fire-and-forget mail; always acknowledge the visitor
    void notifyContactQuery({ name, email, message });

    res.json({
      message: "Thank you — your message was sent. We will get back to you soon."
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAdminAlertEmails,
  updateAdminAlertEmails,
  sendTestAlertEmail,
  submitContactQuery
};
