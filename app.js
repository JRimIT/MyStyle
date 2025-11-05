import express from 'express';
import bodyParser from 'body-parser';
import methodOverride from 'method-override';
import ejs from 'ejs';
import createError from 'http-errors';

import { jwtPassport, verifyAdmin, verifyUser } from './config/jwtConfig.js';
import session from 'express-session';
import sessionConfig from './config/sessionConfig.js';

import authRoute from './routes/auth.route.js';
import productRoute from './routes/product.route.js';
import adminRoute from './routes/admin.route.js';
import staticRoute from './routes/static.route.js';

// ✅ Các route mới cho 7 UC
import reviewRoute from './routes/review.route.js';      // UC-10
import wishlistRoute from './routes/wishlist.route.js';  // UC-41
import checkoutRoute from './routes/checkout.route.js';  // UC-33 (+ UC-17 COD)
import paymentRoute from './routes/payment.route.js';    // UC-18 (VNPay)
import orderRoute from './routes/order.route.js';        // UC-34

const app = express();

// Static & parsers
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(methodOverride('_method'));

// Session & Passport
app.use(session(sessionConfig));
app.use(jwtPassport.initialize());

// View engine
app.engine('ejs', ejs.renderFile);
app.set('view engine', 'ejs');

// Trang chủ hiện tại
app.get('/', (req, res) => {
  res.render('partials/index');
});

// ---------------------------- Routes cũ --------------------------------------
app.use('/', authRoute);
app.use('/', verifyUser, productRoute);
app.use('/', staticRoute);
// TEMPORARILY DISABLED for development
// app.use('/', verifyAdmin, adminRoute);
app.use('/', adminRoute);

// ---------------------------- Routes mới (UC) --------------------------------
app.use('/reviews', verifyUser, reviewRoute);     // UC-10
app.use('/wishlist', verifyUser, wishlistRoute);  // UC-41
app.use('/checkout', verifyUser, checkoutRoute);  // UC-33 (+ UC-17 COD)
app.use('/payment', verifyUser, paymentRoute);    // UC-18
app.use('/orders', orderRoute);                   // UC-34 (public tra cứu)

// ---------------------------- Error handling ---------------------------------
app.use((req, res, next) => next(createError(404)));

app.use((err, req, res, next) => {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error');
});

export default app; // ❗ chỉ export app, KHÔNG listen ở đây
