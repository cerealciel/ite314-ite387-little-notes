USE sticky_notes;

-- Transactional CRUD example. Run the whole script in one SQL session.
-- The transaction is rolled back at the end so no sample row remains.
SET @example_category_id = (SELECT id FROM categories WHERE name = 'Work' LIMIT 1);

START TRANSACTION;

-- CREATE
INSERT INTO notes (title, body, category_id)
VALUES ('TEMP_CRUD_EXAMPLE', 'Temporary row for the transactional CRUD example.', @example_category_id);
SET @example_note_id = LAST_INSERT_ID();

-- READ
SELECT id, title, body, category_id, created_at
FROM notes
WHERE id = @example_note_id;

-- UPDATE
UPDATE notes
SET title = 'TEMP_CRUD_EXAMPLE_UPDATED',
    body = 'The sample row was updated inside this transaction.'
WHERE id = @example_note_id;

SELECT id, title, body, updated_at
FROM notes
WHERE id = @example_note_id;

-- DELETE (physical deletion occurs only inside this rollback-only example).
DELETE FROM notes WHERE id = @example_note_id;
SELECT COUNT(*) AS rows_after_delete FROM notes WHERE id = @example_note_id;

ROLLBACK;

-- Expected result: zero. Confirms the example transaction did not persist its row.
SELECT COUNT(*) AS persisted_example_rows
FROM notes
WHERE title LIKE 'TEMP_CRUD_EXAMPLE%';
