USE sticky_notes;

-- Query examples for Little Notes.
-- The sample search values are easy to change before running the queries.
SET @search_term = 'project';
SET @work_category_id = (SELECT id FROM categories WHERE name = 'Work' LIMIT 1);

-- 1. INNER JOIN: the application combines each note with its category label/color.
SELECT n.id, n.title, c.name AS category, c.color AS category_color,
       n.is_pinned, n.is_archived, n.created_at, n.updated_at
FROM notes AS n
INNER JOIN categories AS c ON c.id = n.category_id
WHERE n.deleted_at IS NULL
ORDER BY n.is_pinned DESC, n.updated_at DESC
LIMIT 50;

-- 2. Filter/search query: category plus title/body search.
-- The API uses parameterized values for these conditions.
SELECT n.id, n.title, c.name AS category, n.updated_at
FROM notes AS n
INNER JOIN categories AS c ON c.id = n.category_id
WHERE n.is_archived = FALSE
  AND n.deleted_at IS NULL
  AND n.category_id = @work_category_id
  AND (n.title LIKE CONCAT('%', @search_term, '%')
       OR n.body LIKE CONCAT('%', @search_term, '%'))
ORDER BY n.is_pinned DESC, n.updated_at DESC;

-- 3. UNION ALL: show one combined list of active, archived, and trashed notes.
SELECT n.id, n.title, c.name AS category, 'active' AS note_state,
       n.is_pinned, n.updated_at
FROM notes AS n
INNER JOIN categories AS c ON c.id = n.category_id
WHERE n.is_archived = FALSE AND n.deleted_at IS NULL
UNION ALL
SELECT n.id, n.title, c.name AS category, 'archived' AS note_state,
       n.is_pinned, n.updated_at
FROM notes AS n
INNER JOIN categories AS c ON c.id = n.category_id
WHERE n.is_archived = TRUE AND n.deleted_at IS NULL
UNION ALL
SELECT n.id, n.title, c.name AS category, 'trash' AS note_state,
       n.is_pinned, n.updated_at
FROM notes AS n
INNER JOIN categories AS c ON c.id = n.category_id
WHERE n.deleted_at IS NOT NULL
ORDER BY updated_at DESC, id DESC;

-- 4. LEFT JOIN plus aggregation: keep categories visible even when they have no notes.
SELECT c.id, c.name AS category,
       COUNT(n.id) AS total_notes,
       SUM(CASE WHEN n.id IS NOT NULL AND n.is_archived = FALSE AND n.deleted_at IS NULL THEN 1 ELSE 0 END) AS active_notes,
       SUM(CASE WHEN n.id IS NOT NULL AND n.is_archived = TRUE AND n.deleted_at IS NULL THEN 1 ELSE 0 END) AS archived_notes,
       SUM(CASE WHEN n.id IS NOT NULL AND n.deleted_at IS NOT NULL THEN 1 ELSE 0 END) AS trashed_notes
FROM categories AS c
LEFT JOIN notes AS n ON n.category_id = c.id
GROUP BY c.id, c.name
ORDER BY c.id;

-- 5. Correlated subquery: find categories that have at least one pinned active note.
SELECT c.id, c.name AS category
FROM categories AS c
WHERE EXISTS (
  SELECT 1
  FROM notes AS n
  WHERE n.category_id = c.id
    AND n.is_pinned = TRUE
    AND n.is_archived = FALSE
    AND n.deleted_at IS NULL
)
ORDER BY c.name;

-- 6. EXPLAIN: inspect the composite index used for category-scoped recent notes.
-- Expected relevant index: idx_notes_category_recent. The optimizer may choose
-- another plan when the table is very small; record the actual EXPLAIN output.
EXPLAIN
SELECT n.id, n.title, n.updated_at
FROM notes AS n
WHERE n.category_id = @work_category_id
  AND n.is_archived = FALSE
  AND n.deleted_at IS NULL
ORDER BY n.updated_at DESC
LIMIT 50;

-- Show the declared indexes and their column order for reference.
SHOW INDEX FROM notes;
