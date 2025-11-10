import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import axios from 'axios';
import https from 'https';
import User from '../models/user.model.js';
import Product from '../models/product.model.js';
import { verifyUser } from '../config/jwtConfig.js';
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

// Multer config for image upload
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    },
});
const upload = multer({ storage });

router.get('/admin/Home', (req, res) => {
    res.render('admins/Home', { user: req.user });
});

router.get('/admin/manageUser', async (req, res) => {
    try {
        const users = await User.find({});
        res.render('admins/manageUser', { users });
    } catch (error) {
        console.error('Error /admin/manageUser:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

router.get('/admin/users/edit/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        const user = await User.findById(userId);

        res.render('admins/manageUserEdit', { user });
    } catch (error) {
        console.error('Error /admin/users/edit/:userId: ', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

router.post('/admin/users/edit/:userId', async (req, res) => {
    try {
        const { username, role } = req.body;
        const userId = req.params.userId;
        const user = await User.findByIdAndUpdate(userId, {
            $set: { username: username, role: role },
        });

        res.redirect('/admin/manageUser');
    } catch (error) {
        console.error('Error /admin/users/edit/:userId: ', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

router.post('/admin/users/delete/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;

        await User.findByIdAndDelete(userId);
        res.redirect('/admin/manageUser');
    } catch (error) {
        console.error('Error //admin/users/delete: ', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Admin: View and manage all orders
router.get('/admin/orders', async (req, res) => {
    try {
        const orders = await Order.find({})
            .populate('userId', 'username')
            .populate('items.productId', 'name price imageUrl');
        res.render('admins/manageOrders', { orders });
    } catch (error) {
        console.error('Error /admin/orders:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Admin: Update order status
router.post('/admin/orders/update/:orderId', async (req, res) => {
    try {
        const { status } = req.body;
        await Order.findByIdAndUpdate(req.params.orderId, { status });
        res.redirect('/admin/orders');
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Admin: List all products
router.get('/admin/products', async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '', category = '', active } = req.query;

        const result = await listProducts({ page, limit, search, category, active });

        // baseUrl cho phân trang (không chứa page)
        const qs = new URLSearchParams();
        qs.set('limit', result.limit);
        if (search) qs.set('search', search);
        if (category) qs.set('category', category);
        if (typeof active !== 'undefined') qs.set('active', active);
        const baseUrl = `/admin/products?${qs.toString()}`;

        res.render('admins/manageProducts', {
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
        res.status(500).render('error', { message: 'Failed to load products', error: err });
    }
});
// Admin: Show create product form
router.get('/admin/products/create', (req, res) => {
    res.render('admins/createProduct');
});

// Admin: Handle product creation
router.post('/admin/products/create', async (req, res) => {
    try {
        // debug incoming body
        console.log('POST /admin/products/create - raw body:', req.body);

        const { name, description, price, imageUrl, category } = req.body;
        const rawSizes = req.body.sizes;
        const rawBadges = req.body.badges;

        // helper to produce array from CSV/string/array
        const toArray = (v) => {
            if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
            if (typeof v === 'string')
                return v
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean);
            return [];
        };

        // detect schema expectation: Array or String
        const sizesPath = Product.schema.path('sizes');
        const badgesPath = Product.schema.path('badges');

        let sizesToSave;
        if (sizesPath && sizesPath.instance === 'Array') {
            sizesToSave = toArray(rawSizes);
        } else {
            // store as single string (join if array)
            if (Array.isArray(rawSizes))
                sizesToSave = rawSizes
                    .map((x) => String(x).trim())
                    .filter(Boolean)
                    .join(',');
            else sizesToSave = rawSizes !== undefined ? String(rawSizes).trim() : undefined;
        }

        let badgesToSave;
        if (badgesPath && badgesPath.instance === 'Array') {
            badgesToSave = toArray(rawBadges);
        } else {
            if (Array.isArray(rawBadges))
                badgesToSave = rawBadges
                    .map((x) => String(x).trim())
                    .filter(Boolean)
                    .join(',');
            else badgesToSave = rawBadges !== undefined ? String(rawBadges).trim() : undefined;
        }

        const productData = { name, description, price, imageUrl, category };
        if (typeof sizesToSave !== 'undefined') productData.sizes = sizesToSave;
        if (typeof badgesToSave !== 'undefined') productData.badges = badgesToSave;

        console.log('POST /admin/products/create - normalized to save:', productData);

        const created = await Product.create(productData);
        console.log('POST /admin/products/create - saved:', created);
        res.redirect('/admin/products');
    } catch (error) {
        console.error('Error creating product:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
// Admin: Show edit product form
router.get('/admin/products/edit/:productId', async (req, res) => {
    try {
        const product = await Product.findById(req.params.productId);
        res.render('admins/editProduct', { product });
    } catch (error) {
        console.error('Error /admin/products/edit:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Admin: Handle product update
router.post('/admin/products/edit/:productId', async (req, res) => {
    try {
        // debug body
        console.log('POST /admin/products/edit - raw body:', req.body);

        const { name, description, price, imageUrl, category } = req.body;
        const rawSizes = req.body.sizes ?? req.body.sizesCSV ?? req.body.sizesCsv;
        const rawBadges = req.body.badges ?? req.body.badgesCSV ?? req.body.badgesCsv;

        // helper CSV -> array
        const toArray = (v) => {
            if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
            if (typeof v === 'string')
                return v
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean);
            return [];
        };

        // dò schema để lưu đúng kiểu
        const sizesPath = Product.schema.path('sizes');
        const badgesPath = Product.schema.path('badges');

        let sizesToSave;
        if (sizesPath && sizesPath.instance === 'Array') {
            sizesToSave = toArray(rawSizes);
        } else if (rawSizes !== undefined) {
            sizesToSave = Array.isArray(rawSizes)
                ? rawSizes
                      .map((x) => String(x).trim())
                      .filter(Boolean)
                      .join(',')
                : String(rawSizes).trim();
        }

        let badgesToSave;
        if (badgesPath && badgesPath.instance === 'Array') {
            badgesToSave = toArray(rawBadges);
        } else if (rawBadges !== undefined) {
            badgesToSave = Array.isArray(rawBadges)
                ? rawBadges
                      .map((x) => String(x).trim())
                      .filter(Boolean)
                      .join(',')
                : String(rawBadges).trim();
        }

        // build update doc
        const updateData = {
            name: (name ?? '').trim(),
            description: (description ?? '').trim(),
            category: (category ?? '').trim(),
        };

        // ép số price nếu hợp lệ
        if (price !== undefined && price !== '') {
            const n = Number(price);
            if (!Number.isNaN(n)) updateData.price = n;
        }

        // imageUrl nếu có
        if (imageUrl) updateData.imageUrl = imageUrl.trim();

        // gán sizes/badges nếu có trong body
        if (typeof sizesToSave !== 'undefined') updateData.sizes = sizesToSave;
        if (typeof badgesToSave !== 'undefined') updateData.badges = badgesToSave;

        console.log('POST /admin/products/edit - normalized update:', updateData);

        await Product.findByIdAndUpdate(req.params.productId, { $set: updateData }, { new: true, runValidators: true });

        const redirectTo = req.query.redirect || '/admin/products';
        res.redirect(redirectTo);
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Admin: Delete product
router.post('/admin/products/delete/:productId', async (req, res) => {
    try {
        await Product.findByIdAndDelete(req.params.productId);
        res.redirect('/admin/products');
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

export default router;
