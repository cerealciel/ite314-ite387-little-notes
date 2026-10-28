USE sticky_notes;

UPDATE categories
SET color = CASE name
  WHEN 'Work' THEN '#70B7EC'
  WHEN 'Personal' THEN '#BC9AE5'
  WHEN 'Urgent' THEN '#F08675'
  ELSE color
END
WHERE name IN ('Work', 'Personal', 'Urgent');
