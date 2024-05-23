import { Router } from 'express';
import { createSession, getSession, resetSessionTeam, saveSession } from '../controllers/sessionController.js';

const router = Router();

router.get('/', getSession);
router.post('/', createSession);
router.patch('/', resetSessionTeam);
router.put('/', saveSession);

export default router;
