/**
 * Shared path utilities for ES modules compatibility
 */
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

/**
 * Get the directory name for the current module
 * @param {string} importMetaUrl - import.meta.url from the calling module
 * @returns {string} - Directory path
 */
export const getDirname = (importMetaUrl) => {
  const __filename = fileURLToPath(importMetaUrl);
  return dirname(__filename);
};

/**
 * Get the filename for the current module
 * @param {string} importMetaUrl - import.meta.url from the calling module
 * @returns {string} - File path
 */
export const getFilename = (importMetaUrl) => {
  return fileURLToPath(importMetaUrl);
};

/**
 * Resolve path relative to project root
 * @param {...string} pathSegments - Path segments to resolve
 * @returns {string} - Resolved path
 */
export const resolveProjectPath = (...pathSegments) => {
  return path.resolve('.', ...pathSegments);
};

/**
 * Get environment-specific database paths
 * @returns {Object} - Database paths for different environments
 */
export const getDatabasePaths = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const isTest = process.env.NODE_ENV === 'test';
  
  return {
    json: resolveProjectPath('data', isTest ? 'test-database.json' : 'database.json'),
    sqlite: resolveProjectPath('data', isTest ? 'test-generated-content.db' : 'generated-content.db'),
    settings: resolveProjectPath('data', 'settings.json')
  };
};