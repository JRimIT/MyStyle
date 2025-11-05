import { Router } from 'express';
import { createReview } from '../controllers/review.controller.js';
const router = Router();

router.post('/', createReview); // body: { userId, productId, rating, content }
export default router;
