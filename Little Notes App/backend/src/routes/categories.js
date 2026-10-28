import { Router } from 'express';
import pool from '../config/database.js';
import { asyncRoute } from '../middleware/async-route.js';

const router = Router();

router.get('/', asyncRoute(async (_request, response) => {
  const [categories] = await pool.execute(
    'SELECT id, name, color FROM categories ORDER BY id ASC',
  );
  response.json({ categories });
}));

export default router;
