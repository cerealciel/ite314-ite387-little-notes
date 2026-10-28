USE sticky_notes;

INSERT INTO categories (name, color)
VALUES
  ('Work', '#70B7EC'),
  ('Personal', '#BC9AE5'),
  ('Urgent', '#F08675')
ON DUPLICATE KEY UPDATE color = VALUES(color);
