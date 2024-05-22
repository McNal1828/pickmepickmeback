import { Router } from 'express';
import { createSession } from '../controllers/sessionController.js';

const router = Router();

router.post('/', createSession);

export default router;
