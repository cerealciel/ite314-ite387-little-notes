import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import pool from './config/database.js';
import categoriesRouter from './routes/categories.js';
import notesRouter from './routes/notes.js';
import { errorHandler, notFound } from './middleware/error-handler.js';

const app = express();
const port = Number(process.env.PORT || 3001);

const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', async (_request, response) => {
  try {
    await pool.query('SELECT 1');
    response.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    console.error('Database health check failed:', error.code || error.name || 'Error');
    response.status(503).json({ status: 'error', message: 'Database is unavailable' });
  }
});

app.use('/api/categories', categoriesRouter);
app.use('/api/notes', notesRouter);
app.use(notFound);
app.use(errorHandler);

app.listen(port, () => {
  console.log(`Sticky Notes API listening on http://localhost:${port}`);
});
