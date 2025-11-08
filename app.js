import express from 'express';
import bodyParser from 'body-parser';
import methodOverride from 'method-override';
import ejs from 'ejs';
import path from 'path';
import createError from 'http-errors';
import session from 'express-session';
import { fileURLToPath } from 'url';

import { jwtPassport, verifyAdmin, verifyUser } from './config/jwtConfig.js';
import sessionConfig from './config/sessionConfig.js';

// Routes
import authRoute from './routes/auth.route.js';
import productRoute from './routes/product.route.js';
import publicRoute from './routes/public.route.js';
import adminRoute from './routes/admin.route.js';
import staticRoute from './routes/static.route.js';
import contactRoutes from './routes/contact.route.js';
import cartRoutes from './routes/cart.routes.js';


// ===== ESM __dirname setup =====
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const app = express();

// ===== Core middlewares =====
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(methodOverride('_method'));
app.use(session(sessionConfig));
app.use(jwtPassport.initialize());

// ===== View engine =====
app.engine('ejs', ejs.renderFile);
app.set('view engine', 'ejs');
// Đảm bảo trỏ đúng thư mục views
app.set('views', path.join(__dirname, 'views'));

// ===== Logger để debug luồng request =====
app.use((req, res, next) => {
  console.log('[REQ]', req.method, req.originalUrl);
  next();
});

// ===== API routes đặt TRƯỚC các route "/" =====
app.use('/api/cart', cartRoutes);

// ===== App routes =====
app.get('/', (req, res) => {
  res.render('partials/index');
});

// 👉 Route RENDER TRANG CART (view) — đây là nơi bạn mở Cart.ejs
app.get('/cart', (req, res) => {
  // Truyền user để navbar không lỗi (có thể null)
  res.render('pages/Cart', { user: req.session?.user || null });
});

app.use('/', authRoute);
// public routes (no auth) - pages like /menu and product listing API
app.use('/', publicRoute);

app.use('/', verifyUser, productRoute);
app.use('/', staticRoute);
app.use('/', contactRoutes);
// TEMPORARILY DISABLED for development
// app.use('/', verifyAdmin, adminRoute);
app.use('/', adminRoute);


// ===== 404 cuối cùng =====
app.use((req, res, next) => {
  console.log('[404] Not Found:', req.method, req.originalUrl);
  next(createError(404, `Not Found: ${req.originalUrl}`));
});

// ===== Error handler =====
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // Nếu là request API thì trả JSON
  if (req.originalUrl.startsWith('/api/')) {
    return res.status(err.status || 500).json({ error: err.message });
  }

  // Còn lại render trang lỗi
  res.status(err.status || 500);
  res.render('error');
});

export default app;
