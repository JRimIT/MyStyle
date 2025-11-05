import { Router } from 'express';
import { addToWishlist, removeFromWishlist, getWishlist } from '../controllers/wishlist.controller.js';
const router = Router();

router.get('/', getWishlist);
router.post('/add', addToWishlist);
router.post('/remove', removeFromWishlist);

export default router;
