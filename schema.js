/**
 * Database Schema Definition for SpecGen Server
 * Single source of truth for all database tables, indexes, and default data
 *
 * This file consolidates schema definitions from:
 * - services.js (production schema)
 * - test.js (test schema)
 * - API documentation (swagger fields)
 * - Code references (all fields actually used)
 */

/**
 * Schema version for migration tracking
 */
export const SCHEMA_VERSION = '2.0.0';

/**
 * Table Definitions
 * Each table includes: columns, constraints, and indexes
 */
export const TABLES = {
  categories: {
    name: 'categories',
    columns: [
      'id TEXT PRIMARY KEY',
      'name TEXT NOT NULL UNIQUE',
      'description TEXT DEFAULT \'\'',
      'visibility TEXT DEFAULT \'Show\' CHECK(visibility IN (\'Show\', \'Hide\'))',
      'year INTEGER',
      'sort_order INTEGER DEFAULT 0',
      'created_at DATETIME DEFAULT CURRENT_TIMESTAMP'
    ],
    indexes: [
      'CREATE INDEX idx_categories_name ON categories(name)',
      'CREATE INDEX idx_categories_sort_order ON categories(sort_order)',
      'CREATE INDEX idx_categories_visibility ON categories(visibility)'
    ]
  },

  parameters: {
    name: 'parameters',
    columns: [
      'id TEXT PRIMARY KEY',
      'name TEXT NOT NULL',
      'description TEXT DEFAULT \'\'',
      'type TEXT NOT NULL CHECK(type IN (\'select\', \'text\', \'number\', \'boolean\', \'range\'))',
      'category_id TEXT NOT NULL',
      'visibility TEXT DEFAULT \'Basic\' CHECK(visibility IN (\'Basic\', \'Advanced\', \'Hide\'))',
      'required INTEGER DEFAULT 0',
      'sort_order INTEGER DEFAULT 0',
      'parameter_values TEXT',
      'parameter_config TEXT',
      'created_at DATETIME DEFAULT CURRENT_TIMESTAMP',
      'FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE'
    ],
    indexes: [
      'CREATE INDEX idx_parameters_category_id ON parameters(category_id)',
      'CREATE INDEX idx_parameters_type ON parameters(type)',
      'CREATE INDEX idx_parameters_sort_order ON parameters(sort_order)',
      'CREATE INDEX idx_parameters_visibility ON parameters(visibility)'
    ]
  },

  generated_content: {
    name: 'generated_content',
    columns: [
      'id TEXT PRIMARY KEY',
      'title TEXT NOT NULL CHECK(length(title) <= 200)',
      'fiction_content TEXT NOT NULL CHECK(length(fiction_content) <= 50000)',
      'image_blob BLOB',
      'image_thumbnail BLOB',
      'image_format TEXT DEFAULT \'png\'',
      'image_size_bytes INTEGER DEFAULT 0',
      'thumbnail_size_bytes INTEGER DEFAULT 0',
      'prompt_data TEXT',
      'metadata TEXT',
      'created_at DATETIME DEFAULT CURRENT_TIMESTAMP'
    ],
    indexes: [
      'CREATE INDEX idx_content_created_at ON generated_content(created_at DESC)'
    ]
  },

  settings: {
    name: 'settings',
    columns: [
      'key TEXT PRIMARY KEY',
      'value TEXT NOT NULL',
      'data_type TEXT DEFAULT \'string\' CHECK(data_type IN (\'string\', \'number\', \'boolean\', \'json\'))'
    ],
    indexes: []
  }
};

/**
 * Default Settings Data
 * Inserted when database is first created
 */
export const DEFAULT_SETTINGS = [
  { key: 'app_version', value: '2.0.0', data_type: 'string' },
  { key: 'max_content_length', value: '10000', data_type: 'number' },
  { key: 'max_generations_per_session', value: '50', data_type: 'number' },
  { key: 'enable_image_generation', value: 'true', data_type: 'boolean' },
  { key: 'default_fiction_length', value: 'medium', data_type: 'string' },
  { key: 'rate_limit_per_minute', value: '10', data_type: 'number' },
  { key: 'maintenance_mode', value: 'false', data_type: 'boolean' }
];

/**
 * Generate CREATE TABLE statement for a table
 */
export function createTableSQL(tableName) {
  const table = TABLES[tableName];
  if (!table) {
    throw new Error(`Table ${tableName} not found in schema`);
  }

  return `CREATE TABLE ${table.name} (\n  ${table.columns.join(',\n  ')}\n)`;
}

/**
 * Generate all CREATE INDEX statements for a table
 */
export function createIndexesSQL(tableName) {
  const table = TABLES[tableName];
  if (!table) {
    throw new Error(`Table ${tableName} not found in schema`);
  }

  return table.indexes;
}

/**
 * Get all table names in creation order (respects foreign keys)
 */
export function getTableNames() {
  return ['categories', 'parameters', 'generated_content', 'settings'];
}

/**
 * Generate SQL to insert default settings
 */
export function insertDefaultSettingsSQL() {
  const values = DEFAULT_SETTINGS.map(s =>
    `('${s.key}', '${s.value}', '${s.data_type}')`
  ).join(',\n      ');

  return `INSERT INTO settings (key, value, data_type) VALUES\n      ${values}`;
}

/**
 * Get field list for a table (useful for INSERT/SELECT operations)
 */
export function getTableFields(tableName) {
  const table = TABLES[tableName];
  if (!table) {
    throw new Error(`Table ${tableName} not found in schema`);
  }

  return table.columns
    .map(col => col.split(' ')[0])
    .filter(field => !field.startsWith('FOREIGN') && !field.startsWith('CHECK'));
}

/**
 * Complete schema initialization script
 * Returns array of SQL statements to execute in order
 */
export function getSchemaInitSQL() {
  const statements = [];

  // Enable foreign keys
  statements.push('PRAGMA foreign_keys = ON');

  // Create tables in order
  getTableNames().forEach(tableName => {
    statements.push(createTableSQL(tableName));
  });

  // Create indexes
  getTableNames().forEach(tableName => {
    const indexes = createIndexesSQL(tableName);
    statements.push(...indexes);
  });

  // Insert default settings
  statements.push(insertDefaultSettingsSQL());

  return statements;
}

/**
 * Schema validation helper
 * Returns the expected fields for each table
 */
export const EXPECTED_FIELDS = {
  categories: ['id', 'name', 'description', 'visibility', 'year', 'sort_order', 'created_at'],
  parameters: ['id', 'name', 'description', 'type', 'category_id', 'visibility', 'required', 'sort_order', 'parameter_values', 'parameter_config', 'created_at'],
  generated_content: ['id', 'title', 'fiction_content', 'image_blob', 'image_thumbnail', 'image_format', 'image_size_bytes', 'thumbnail_size_bytes', 'prompt_data', 'metadata', 'created_at'],
  settings: ['key', 'value', 'data_type']
};

export default {
  SCHEMA_VERSION,
  TABLES,
  DEFAULT_SETTINGS,
  EXPECTED_FIELDS,
  createTableSQL,
  createIndexesSQL,
  getTableNames,
  insertDefaultSettingsSQL,
  getTableFields,
  getSchemaInitSQL
};
