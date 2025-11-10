import express from 'express';
import bodyParser from 'body-parser';
import methodOverride from 'method-override';
import ejs from 'ejs';
import path from 'path';
import createError from 'http-errors';

import { jwtPassport, verifyAdmin, verifyUser } from './config/jwtConfig.js';
import session from 'express-session';
import sessionConfig from './config/sessionConfig.js';
import { connectToMongoDB } from './db/connectToMongoDB.js';

import authRoute from './routes/auth.route.js';
import productRoute from './routes/product.route.js';
import publicRoute from './routes/public.route.js';
import adminRoute from './routes/admin.route.js';
import staticRoute from './routes/static.route.js';
import contactRoutes from './routes/contact.route.js';
import cartRoute from './routes/cart.route.js';
import orderRoute from './routes/order.route.js';
import categoryRoute from './routes/category.route.js';
import promotionRoute from './routes/promotion.route.js';
import voucherRoute from './routes/voucher.route.js';
import productCrudRoutes from './routes/productCrud.route.js';

const app = express();

// ===== Core middlewares =====
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(methodOverride('_method'));

app.use(session(sessionConfig));
app.use(jwtPassport.initialize());

// Middleware to extract user from session token (optional)
app.use((req, res, next) => {
    if (req.session && req.session.token) {
        try {
            const decoded = jwt.verify(req.session.token, process.env.JWT_SECRET);
            req.user = decoded;
        } catch (err) {
            // Token invalid or expired, continue without user
            req.user = null;
        }
    }
    next();
});

// ===== View engine =====
app.engine('ejs', ejs.renderFile);
app.set('view engine', 'ejs');

// ===== Logger để debug luồng request =====
app.use((req, res, next) => {
    console.log('[REQ]', req.method, req.originalUrl);
    next();
});

// ===== App routes =====
app.get('/', (req, res) => {
    res.render('partials/index');
});
app.use('/', authRoute);
app.use('/', publicRoute);
app.use('/', verifyUser, productRoute);
app.use('/', staticRoute);
app.use('/', contactRoutes);
app.use('/', verifyAdmin, adminRoute);
app.use('/', verifyUser, orderRoute);
app.use('/api/cart', verifyUser, cartRoute);
app.use('/api', categoryRoute);
app.use('/api', promotionRoute);
app.use('/api', voucherRoute);
app.use('/productCrud', productCrudRoutes);

// 👉 Route RENDER TRANG CART (view) — đây là nơi bạn mở Cart.ejs
app.get('/cart', (req, res) => {
    // Truyền user để navbar không lỗi (có thể null)
    res.render('pages/Cart', { user: req.session?.user || null });
});
// catch 404
app.use((req, res, next) => {
    next(createError(404));
});
// ===== 404 cuối cùng =====
app.use((req, res, next) => {
    // If it's an API route, return JSON instead of rendering error page
    if (req.path.startsWith('/api/') || req.path.startsWith('/cart/')) {
        return res.status(404).json({
            success: false,
            message: 'Route not found',
            path: req.path,
        });
    }
    next(createError(404));
});
// error handler
app.use((err, req, res, next) => {
    // If it's an API route, return JSON error
    if (req.path.startsWith('/api/') || req.path.startsWith('/cart/')) {
        return res.status(err.status || 500).json({
            success: false,
            message: err.message || 'Internal server error',
            error: req.app.get('env') === 'development' ? err.stack : {},
        });
    }

    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};
    res.status(err.status || 500);
    res.render('error');
});

export default app;
// Server start
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    connectToMongoDB();
    console.log(`Server started on port http://localhost:${PORT}`);
});
