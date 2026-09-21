const PDFDocument = require("pdfkit");
const { resolvePdfFonts } = require("./pdfFonts");

const drawSectionTitle = (doc, text) => {
  doc.moveDown(0.6);
  doc.font("PartnerBold").fontSize(12).fillColor("#0f766e").text(text);
  doc.moveDown(0.25);
  doc.font("Partner").fontSize(10).fillColor("#0f172a");
};

/**
 * Generate partner NDA / hire agreement PDF (print, sign manually, give to admin).
 */
const generatePartnerNdaPdf = (partner = {}) =>
  new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margin: 48,
        info: {
          Title: "Fish Friendly — Delivery Partner NDA",
          Author: "Fish Friendly"
        }
      });
      const chunks = [];
      doc.on("data", (c) => chunks.push(c));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const { regular, bold } = resolvePdfFonts();
      if (regular) {
        doc.registerFont("Partner", regular);
        doc.registerFont("PartnerBold", bold || regular);
      } else {
        doc.registerFont("Partner", "Helvetica");
        doc.registerFont("PartnerBold", "Helvetica-Bold");
      }

      const name = String(partner.name || "________________").trim();
      const email = String(partner.email || "________________").trim();
      const phone = String(partner.phone || "________________").trim();
      const aadhaar = String(partner.aadhaarNumber || "________________").trim();
      const dl = String(partner.dlNumber || "________________").trim();
      const bikeRc = String(partner.bikeRcNumber || "________________").trim();
      const bikeNo = String(partner.bikeNumber || "________________").trim();
      const today = new Date().toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      });

      doc.font("PartnerBold").fontSize(18).fillColor("#0f172a").text("FISH FRIENDLY", {
        align: "center"
      });
      doc
        .font("PartnerBold")
        .fontSize(14)
        .fillColor("#0f766e")
        .text("Delivery Partner Non-Disclosure & Hire Agreement", { align: "center" });
      doc.moveDown(0.4);
      doc
        .font("Partner")
        .fontSize(9)
        .fillColor("#64748b")
        .text("Print this form, sign by hand, and submit the signed copy to the shop admin.", {
          align: "center"
        });

      drawSectionTitle(doc, "1. Partner details");
      doc.text(`Full name: ${name}`);
      doc.text(`Email: ${email}`);
      doc.text(`Phone: ${phone}`);
      doc.text(`Aadhaar number: ${aadhaar}`);
      doc.text(`Driving Licence (DL) number: ${dl}`);
      doc.text(`Bike RC number: ${bikeRc}`);
      doc.text(`Bike number (registration plate): ${bikeNo}`);
      doc.text(`Date: ${today}`);

      drawSectionTitle(doc, "2. Confidentiality (NDA)");
      doc.text(
        "I agree that all customer information, order details, addresses, phone numbers, prices, routes, business processes, and any other information related to Fish Friendly that I learn while working as a delivery partner is confidential. I will not share, copy, sell, or misuse this information with any third party during or after my engagement with Fish Friendly, except as required by law or with written permission from Fish Friendly management."
      );

      drawSectionTitle(doc, "3. Duties & conduct");
      doc.text(
        "I will deliver orders carefully, keep food/items safe, follow the delivery sequence given by the shop, update delivery status honestly, collect payments as instructed, and treat customers respectfully. I will not cancel or divert orders without shop approval."
      );

      drawSectionTitle(doc, "4. Vehicle & documents");
      doc.text(
        "I confirm that the Aadhaar, Driving Licence, RC, and bike number provided above are true and belong to me (or the vehicle I use for deliveries). I will keep a valid driving licence and vehicle documents while working with Fish Friendly."
      );

      drawSectionTitle(doc, "5. Return of materials");
      doc.text(
        "If my engagement ends, I will return any bags, jackets, phones, or other property belonging to Fish Friendly and will stop using any confidential information."
      );

      drawSectionTitle(doc, "6. Acknowledgement");
      doc.text(
        "I have read and understood this agreement. I downloaded / printed this NDA, will sign it manually, and will hand the signed copy to the Fish Friendly admin. Online acceptance in the app does not replace the signed paper NDA."
      );

      doc.moveDown(1.2);
      doc.font("PartnerBold").text("Partner signature (manual)");
      doc.moveDown(0.3);
      doc.font("Partner").text("Sign here: _________________________________");
      doc.moveDown(0.6);
      doc.text("Name: _____________________________________");
      doc.moveDown(0.6);
      doc.text("Date: _____________________________________");

      doc.moveDown(1.2);
      doc.font("PartnerBold").text("Admin acknowledgement (shop use)");
      doc.moveDown(0.3);
      doc.font("Partner").text("Received signed NDA on: ______________________");
      doc.moveDown(0.6);
      doc.text("Admin name / sign: ___________________________");

      doc.moveDown(1.5);
      doc
        .font("Partner")
        .fontSize(8)
        .fillColor("#94a3b8")
        .text("Fish Friendly — Delivery Partner NDA · For internal hire use only.", {
          align: "center"
        });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });

module.exports = { generatePartnerNdaPdf };
