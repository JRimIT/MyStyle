import express from 'express';
import Product from '../models/product.model.js';
import { countProduct } from '../controllers/countCart.js';

const router = express.Router();

// Public menu page
router.get('/menu', async (req, res) => {
  try {
    const products = await Product.find({}).sort({ createdAt: -1 }).select('name price images category sizes badges');
    const cartCount = req.session.user ? await countProduct(req.session.user._id) : 0;
    res.render('./pages/Menu', { products, cartCount, user: req.session.user || null });
  } catch (err) {
    console.error('Error loading menu page', err);
    res.status(500).send('Internal server error');
  }
});

// Public API for products (used by client-side filtering)
router.get('/api/products', async (req, res) => {
  try {
    const products = await Product.find({}).sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    console.error('Error returning public products', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Public product detail (by id or name slug)
router.get('/product/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;
    let product = null;

    // try by ObjectId
    if (/^[0-9a-fA-F]{24}$/.test(identifier)) {
      product = await Product.findById(identifier).lean();
    }

    // fallback: search by name (case-insensitive, partial)
    if (!product) {
      product = await Product.findOne({ name: { $regex: identifier.replace(/[-_]/g, ' '), $options: 'i' } }).lean();
    }

    if (!product) return res.status(404).render('error', { message: 'Product not found' });

    const cartCount = req.session.user ? await countProduct(req.session.user._id) : 0;
    res.render('pages/Product', { product, cartCount, user: req.session.user || null });
  } catch (err) {
    console.error('Error loading public product detail', err);
    res.status(500).send('Internal server error');
  }
});

export default router;
