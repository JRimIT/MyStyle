// services/invoiceService.js
import mongoose from "mongoose";
import Invoice from "../models/invoice.model.js";

/** Chuyển số an toàn */
function toNumber(n, def = 0) {
  const v = Number(n);
  return Number.isFinite(v) ? v : def;
}

/** Chuẩn hoá payload update (đơn giản) */
function normalizePayload(input = {}) {
  const out = {};
  const allow = [
    "items", "tax", "shippingFee", "currency",
    "status", "issuedAt", "dueAt", "paidAt", "note",
    "orderId", "userId"
  ];

  for (const k of allow) {
    if (input[k] !== undefined) out[k] = input[k];
  }

  if (out.tax !== undefined) out.tax = toNumber(out.tax);
  if (out.shippingFee !== undefined) out.shippingFee = toNumber(out.shippingFee);

  // Chuẩn hoá items (nếu có)
  if (Array.isArray(out.items)) {
    out.items = out.items.map(it => ({
      name: String(it.name || "").trim(),
      quantity: toNumber(it.quantity, 1),
      unitPrice: toNumber(it.unitPrice, 0),
    })).filter(it => it.name);
  }

  // Thời gian
  ["issuedAt", "dueAt", "paidAt"].forEach(k => {
    if (out[k]) out[k] = new Date(out[k]);
  });

  // objectId
  ["orderId", "userId"].forEach(k => {
    if (out[k] && mongoose.isValidObjectId(out[k])) {
      out[k] = new mongoose.Types.ObjectId(out[k]);
    } else if (out[k]) {
      delete out[k];
    }
  });

  return out;
}

/** -------- Services ---------- */

/** View Invoice List (phân trang + tìm kiếm) */
export async function listInvoices({ search, page, limit, status, userId } = {}) {
  const query = {};
  if (search) {
    query._id = { $regex: String(search), $options: "i" };
  }
  if (status) query.paymentStatus = status;
  if (userId && mongoose.isValidObjectId(userId)) query.userId = userId;

  page = Math.max(parseInt(page) || 1, 1);
  limit = Math.min(Math.max(parseInt(limit) || 10, 1), 100);
  const skip = (page - 1) * limit;

  const [invoices, total] = await Promise.all([
    Invoice.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Invoice.countDocuments(query)
  ]);

  return { invoices, total, page, limit };
}

/** View Invoice Detail */
export async function getInvoice(id) {
  if (!mongoose.isValidObjectId(id)) throw new Error("invalid invoice id");
  const inv = await Invoice.findById(id).populate('items.product').lean();
  if (!inv) throw new Error("Invoice not found");
  return inv;
}

/** Edit Invoice */
export async function updateInvoice(id, data) {
  console.log('updateInvoice called with:', { id, data });

  if (!mongoose.isValidObjectId(id)) {
    throw new Error("Invalid invoice id");
  }

  // Check if invoice exists
  const invoice = await Invoice.findById(id);
  if (!invoice) {
    throw new Error("Invoice not found");
  }

  console.log('Current invoice state:', invoice);

  // Validate payment status
  if (!data.paymentStatus) {
    throw new Error("Payment status is required");
  }

  if (!['pending', 'paid', 'failed'].includes(data.paymentStatus)) {
    throw new Error("Invalid payment status value");
  }

  // Update the payment status
  invoice.paymentStatus = data.paymentStatus;
  
  console.log('Saving invoice with new status:', invoice.paymentStatus);

  // Save and return the updated document
  const updated = await invoice.save();
  
  console.log('Invoice updated successfully:', updated);
  
  return updated;
}

/** Delete Invoice */
export async function deleteInvoice(id) {
  if (!mongoose.isValidObjectId(id)) throw new Error("invalid invoice id");
  const deleted = await Invoice.findByIdAndDelete(id).lean();
  if (!deleted) throw new Error("Invoice not found");
  return deleted;
}

/** Export Invoice (PDF) – trả buffer + metadata */
export async function exportInvoicePDF(id) {
  if (!mongoose.isValidObjectId(id)) throw new Error("invalid invoice id");
  const inv = await Invoice.findById(id).lean();
  if (!inv) throw new Error("Invoice not found");

  // Tạo PDF bằng pdfkit
  const PDFDocument = (await import("pdfkit")).default;
  const doc = new PDFDocument({ size: "A4", margin: 40 });

  // Thu thập buffer
  const chunks = [];
  doc.on("data", (c) => chunks.push(c));
  const done = new Promise((resolve) => doc.on("end", resolve));

  // Header
  doc.fontSize(18).text("INVOICE", { align: "right" });
  doc.moveDown(0.5);
  doc.fontSize(12).text(`Invoice No: ${inv.invoiceNumber || inv._id}`);
  doc.text(`Issued At: ${inv.issuedAt ? new Date(inv.issuedAt).toLocaleDateString("vi-VN") : "-"}`);
  doc.text(`Status: ${inv.status}`);
  doc.moveDown(1);

  // Items table
  doc.fontSize(13).text("Items:");
  doc.moveDown(0.5);

  const items = inv.items || [];
  if (!items.length) {
    doc.text("(No items)");
  } else {
    // header
    doc.font("Helvetica-Bold");
    doc.text("Name", { continued: true, width: 240 });
    doc.text("Qty", { continued: true, width: 60, align: "right" });
    doc.text("Unit", { continued: true, width: 100, align: "right" });
    doc.text("Line Total", { width: 120, align: "right" });
    doc.font("Helvetica");

    const toMoney = (n) => new Intl.NumberFormat("vi-VN").format(Number(n || 0));

    items.forEach(it => {
      const line = Number(it.quantity || 0) * Number(it.unitPrice || 0);
      doc.text(String(it.name), { continued: true, width: 240 });
      doc.text(String(it.quantity), { continued: true, width: 60, align: "right" });
      doc.text(toMoney(it.unitPrice), { continued: true, width: 100, align: "right" });
      doc.text(toMoney(line), { width: 120, align: "right" });
    });
  }

  doc.moveDown(1);

  const toMoney = (n) => new Intl.NumberFormat("vi-VN").format(Number(n || 0));

  // Totals
  doc.text(`Subtotal: ${toMoney(inv.subTotal)}`, { align: "right" });
  doc.text(`Tax: ${toMoney(inv.tax)}`, { align: "right" });
  doc.text(`Shipping: ${toMoney(inv.shippingFee)}`, { align: "right" });
  doc.font("Helvetica-Bold").text(`TOTAL: ${toMoney(inv.total)} ${inv.currency || "VND"}`, { align: "right" });
  doc.font("Helvetica");

  if (inv.note) {
    doc.moveDown(1);
    doc.text("Note:");
    doc.text(inv.note, { width: 520 });
  }

  doc.end();
  await done;

  const buffer = Buffer.concat(chunks);
  const filename = `${(inv.invoiceNumber || "invoice")}.pdf`;
  return { buffer, filename, contentType: "application/pdf" };
}
