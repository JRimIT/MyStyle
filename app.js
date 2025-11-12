import express from 'express';
import bodyParser from 'body-parser';
import methodOverride from 'method-override';
import ejs from 'ejs';
import path from 'path';
import createError from 'http-errors';
import jwt from 'jsonwebtoken';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { jwtPassport, verifyAdmin, verifyUser } from './config/jwtConfig.js';
import session from 'express-session';
import sessionConfig from './config/sessionConfig.js';
import { connectToMongoDB } from './db/connectToMongoDB.js';

import authRoute from './routes/auth.route.js';
import productRoute from './routes/product.route.js';
import staticRoute from './routes/static.route.js';
import categoryRoute from './routes/category.route.js';
import cartRoute from './routes/cart.route.js';
import orderRouter from './routes/order.route.js';
import adminRoute from './routes/admin.route.js';
import contactRoutes from './routes/contact.route.js';
// API routes
import promotionRoute from './routes/promotion.route.js';
import voucherRoute from './routes/voucher.route.js';
import wishlistRoute from './routes/wishlist.route.js';
import imageProxyRoute from './routes/imageproxy.route.js';
import reviewRouter from './routes/review.route.js';
// VNPay
import vnpayRouter from './routes/vnpay.route.js';
import { vnpayReturn } from './controllers/order.web.controller.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config();
const app = express();

/* ───────── Net / Proxy ───────── */
app.set('trust proxy', true);

/* ───────── Static & Parsers ───────── */
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(methodOverride('_method'));

/* ───────── Sessions & Passport ───────── */
app.use(session(sessionConfig)); // phải trước khi dùng req.session
app.use(jwtPassport.initialize());

/* ───────── View engine ───────── */
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

/* ───────── Attach user từ session token (optional) ───────── */
app.use((req, _res, next) => {
    if (req.session && req.session.token) {
        try {
            const decoded = jwt.verify(req.session.token, process.env.JWT_SECRET);
            req.user = decoded;
        } catch {
            req.user = null;
        }
    }
    next();
});

/* ───────── res.locals cho EJS ───────── */
app.use((req, res, next) => {
    const u = req.session.user || req.user || null;
    res.locals.user = u;
    res.locals.currentUser = u;

    res.locals.flash = req.session.flash || null;
    delete req.session.flash;

    if (typeof res.locals.listFeatureFood === 'undefined') {
        res.locals.listFeatureFood = [];
    }
    next();
});

// app.get('/', (req, res) => {
//     res.render('partials/index');
// });

/* ───────── Health check ───────── */
app.get('/healthz', (_req, res) => res.status(200).send('ok'));

/* ───────── Web pages ───────── */
app.get('/', (_req, res) => res.render('pages/Home'));
app.get('/vnpay/return', vnpayReturn); // VNPay redirect về đây

// Web routes
app.use('/', authRoute);
app.use('/', productRoute);
app.use('/', staticRoute);
app.use('/', cartRoute);
app.use('/', orderRouter);
app.use('/', contactRoutes);
// API routes
app.use('/api', reviewRouter);
app.use('/api', categoryRoute);
app.use('/api', promotionRoute);
app.use('/vouchers', voucherRoute);
app.use('/', wishlistRoute);
app.use('/', imageProxyRoute);
app.use('/', adminRoute);

// VNPay (tạo link, IPN nếu có)
app.use('/vnpay', vnpayRouter);

/* ───────── Dev: in danh sách routes ───────── */
if ((process.env.NODE_ENV || 'development') === 'development') {
    try {
        const dumpRoutes = () => {
            const routes = [];
            const stack = app._router?.stack || [];
            for (const layer of stack) {
                if (layer.route?.path) {
                    const methods = Object.keys(layer.route.methods)
                        .map((m) => m.toUpperCase())
                        .join(',');
                    routes.push(`${methods} ${layer.route.path}`);
                } else if (layer.name === 'router' && layer.handle?.stack) {
                    const mount = (layer.regexp?.source || '')
                        .replace('^\\/', '/')
                        .replace('\\/?(?=\\/|$)', '')
                        .replace('\\/', '/')
                        .replace('\\.', '.')
                        .replace('\\', '')
                        .replace(/\$$/, '');
                    for (const r of layer.handle.stack) {
                        if (r.route?.path) {
                            const methods = Object.keys(r.route.methods)
                                .map((m) => m.toUpperCase())
                                .join(',');
                            routes.push(`${methods} ${mount}${r.route.path}`);
                        }
                    }
                }
            }
            console.log('=== ROUTES ===');
            routes.sort().forEach((r) => console.log(r));
            console.log('================');
        };
        dumpRoutes();
    } catch {
        /* ignore */
    }
}

/* ───────── 404 Handler ───────── */
app.use((req, res) => {
    if (req.path.startsWith('/api/') || req.path.startsWith('/cart/')) {
        return res.status(404).json({ success: false, message: 'Route not found', path: req.path });
    }
    console.warn('404 Web:', req.method, req.path);
    return res.redirect('/');
});

/* ───────── Error Handler ───────── */
app.use((err, req, res, _next) => {
    if (req.path.startsWith('/api/') || req.path.startsWith('/cart/')) {
        return res.status(err.status || 500).json({
            success: false,
            message: err.message || 'Internal server error',
            error: req.app.get('env') === 'development' ? err.stack : {},
        });
    }
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};
    res.status(err.status || 500).render('error');
});

export default app;

// Server start
// const PORT = process.env.PORT || 4000;
// app.listen(PORT, () => {
//     connectToMongoDB();
//     console.log(`Server started on port http://localhost:${PORT}`);
// });
