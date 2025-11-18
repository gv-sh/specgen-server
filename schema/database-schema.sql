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
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

-- Generated content table: All user-generated combined stories and images
CREATE TABLE generated_content (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL CHECK(length(title) <= 200),
  fiction_content TEXT NOT NULL CHECK(length(fiction_content) <= 50000),
  image_blob BLOB,
  image_thumbnail BLOB,
  image_format TEXT DEFAULT 'png',
  image_prompt TEXT CHECK(length(image_prompt) <= 1000),
  prompt_data TEXT, -- JSON object containing all generation parameters
  metadata TEXT, -- JSON object for additional metadata (includes image sizes, etc.)
  generation_time INTEGER DEFAULT 0 CHECK(generation_time >= 0), -- Time taken in milliseconds
  word_count INTEGER DEFAULT 0 CHECK(word_count >= 0),
  status TEXT DEFAULT 'completed' CHECK(status IN ('pending', 'generating', 'completed', 'failed')),
  share_enabled INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Instagram carousel shares table: Track Instagram carousel post sharing
CREATE TABLE instagram_shares (
  id TEXT PRIMARY KEY,
  content_id TEXT NOT NULL,
  user_instagram_handle TEXT CHECK(user_instagram_handle IS NULL OR (length(user_instagram_handle) <= 30 AND user_instagram_handle GLOB '[a-zA-Z0-9._]*')), -- Instagram username for attribution
  caption TEXT CHECK(caption IS NULL OR length(caption) <= 2200), -- Instagram caption
  hashtags TEXT CHECK(hashtags IS NULL OR length(hashtags) <= 1000), -- JSON array of hashtags
  share_status TEXT DEFAULT 'pending' CHECK(share_status IN ('pending', 'success', 'failed')),
  instagram_media_id TEXT, -- Instagram carousel media ID
  instagram_post_url TEXT, -- Full URL to Instagram post
  retry_data TEXT, -- JSON: {attempt_count: 0, last_attempt_at: timestamp, error_message: string}
  shared_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (content_id) REFERENCES generated_content(id) ON DELETE CASCADE
);

-- Settings table: Application configuration and system settings
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  data_type TEXT DEFAULT 'string' CHECK(data_type IN ('string', 'number', 'boolean', 'json'))
);

-- User sessions table: Track user sessions for analytics and Instagram preferences
CREATE TABLE user_sessions (
  id TEXT PRIMARY KEY,
  session_start DATETIME DEFAULT CURRENT_TIMESTAMP,
  session_end DATETIME,
  requests_count INTEGER DEFAULT 0,
  ip_address TEXT,
  user_agent TEXT,
  last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
  preferred_instagram_handle TEXT
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
  -- Instagram sharing tracking
  instagram_share_id TEXT, -- References instagram_shares.id if this log relates to sharing
  FOREIGN KEY (instagram_share_id) REFERENCES instagram_shares(id) ON DELETE SET NULL,
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

CREATE INDEX idx_content_created_at ON generated_content(created_at DESC);
CREATE INDEX idx_content_status ON generated_content(status);
CREATE INDEX idx_content_word_count ON generated_content(word_count);
CREATE INDEX idx_content_share_enabled ON generated_content(share_enabled, created_at DESC);
CREATE INDEX idx_composite_category_params ON parameters(category_id, visibility, sort_order);

-- Instagram shares indexes
CREATE INDEX idx_instagram_shares_content_id ON instagram_shares(content_id);
CREATE INDEX idx_instagram_shares_status ON instagram_shares(share_status, created_at DESC);
CREATE INDEX idx_instagram_shares_user_handle ON instagram_shares(user_instagram_handle);
CREATE INDEX idx_instagram_shares_media_id ON instagram_shares(instagram_media_id);
CREATE INDEX idx_instagram_shares_shared_at ON instagram_shares(shared_at DESC);

-- Partial index for failed shares needing retry
CREATE INDEX idx_instagram_shares_failed ON instagram_shares(created_at DESC) WHERE share_status = 'failed';

CREATE INDEX idx_settings_type ON settings(data_type);

CREATE INDEX idx_sessions_start ON user_sessions(session_start DESC);
CREATE INDEX idx_sessions_activity ON user_sessions(last_activity DESC);
CREATE INDEX idx_sessions_instagram_handle ON user_sessions(preferred_instagram_handle);

CREATE INDEX idx_logs_session ON generation_logs(session_id);
CREATE INDEX idx_logs_type ON generation_logs(generation_type);
CREATE INDEX idx_logs_created ON generation_logs(created_at DESC);
CREATE INDEX idx_logs_instagram_share_id ON generation_logs(instagram_share_id);

-- Update triggers to maintain updated_at timestamps (removed for simplicity)

-- Insert default settings
INSERT INTO settings (key, value, data_type) VALUES
  ('app_version', '2.0.0', 'string'),
  ('max_content_length', '10000', 'number'),
  ('max_generations_per_session', '50', 'number'),
  ('enable_image_generation', 'true', 'boolean'),
  ('default_fiction_length', 'medium', 'string'),
  ('rate_limit_per_minute', '10', 'number'),
  ('maintenance_mode', 'false', 'boolean'),
  ('analytics_enabled', 'true', 'boolean'),
  -- Instagram carousel sharing configuration
  ('instagram_sharing_enabled', 'false', 'boolean'),
  ('specgen_instagram_access_token', '', 'string'),
  ('specgen_instagram_user_id', '', 'string'),
  ('specgen_instagram_username', 'specgen_ai', 'string'),
  ('instagram_app_id', '', 'string'),
  ('instagram_app_secret', '', 'string'),
  ('instagram_attribution_template', 'Amazing AI-generated story by @{handle}! 🤖✨', 'string'),
  ('default_carousel_hashtags', '["#aiart", "#fiction", "#specgen", "#storytelling"]', 'json'),
  ('instagram_carousel_template', '{title}\n\nGenerated with SpecGen AI ✨\n\n{hashtags}', 'string'),
  ('instagram_daily_post_limit', '20', 'number'),
  ('instagram_max_retry_attempts', '3', 'number'),
  ('instagram_retry_delay_minutes', '15', 'number');