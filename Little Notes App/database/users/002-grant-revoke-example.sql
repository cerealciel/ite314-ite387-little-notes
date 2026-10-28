-- Run as a database administrator to illustrate GRANT and REVOKE permissions.
-- The app does not need physical DELETE; this temporary grant/revoke example
-- is separate from the app's soft-delete behavior. Run the entire script at once.

GRANT DELETE ON sticky_notes.notes TO 'sticky_app'@'127.0.0.1';
SHOW GRANTS FOR 'sticky_app'@'127.0.0.1';

REVOKE DELETE ON sticky_notes.notes FROM 'sticky_app'@'127.0.0.1';
SHOW GRANTS FOR 'sticky_app'@'127.0.0.1';
