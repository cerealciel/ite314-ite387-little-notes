import { Router } from 'express';
import pool from '../config/database.js';
import { asyncRoute } from '../middleware/async-route.js';

const router = Router();
const noteSelect = `
  SELECT n.id, n.title, n.body, n.category_id AS categoryId,
         c.name AS categoryName, c.color AS categoryColor,
         n.is_pinned AS isPinned, n.is_archived AS isArchived,
         n.created_at AS createdAt, n.updated_at AS updatedAt,
         n.deleted_at AS deletedAt
  FROM notes n
  JOIN categories c ON c.id = n.category_id
`;

function parseId(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function validateNote(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return 'Send a JSON object with title, body, and categoryId.';
  }
  if (typeof payload.title !== 'string' || payload.title.trim().length === 0) {
    return 'Title is required.';
  }
  if (payload.title.trim().length > 120) {
    return 'Title must be 120 characters or fewer.';
  }
  if (typeof payload.body !== 'string') {
    return 'Body must be text.';
  }
  if (!Number.isSafeInteger(payload.categoryId) || payload.categoryId <= 0) {
    return 'Choose a valid category.';
  }
  return null;
}

async function categoryExists(categoryId) {
  const [rows] = await pool.execute('SELECT id FROM categories WHERE id = ?', [categoryId]);
  return rows.length > 0;
}

async function getActiveNote(id) {
  const [rows] = await pool.execute(`${noteSelect} WHERE n.id = ? AND n.deleted_at IS NULL`, [id]);
  return rows[0] || null;
}

router.get('/', asyncRoute(async (request, response) => {
  const view = request.query.view || 'active';
  const viewConditions = {
    active: 'n.is_archived = FALSE AND n.deleted_at IS NULL',
    archived: 'n.is_archived = TRUE AND n.deleted_at IS NULL',
    trash: 'n.deleted_at IS NOT NULL',
  };
  if (!Object.hasOwn(viewConditions, view)) {
    return response.status(400).json({ message: 'view must be active, archived, or trash.' });
  }

  const sortColumns = { updatedAt: 'n.updated_at', createdAt: 'n.created_at', title: 'n.title' };
  const sort = request.query.sort || 'updatedAt';
  if (!Object.hasOwn(sortColumns, sort)) {
    return response.status(400).json({ message: 'sort must be updatedAt, createdAt, or title.' });
  }
  const order = (request.query.order || 'desc').toLowerCase();
  if (!['asc', 'desc'].includes(order)) {
    return response.status(400).json({ message: 'order must be asc or desc.' });
  }

  const limit = request.query.limit === undefined ? 50 : Number(request.query.limit);
  const offset = request.query.offset === undefined ? 0 : Number(request.query.offset);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100 || !Number.isInteger(offset) || offset < 0) {
    return response.status(400).json({ message: 'limit must be 1–100 and offset must be zero or greater.' });
  }

  const conditions = [viewConditions[view]];
  const parameters = [];
  if (request.query.categoryId !== undefined) {
    const categoryId = parseId(request.query.categoryId);
    if (!categoryId) return response.status(400).json({ message: 'categoryId must be a positive integer.' });
    conditions.push('n.category_id = ?');
    parameters.push(categoryId);
  }
  if (request.query.q !== undefined) {
    if (typeof request.query.q !== 'string' || request.query.q.length > 200) {
      return response.status(400).json({ message: 'q must be text of 200 characters or fewer.' });
    }
    const term = `%${request.query.q.trim()}%`;
    conditions.push('(n.title LIKE ? OR n.body LIKE ?)');
    parameters.push(term, term);
  }

  const sql = `${noteSelect}
    WHERE ${conditions.join(' AND ')}
    ORDER BY ${view === 'active' ? 'n.is_pinned DESC, ' : ''}${sortColumns[sort]} ${order.toUpperCase()}, n.id DESC
    LIMIT ? OFFSET ?`;
  parameters.push(limit, offset);
  const [notes] = await pool.execute(sql, parameters);
  response.json({ notes, pagination: { limit, offset } });
}));

router.get('/:id', asyncRoute(async (request, response) => {
  const id = parseId(request.params.id);
  if (!id) return response.status(400).json({ message: 'Note id must be a positive integer.' });
  const note = await getActiveNote(id);
  if (!note) return response.status(404).json({ message: 'Note not found.' });
  response.json({ note });
}));

router.post('/', asyncRoute(async (request, response) => {
  const validationError = validateNote(request.body);
  if (validationError) return response.status(422).json({ message: validationError });
  const title = request.body.title.trim();
  const { body, categoryId } = request.body;
  if (!await categoryExists(categoryId)) {
    return response.status(422).json({ message: 'Choose an existing category.' });
  }
  const [result] = await pool.execute(
    'INSERT INTO notes (title, body, category_id) VALUES (?, ?, ?)',
    [title, body, categoryId],
  );
  const note = await getActiveNote(result.insertId);
  response.status(201).json({ note });
}));

router.put('/:id', asyncRoute(async (request, response) => {
  const id = parseId(request.params.id);
  if (!id) return response.status(400).json({ message: 'Note id must be a positive integer.' });
  const validationError = validateNote(request.body);
  if (validationError) return response.status(422).json({ message: validationError });
  const title = request.body.title.trim();
  const { body, categoryId } = request.body;
  if (!await categoryExists(categoryId)) {
    return response.status(422).json({ message: 'Choose an existing category.' });
  }
  const [result] = await pool.execute(
    `UPDATE notes SET title = ?, body = ?, category_id = ?
     WHERE id = ? AND deleted_at IS NULL`,
    [title, body, categoryId, id],
  );
  if (result.affectedRows === 0) return response.status(404).json({ message: 'Note not found.' });
  const note = await getActiveNote(id);
  response.json({ note });
}));

router.patch('/:id', asyncRoute(async (request, response) => {
  const id = parseId(request.params.id);
  if (!id) return response.status(400).json({ message: 'Note id must be a positive integer.' });
  if (!request.body || typeof request.body !== 'object' || Array.isArray(request.body)) {
    return response.status(422).json({ message: 'Send isPinned and/or isArchived as booleans.' });
  }

  const updates = [];
  const parameters = [];
  for (const [field, column] of [['isPinned', 'is_pinned'], ['isArchived', 'is_archived']]) {
    if (!Object.hasOwn(request.body, field)) continue;
    if (typeof request.body[field] !== 'boolean') {
      return response.status(422).json({ message: `${field} must be true or false.` });
    }
    updates.push(`${column} = ?`);
    parameters.push(request.body[field]);
  }
  if (updates.length === 0) {
    return response.status(422).json({ message: 'Provide isPinned and/or isArchived.' });
  }

  parameters.push(id);
  const [result] = await pool.execute(
    `UPDATE notes SET ${updates.join(', ')} WHERE id = ? AND deleted_at IS NULL`,
    parameters,
  );
  if (result.affectedRows === 0) return response.status(404).json({ message: 'Note not found.' });
  const note = await getActiveNote(id);
  response.json({ note });
}));

router.delete('/:id', asyncRoute(async (request, response) => {
  const id = parseId(request.params.id);
  if (!id) return response.status(400).json({ message: 'Note id must be a positive integer.' });
  const [result] = await pool.execute(
    'UPDATE notes SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL AND is_pinned = FALSE',
    [id],
  );
  if (result.affectedRows === 0) {
    const [rows] = await pool.execute(
      'SELECT is_pinned AS isPinned FROM notes WHERE id = ? AND deleted_at IS NULL',
      [id],
    );
    if (rows[0]?.isPinned) {
      return response.status(409).json({ message: 'Unpin this note before moving it to Trash.' });
    }
    return response.status(404).json({ message: 'Note not found.' });
  }
  response.json({ message: 'Note moved to trash.', id });
}));

router.post('/:id/restore', asyncRoute(async (request, response) => {
  const id = parseId(request.params.id);
  if (!id) return response.status(400).json({ message: 'Note id must be a positive integer.' });
  const [result] = await pool.execute(
    'UPDATE notes SET deleted_at = NULL WHERE id = ? AND deleted_at IS NOT NULL',
    [id],
  );
  if (result.affectedRows === 0) return response.status(404).json({ message: 'Deleted note not found.' });
  const note = await getActiveNote(id);
  response.json({ note });
}));

export default router;
