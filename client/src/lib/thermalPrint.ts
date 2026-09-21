import { formatQuantityLabel } from "./weightOptions";

const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export type ThermalBillInput = {
  billNumber?: string;
  titleBadge?: string;
  customerName?: string;
  customerPhone?: string;
  paymentMethod?: string;
  dateLine?: string;
  deliveryTime?: string;
  notes?: string;
  total?: number;
  items?: Array<{
    productName?: string;
    name?: string;
    cutName?: string;
    quantity?: number;
    unit?: string;
    unitPrice?: number;
    totalPrice?: number;
  }>;
};

/**
 * Thermal receipt for TVS RP 3200 Lite (80mm roll, ~72mm print width).
 */
export const printThermalBill = (sale: ThermalBillInput) => {
  const itemBlocks = (sale.items || [])
    .map((item, i) => {
      const name = escapeHtml(item.productName || item.name || "Item");
      const cut = item.cutName ? ` (${escapeHtml(item.cutName)})` : "";
      const qty = escapeHtml(formatQuantityLabel(Number(item.quantity || 0), item.unit));
      const rate = Number(item.unitPrice || 0).toFixed(2);
      const amt = Number(item.totalPrice || 0).toFixed(2);
      return `
      <div class="item">
        <div class="item-name">${i + 1}. ${name}${cut}</div>
        <div class="item-row">
          <span>${qty} x ${rate}</span>
          <span class="amt">${amt}</span>
        </div>
      </div>`;
    })
    .join("");

  const billNo = escapeHtml(sale.billNumber || "");
  const customer = escapeHtml(sale.customerName || "Customer");
  const phone = escapeHtml(sale.customerPhone || "-");
  const dateLine = escapeHtml(sale.dateLine || "");
  const notes = sale.notes ? escapeHtml(sale.notes) : "";
  const total = Number(sale.total || 0).toFixed(2);
  const badge = escapeHtml(sale.titleBadge || "CASH MEMO");

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Thermal ${billNo}</title>
  <style>
    /* TVS RP 3200 Lite: 80mm paper, printable ~72mm */
    @page {
      size: 80mm auto;
      margin: 2mm;
    }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      background: #fff;
      color: #000;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body {
      width: 72mm;
      max-width: 72mm;
      margin: 0 auto;
      padding: 2mm 1.5mm 4mm;
      font-family: "Arial Narrow", Arial, Helvetica, sans-serif;
      font-size: 15px;
      line-height: 1.35;
      font-weight: 700;
    }
    .center { text-align: center; }
    .shop {
      font-size: 22px;
      font-weight: 900;
      letter-spacing: 0.5px;
      margin: 0 0 2px;
      text-transform: uppercase;
    }
    .addr {
      font-size: 12px;
      font-weight: 600;
      line-height: 1.3;
      margin: 0 0 6px;
    }
    .badge {
      display: inline-block;
      border: 2px solid #000;
      padding: 3px 8px;
      font-size: 14px;
      font-weight: 900;
      margin: 4px 0 8px;
      letter-spacing: 0.4px;
    }
    .rule {
      border: none;
      border-top: 2px dashed #000;
      margin: 8px 0;
    }
    .rule-solid {
      border: none;
      border-top: 2px solid #000;
      margin: 8px 0;
    }
    .meta div {
      font-size: 14px;
      font-weight: 700;
      margin: 2px 0;
      word-break: break-word;
    }
    .meta strong { font-weight: 900; }
    .item { margin: 0 0 8px; }
    .item-name {
      font-size: 15px;
      font-weight: 900;
      word-break: break-word;
    }
    .item-row {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      font-size: 14px;
      font-weight: 700;
      margin-top: 2px;
    }
    .amt { font-weight: 900; white-space: nowrap; }
    .total-box {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 8px;
      font-size: 20px;
      font-weight: 900;
      margin: 6px 0;
    }
    .thanks {
      text-align: center;
      font-size: 13px;
      font-weight: 700;
      margin-top: 10px;
    }
    @media print {
      html, body {
        width: 72mm;
        max-width: 72mm;
      }
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <div class="center">
    <div class="shop">FISH FRIENDLY</div>
    <div class="addr">
      177, Kalai Nagar<br/>
      Thanakkankulam<br/>
      Madurai - 625006<br/>
      Ph: +91 9087894319
    </div>
    <div class="badge">${badge}</div>
  </div>
  <hr class="rule" />
  <div class="meta">
    <div><strong>Bill:</strong> ${billNo}</div>
    <div><strong>Date:</strong> ${dateLine}</div>
    <div><strong>Name:</strong> ${customer}</div>
    <div><strong>Phone:</strong> ${phone}</div>
  </div>
  <hr class="rule-solid" />
  ${itemBlocks || '<div class="item-name">No items</div>'}
  <hr class="rule-solid" />
  <div class="total-box">
    <span>TOTAL</span>
    <span>Rs ${total}</span>
  </div>
  ${notes ? `<hr class="rule" /><div class="meta"><div><strong>Note:</strong> ${notes}</div></div>` : ""}
  <hr class="rule" />
  <div class="thanks">Thank you! Visit again.</div>
  <script>
    window.onload = function () {
      setTimeout(function () {
        window.focus();
        window.print();
      }, 250);
    };
  </script>
</body>
</html>`;

  const win = window.open("", "_blank", "width=360,height=780");
  if (!win) {
    alert("Please allow pop-ups to print the thermal bill.");
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
};
