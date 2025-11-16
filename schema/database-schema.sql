-- SpecGen Database Schema Definition
-- Complete SQLite database schema with tables, indexes, and constraints
-- This file serves as documentation - actual schema is created automatically by services.js

-- Categories table: Fiction categories and genres
CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT DEFAULT '',
  visibility TEXT DEFAULT 'Show' CHECK(visibility IN ('Show', 'Hide')),
  year INTEGER,
  sort_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Parameters table: Configuration parameters for content generation
CREATE TABLE parameters (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  type TEXT NOT NULL CHECK(type IN ('select', 'text', 'number', 'boolean', 'range')),
  visibility TEXT DEFAULT 'Basic' CHECK(visibility IN ('Basic', 'Advanced', 'Hide')),
  category_id TEXT NOT NULL,
  required INTEGER DEFAULT 0 CHECK(required IN (0, 1)),
  sort_order INTEGER DEFAULT 0,
  parameter_values TEXT, -- JSON array for select options
  parameter_config TEXT, -- JSON object for additional configuration
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

-- Generated content table: All user-generated stories, images, and combined content
CREATE TABLE generated_content (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content_type TEXT NOT NULL CHECK(content_type IN ('fiction', 'image', 'combined')),
  fiction_content TEXT,
  image_url TEXT,
  image_prompt TEXT,
  prompt_data TEXT, -- JSON object containing all generation parameters
  metadata TEXT, -- JSON object for additional metadata
  generation_time INTEGER DEFAULT 0, -- Time taken in milliseconds
  word_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'completed' CHECK(status IN ('pending', 'generating', 'completed', 'failed')),
  error_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Settings table: Application configuration and system settings
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  data_type TEXT DEFAULT 'string' CHECK(data_type IN ('string', 'number', 'boolean', 'json')),
  description TEXT DEFAULT '',
  is_system INTEGER DEFAULT 0 CHECK(is_system IN (0, 1)),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- User sessions table: Track user sessions for analytics
CREATE TABLE user_sessions (
  id TEXT PRIMARY KEY,
  session_start DATETIME DEFAULT CURRENT_TIMESTAMP,
  session_end DATETIME,
  requests_count INTEGER DEFAULT 0,
  ip_address TEXT,
  user_agent TEXT,
  last_activity DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Generation logs table: Track all generation attempts for analytics and debugging
CREATE TABLE generation_logs (
  id TEXT PRIMARY KEY,
  session_id TEXT,
  content_id TEXT,
  generation_type TEXT NOT NULL,
  parameters_used TEXT, -- JSON object
  success INTEGER DEFAULT 1 CHECK(success IN (0, 1)),
  error_details TEXT,
  processing_time INTEGER DEFAULT 0,
  api_tokens_used INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES user_sessions(id) ON DELETE SET NULL,
  FOREIGN KEY (content_id) REFERENCES generated_content(id) ON DELETE CASCADE
);

-- Performance indexes for common queries
CREATE INDEX idx_categories_name ON categories(name);
CREATE INDEX idx_categories_visibility ON categories(visibility);
CREATE INDEX idx_categories_sort_order ON categories(sort_order);

CREATE INDEX idx_parameters_category_id ON parameters(category_id);
CREATE INDEX idx_parameters_type ON parameters(type);
CREATE INDEX idx_parameters_visibility ON parameters(visibility);
CREATE INDEX idx_parameters_sort_order ON parameters(sort_order);

CREATE INDEX idx_content_type ON generated_content(content_type);
CREATE INDEX idx_content_created_at ON generated_content(created_at DESC);
CREATE INDEX idx_content_status ON generated_content(status);
CREATE INDEX idx_content_word_count ON generated_content(word_count);

CREATE INDEX idx_settings_type ON settings(data_type);
CREATE INDEX idx_settings_system ON settings(is_system);

CREATE INDEX idx_sessions_start ON user_sessions(session_start DESC);
CREATE INDEX idx_sessions_activity ON user_sessions(last_activity DESC);

CREATE INDEX idx_logs_session ON generation_logs(session_id);
CREATE INDEX idx_logs_type ON generation_logs(generation_type);
CREATE INDEX idx_logs_created ON generation_logs(created_at DESC);

-- Update triggers to maintain updated_at timestamps (removed for simplicity)

-- Insert default settings
INSERT INTO settings (key, value, data_type, description, is_system) VALUES
  ('app_version', '2.0.0', 'string', 'Application version', 1),
  ('max_content_length', '10000', 'number', 'Maximum content length in characters', 0),
  ('max_generations_per_session', '50', 'number', 'Maximum generations allowed per session', 0),
  ('enable_image_generation', 'true', 'boolean', 'Enable DALL-E image generation', 0),
  ('default_fiction_length', 'medium', 'string', 'Default fiction length (short/medium/long)', 0),
  ('rate_limit_per_minute', '10', 'number', 'API rate limit per minute per IP', 0),
  ('maintenance_mode', 'false', 'boolean', 'Enable maintenance mode', 0),
  ('analytics_enabled', 'true', 'boolean', 'Enable usage analytics', 0);