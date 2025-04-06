require('dotenv').config();
const path = require('path');
const fs = require('fs').promises;

async function runMigrations() {
    try {
        console.log('Starting migrations...');
        
        // Get all migration files
        const migrationsDir = path.join(__dirname, '..', 'migrations');
        const files = await fs.readdir(migrationsDir);
        
        // Filter and sort migration files
        const migrationFiles = files
            .filter(file => file.startsWith('001_') && file.endsWith('.js'))
            .sort();
            
        console.log('Found migration files:', migrationFiles);
        
        // Run each migration
        for (const file of migrationFiles) {
            try {
                console.log(`Running migration: ${file}`);
                const migration = require(path.join(migrationsDir, file));
                
                if (typeof migration.up === 'function') {
                    await migration.up();
                    console.log(`Successfully completed migration: ${file}`);
                } else {
                    console.warn(`Skipping ${file} - no 'up' function found`);
                }
            } catch (err) {
                console.error(`Error in migration ${file}:`, err);
                throw err;
            }
        }
        
        console.log('All migrations completed successfully');
    } catch (err) {
        console.error('Migration error:', err);
        process.exit(1);
    }
}

// Run the migrations
runMigrations(); 