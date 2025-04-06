require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');

// Enhanced pool configuration for production
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false,
        sslmode: 'require'
    },
    max: parseInt(process.env.PG_POOL_MAX, 10) || 10,
    idleTimeoutMillis: parseInt(process.env.PG_POOL_IDLE_TIMEOUT, 10) || 30000,
    connectionTimeoutMillis: parseInt(process.env.PG_POOL_CONNECTION_TIMEOUT, 10) || 10000,
    application_name: process.env.PG_APPLICATION_NAME || 'saranga-ayurveda-backend'
});

async function initializeDatabase() {
    try {
        console.log('Starting database initialization...');
        console.log('Testing database connection...');

        // Test connection
        await pool.query('SELECT NOW()');
        console.log('Database connection successful');
        
        // Read the SQL file
        const sqlPath = path.join(__dirname, '..', 'database.sql');
        console.log('Reading SQL file from:', sqlPath);
        const sql = await fs.readFile(sqlPath, 'utf8');
        
        // Split the SQL file into individual statements
        const statements = sql
            .replace(/(\r\n|\n|\r)/gm, ' ') // Remove newlines
            .replace(/--.*$/gm, '') // Remove SQL comments
            .split(';') // Split into statements
            .map(statement => statement.trim())
            .filter(statement => statement.length > 0); // Remove empty statements
        
        // Remove the CREATE DATABASE statement as we're already connected to the database
        statements.shift();
        
        // Execute each statement
        console.log(`Found ${statements.length} SQL statements to execute`);
        for (const statement of statements) {
            try {
                console.log(`Executing: ${statement.substring(0, 100)}...`);
                await pool.query(statement);
                console.log('Statement executed successfully');
            } catch (err) {
                console.error('Error executing statement:', {
                    error: err.message,
                    code: err.code,
                    detail: err.detail,
                    hint: err.hint,
                    statement: statement.substring(0, 200)
                });
                if (err.code === '42P07') {
                    console.log('Table already exists, continuing...');
                    continue;
                }
                throw err;
            }
        }
        
        console.log('Database initialization completed successfully');
    } catch (err) {
        console.error('Error initializing database:', {
            error: err.message,
            code: err.code,
            detail: err.detail,
            hint: err.hint,
            stack: err.stack
        });
        throw err;
    } finally {
        await pool.end();
    }
}

// Run the initialization
initializeDatabase()
    .then(() => {
        console.log('Database initialization completed');
        process.exit(0);
    })
    .catch(err => {
        console.error('Database initialization failed:', err);
        process.exit(1);
    }); 