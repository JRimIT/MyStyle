import { Router } from 'express';
import { trackOrder } from '../controllers/order.controller.js';
const router = Router();

router.get('/track', trackOrder);

export default router;
