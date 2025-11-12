import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import axios from 'axios';
import https from 'https';
import User from '../models/user.model.js';
import Product from '../models/product.model.js';
import { verifyAdmin } from '../config/jwtConfig.js'; // nếu có verifyAdmin riêng thì thay verifyUser bằng verifyAdmin
import Cart from '../models/cart.model.js';
import { countProduct } from '../controllers/countCart.js';
import Order from '../models/order.model.js';
import multer from 'multer';
import path from 'path';
import { listProducts, createProduct } from '../controllers/productService.js';

const router = express.Router();
const axiosInstance = axios.create({
  httpsAgent: new https.Agent({ rejectUnauthorized: false }),
});

// ✅ Multer config for image upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// ✅ Middleware xác thực admin
// Nếu bạn có verifyAdmin riêng, import nó và thay vào đây
router.use(verifyAdmin);
// // ----------------------------------------------------------------
// // Admin Home
// // ----------------------------------------------------------------
// router.get('/admin/vouchers', (req, res) => {
//   return res.render('admins/Home', { user: req.user });
// });

// ----------------------------------------------------------------
// Quản lý người dùng
// ----------------------------------------------------------------
router.get('/admin/manageUser', async (req, res) => {
  try {
    const users = await User.find({});
    return res.render('admins/manageUser', { users });
  } catch (error) {
    console.error('Error /admin/manageUser:', error);
    return res.status(500).render('error', { message: 'Internal server error', error });
  }
});

router.get('/admin/users/edit/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).render('error', { message: 'User not found' });
    return res.render('admins/manageUserEdit', { user });
  } catch (error) {
    console.error('Error /admin/users/edit/:userId: ', error);
    return res.status(500).render('error', { message: 'Internal server error', error });
  }
});

router.post('/admin/users/edit/:userId', async (req, res) => {
  try {
    const { username, role } = req.body;
    await User.findByIdAndUpdate(req.params.userId, { $set: { username, role } });
    return res.redirect('/admin/manageUser');
  } catch (error) {
    console.error('Error /admin/users/edit/:userId: ', error);
    return res.status(500).render('error', { message: 'Internal server error', error });
  }
});

router.post('/admin/users/delete/:userId', async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.userId);
    return res.redirect('/admin/manageUser');
  } catch (error) {
    console.error('Error /admin/users/delete: ', error);
    return res.status(500).render('error', { message: 'Internal server error', error });
  }
});

// ----------------------------------------------------------------
// Quản lý đơn hàng
// ----------------------------------------------------------------
router.get('/admin/orders', async (req, res) => {
  try {
    const orders = await Order.find({})
      .populate('userId', 'username')
      .populate('items.productId', 'name price imageUrl');
    return res.render('admins/manageOrders', { orders });
  } catch (error) {
    console.error('Error /admin/orders:', error);
    return res.status(500).render('error', { message: 'Internal server error', error });
  }
});

router.post('/admin/orders/update/:orderId', async (req, res) => {
  try {
    const { status } = req.body;
    await Order.findByIdAndUpdate(req.params.orderId, { status });
    return res.redirect('/admin/orders');
  } catch (error) {
    console.error('Error updating order status:', error);
    return res.status(500).render('error', { message: 'Internal server error', error });
  }
});

// ----------------------------------------------------------------
// Quản lý sản phẩm
// ----------------------------------------------------------------
router.get('/admin/products', async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', category = '', active } = req.query;
    const result = await listProducts({ page, limit, search, category, active });

    const qs = new URLSearchParams();
    qs.set('limit', result.limit);
    if (search) qs.set('search', search);
    if (category) qs.set('category', category);
    if (typeof active !== 'undefined') qs.set('active', active);
    const baseUrl = `/admin/products?${qs.toString()}`;

    return res.render('admins/manageProducts', {
      products: result.products,
      page: result.page,
      limit: result.limit,
      total: result.total,
      baseUrl,
      search,
      category,
      active,
    });
  } catch (err) {
    console.error('GET /admin/products error:', err);
    return res.status(500).render('error', { message: 'Failed to load products', error: err });
  }
});

router.get('/admin/products/create', (req, res) => {
  return res.render('admins/createProduct');
});

router.post('/admin/products/create', async (req, res) => {
  try {
    const { name, description, price, imageUrl, category } = req.body;
    const rawSizes = req.body.sizes;
    const rawBadges = req.body.badges;

    const toArray = (v) => {
      if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
      if (typeof v === 'string') return v.split(',').map((s) => s.trim()).filter(Boolean);
      return [];
    };

    const sizesPath = Product.schema.path('sizes');
    const badgesPath = Product.schema.path('badges');

    let sizesToSave;
    if (sizesPath && sizesPath.instance === 'Array') sizesToSave = toArray(rawSizes);
    else if (rawSizes !== undefined) sizesToSave = String(rawSizes).trim();

    let badgesToSave;
    if (badgesPath && badgesPath.instance === 'Array') badgesToSave = toArray(rawBadges);
    else if (rawBadges !== undefined) badgesToSave = String(rawBadges).trim();

    const productData = { name, description, price, imageUrl, category };
    if (sizesToSave) productData.sizes = sizesToSave;
    if (badgesToSave) productData.badges = badgesToSave;

    await Product.create(productData);
    return res.redirect('/admin/products');
  } catch (error) {
    console.error('Error creating product:', error);
    return res.status(500).render('error', { message: 'Internal server error', error });
  }
});

router.get('/admin/products/edit/:productId', async (req, res) => {
  try {
    const product = await Product.findById(req.params.productId);
    if (!product) return res.status(404).render('error', { message: 'Product not found' });
    return res.render('admins/editProduct', { product });
  } catch (error) {
    console.error('Error /admin/products/edit:', error);
    return res.status(500).render('error', { message: 'Internal server error', error });
  }
});

router.post('/admin/products/edit/:productId', async (req, res) => {
  try {
    const { name, description, price, imageUrl, category } = req.body;
    const rawSizes = req.body.sizes ?? req.body.sizesCSV ?? req.body.sizesCsv;
    const rawBadges = req.body.badges ?? req.body.badgesCSV ?? req.body.badgesCsv;

    const toArray = (v) => {
      if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
      if (typeof v === 'string') return v.split(',').map((s) => s.trim()).filter(Boolean);
      return [];
    };

    const sizesPath = Product.schema.path('sizes');
    const badgesPath = Product.schema.path('badges');

    let sizesToSave;
    if (sizesPath && sizesPath.instance === 'Array') sizesToSave = toArray(rawSizes);
    else if (rawSizes !== undefined) sizesToSave = String(rawSizes).trim();

    let badgesToSave;
    if (badgesPath && badgesPath.instance === 'Array') badgesToSave = toArray(rawBadges);
    else if (rawBadges !== undefined) badgesToSave = String(rawBadges).trim();

    const updateData = {
      name: (name ?? '').trim(),
      description: (description ?? '').trim(),
      category: (category ?? '').trim(),
    };

    if (price !== undefined && price !== '') {
      const n = Number(price);
      if (!Number.isNaN(n)) updateData.price = n;
    }

    if (imageUrl) updateData.imageUrl = imageUrl.trim();
    if (sizesToSave) updateData.sizes = sizesToSave;
    if (badgesToSave) updateData.badges = badgesToSave;

    await Product.findByIdAndUpdate(req.params.productId, { $set: updateData }, { new: true, runValidators: true });
    return res.redirect(req.query.redirect || '/admin/products');
  } catch (error) {
    console.error('Error updating product:', error);
    return res.status(500).render('error', { message: 'Internal server error', error });
  }
});

router.post('/admin/products/delete/:productId', async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.productId);
    return res.redirect('/admin/products');
  } catch (error) {
    console.error('Error deleting product:', error);
    return res.status(500).render('error', { message: 'Internal server error', error });
  }
});

export default router;
