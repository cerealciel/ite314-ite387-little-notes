-- Run as a MySQL/MariaDB administrator after creating the schema and tables.
-- Replace the placeholder with a strong local password before execution.
-- Keep the real password only in backend/.env (which is gitignored).
CREATE USER IF NOT EXISTS 'sticky_app'@'127.0.0.1'
  IDENTIFIED BY 'REPLACE_WITH_A_STRONG_LOCAL_PASSWORD';

-- Remove any broader privileges previously assigned to this account first.
REVOKE ALL PRIVILEGES, GRANT OPTION FROM 'sticky_app'@'127.0.0.1';

-- The app reads categories and notes, creates notes, and updates notes.
-- It soft-deletes notes by UPDATE; it does not need physical DELETE or DDL.
GRANT SELECT ON sticky_notes.categories TO 'sticky_app'@'127.0.0.1';
GRANT SELECT, INSERT, UPDATE ON sticky_notes.notes TO 'sticky_app'@'127.0.0.1';

SHOW GRANTS FOR 'sticky_app'@'127.0.0.1';

-- If this account already exists with another password, set it separately as admin:
-- ALTER USER 'sticky_app'@'127.0.0.1' IDENTIFIED BY 'REPLACE_WITH_A_STRONG_LOCAL_PASSWORD';
-- To remove the account later (this disconnects any app using it):
-- DROP USER 'sticky_app'@'127.0.0.1';
