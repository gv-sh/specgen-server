-- SpecGen Minimal Database Schema Definition
-- Simplified SQLite database schema with essential tables only
-- This file serves as documentation - actual schema is created automatically by services.js

-- Categories table: Fiction categories and genres
CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT DEFAULT '',
  sort_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Parameters table: Configuration parameters for content generation
CREATE TABLE parameters (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  type TEXT NOT NULL CHECK(type IN ('select', 'text', 'number', 'boolean', 'range')),
  category_id TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  parameter_values TEXT, -- JSON array for select options
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

-- Generated content table: All user-generated stories and images
CREATE TABLE generated_content (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL CHECK(length(title) <= 200),
  fiction_content TEXT NOT NULL CHECK(length(fiction_content) <= 50000),
  image_blob BLOB,
  image_thumbnail BLOB,
  prompt_data TEXT, -- JSON object containing all generation parameters
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Settings table: Application configuration and system settings
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  data_type TEXT DEFAULT 'string' CHECK(data_type IN ('string', 'number', 'boolean', 'json'))
);

-- Essential indexes for common queries
CREATE INDEX idx_categories_name ON categories(name);
CREATE INDEX idx_categories_sort_order ON categories(sort_order);

CREATE INDEX idx_parameters_category_id ON parameters(category_id);
CREATE INDEX idx_parameters_type ON parameters(type);
CREATE INDEX idx_parameters_sort_order ON parameters(sort_order);

CREATE INDEX idx_content_created_at ON generated_content(created_at DESC);

-- Insert minimal default settings
INSERT INTO settings (key, value, data_type) VALUES
  ('app_version', '2.0.0', 'string'),
  ('max_content_length', '10000', 'number'),
  ('max_generations_per_session', '50', 'number'),
  ('enable_image_generation', 'true', 'boolean'),
  ('default_fiction_length', 'medium', 'string'),
  ('rate_limit_per_minute', '10', 'number'),
  ('maintenance_mode', 'false', 'boolean');