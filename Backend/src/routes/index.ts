import { Router } from 'express';

export const router = Router();

router.get('/v1/health', (_req, res) => {
  res.status(200).json({ ok: true });
});
