CREATE DATABASE IF NOT EXISTS sticky_notes
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE sticky_notes;

CREATE TABLE IF NOT EXISTS categories (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(30) NOT NULL,
  color CHAR(7) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_categories_name (name),
  CONSTRAINT chk_categories_color CHECK (color REGEXP '^#[0-9A-Fa-f]{6}$')
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS notes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  title VARCHAR(120) NOT NULL,
  body TEXT NOT NULL,
  category_id INT UNSIGNED NOT NULL,
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_notes_active_recent (is_archived, deleted_at, updated_at),
  KEY idx_notes_category_recent (category_id, is_archived, deleted_at, updated_at),
  CONSTRAINT fk_notes_category
    FOREIGN KEY (category_id) REFERENCES categories (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT chk_notes_title_not_blank CHECK (CHAR_LENGTH(TRIM(title)) > 0)
) ENGINE=InnoDB;
