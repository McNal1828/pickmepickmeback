import { Router } from 'express';
import { getItems, uploadImage } from '../controllers/itemController.js';

const router = Router();

router.get('/', getItems);
router.put('/', uploadImage);
export default router;
