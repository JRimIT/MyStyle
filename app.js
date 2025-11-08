import express from 'express';
import bodyParser from 'body-parser';
import methodOverride from 'method-override';
import ejs from 'ejs';
import path from 'path';
import createError from 'http-errors';



import { jwtPassport, verifyAdmin, verifyUser } from './config/jwtConfig.js';
import session from 'express-session';
import sessionConfig from './config/sessionConfig.js';

import authRoute from './routes/auth.route.js';
import productRoute from './routes/product.route.js';
import publicRoute from './routes/public.route.js';
import adminRoute from './routes/admin.route.js';
import staticRoute from './routes/static.route.js';


const app = express();
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(methodOverride('_method'));

app.use(session(sessionConfig));

app.use(jwtPassport.initialize());

app.engine('ejs', ejs.renderFile);
app.set('view engine', 'ejs');

app.get('/', async (req, res) => {
    res.render('partials/index');
});

app.use('/', authRoute);
// public routes (no auth) - pages like /menu and product listing API
app.use('/', publicRoute);

app.use('/', verifyUser, productRoute);
app.use('/', staticRoute);

// TEMPORARILY DISABLED for development
// app.use('/', verifyAdmin, adminRoute);
app.use('/', adminRoute);

// catch 404
app.use((req, res, next) => {
    next(createError(404));
});

// error handler
app.use((err, req, res, next) => {
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};
    res.status(err.status || 500);
    res.render('error');
});

export default app;
