#!/usr/bin/env node

/**
 * Database migration script
 * Runs database migrations and migrates JSON data to SQLite
 */

import MigrationService from '../lib/migration.js';
import config from '../config/index.js';

async function runMigrations() {
  const databasePath = config.getDatabasePath();
  const migrationService = new MigrationService(databasePath);

  try {
    console.log('🚀 Starting database migration...');
    console.log(`📂 Database: ${databasePath}`);
    console.log(`🌍 Environment: ${config.get('env')}`);

    // Run schema migrations
    await migrationService.migrate();

    // Migrate JSON data if it exists
    await migrationService.migrateJsonData();

    console.log('🎉 Migration completed successfully!');
    
  } catch (error) {
    console.error('💥 Migration failed:', error.message);
    process.exit(1);
  } finally {
    await migrationService.close();
  }
}

// Run migrations if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations().catch(error => {
    console.error('Fatal error during migration:', error);
    process.exit(1);
  });
}

export default runMigrations;