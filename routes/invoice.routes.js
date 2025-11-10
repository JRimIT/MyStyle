// routes/invoice.routes.js
import express from "express";
import {
  listInvoices,
  getInvoice,
  updateInvoice,
  deleteInvoice,
  exportInvoicePDF,
} from "../controllers/invoiceService.js";

const router = express.Router();

// Middleware to check if user is logged in
const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.user) {
    return next();
  }
  res.redirect('/login');
};

// Một BASE duy nhất cho module
const BASE = "/manage/invoices";

// Apply authentication middleware to all invoice routes
router.use(BASE, isAuthenticated);

/**
 * - GET  {BASE}                 -> View Invoice List
 * - GET  {BASE}/:id             -> View Invoice Detail
 * - GET  {BASE}/edit/:id        -> Edit form
 * - POST {BASE}/:id             -> Edit Invoice (submit)
 * - POST {BASE}/:id/delete      -> Delete Invoice
 * - GET  {BASE}/:id/export      -> Export Invoice (PDF)
 */

// List
router.get(BASE, async (req, res, next) => {
  try {
    const { search, status, userId, page = 1, limit = 12 } = req.query;
    const data = await listInvoices({ search, status, userId, page, limit });
    
    res.render("pages/manageInvoices", {
      ...data,
      search: search || "",
      status: status || "",
      userId: userId || "",
      user: req.session?.user || null,  // Add user for navbar
      cartCount: req.session?.cartCount || 0,  // Add cartCount for navbar
    });
  } catch (e) { next(e); }
});

// Detail
router.get(`${BASE}/:id`, async (req, res, next) => {
  try {
    const inv = await getInvoice(req.params.id);
        res.render("pages/invoiceDetail", { 
      invoice: inv, 
      BASE,
      user: req.session?.user || null,
      cartCount: req.session?.cartCount || 0
    });
  } catch (e) { next(e); }
});

// Edit form
router.get(`${BASE}/edit/:id`, async (req, res, next) => {
  try {
    const inv = await getInvoice(req.params.id);
    res.render("pages/editInvoice", { 
      invoice: inv, 
      BASE,
      user: req.session?.user || null,
      cartCount: req.session?.cartCount || 0
    });
  } catch (e) { next(e); }
});

// Edit submit
router.post(`${BASE}/:id`, async (req, res, next) => {
  try {
    console.log('Received POST request to update invoice:', {
      id: req.params.id,
      body: req.body
    });

    if (!req.body.paymentStatus) {
      throw new Error('Payment status is required');
    }

    const updated = await updateInvoice(req.params.id, req.body);
    
    console.log('Invoice updated successfully:', updated);
    
    res.redirect(`${BASE}/${req.params.id}`);
  } catch (e) { 
    console.error('Error updating invoice:', e);
    // Send error back to the form
    const inv = await getInvoice(req.params.id);
    res.render("pages/editInvoice", { 
      invoice: inv, 
      error: e.message,
      user: req.session?.user || null,
      cartCount: req.session?.cartCount || 0
    });
  }
});

// Delete
router.post(`${BASE}/:id/delete`, async (req, res, next) => {
  try {
    await deleteInvoice(req.params.id);
    res.redirect(BASE);
  } catch (e) { next(e); }
});

// Export (PDF)
router.get(`${BASE}/:id/export`, async (req, res, next) => {
  try {
    const { buffer, filename, contentType } = await exportInvoicePDF(req.params.id);
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.send(buffer);
  } catch (e) { next(e); }
});

export default router;
