// recreateDatabase.js
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Script to delete existing SQLite database files so they can be recreated with the updated schema
 */
async function recreateDatabases() {
    const rootDir = path.resolve('.');
    const databasePaths = [
        path.join(rootDir, 'data/generated-content.db'),
        path.join(rootDir, 'data/test-generated-content.db')
    ];
    
    console.log('Attempting to delete SQLite database files...');
    
    for (const dbPath of databasePaths) {
        try {
            // Check if file exists
            await fs.access(dbPath);
            // Delete the file
            await fs.unlink(dbPath);
            console.log(`✅ Successfully deleted: ${dbPath}`);
        } catch (error) {
            if (error.code === 'ENOENT') {
                console.log(`File does not exist, no action needed: ${dbPath}`);
            } else {
                console.error(`Error deleting file ${dbPath}:`, error.message);
            }
        }
    }
    
    console.log('\nDone! When your application runs next, the SQLite databases will be recreated with the updated schema.');
    console.log('\nNow you can run your tests with:');
    console.log('npm test');
}

// Run the function if this script is executed directly
if (fileURLToPath(import.meta.url) === process.argv[1]) {
    recreateDatabases().catch(error => {
        console.error('Error in recreateDatabase script:', error);
        process.exit(1);
    });
}
