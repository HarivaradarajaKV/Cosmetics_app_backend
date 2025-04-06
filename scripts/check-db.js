require('dotenv').config();
const { Pool } = require('pg');

async function checkDatabase() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        // Get list of tables
        const result = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name;
        `);

        console.log('\nDatabase Tables:');
        console.log('----------------');
        result.rows.forEach(row => {
            console.log(row.table_name);
        });

        // Check a few key tables for row counts
        const tables = ['users', 'products', 'orders', 'categories'];
        console.log('\nTable Row Counts:');
        console.log('----------------');
        
        for (const table of tables) {
            try {
                const countResult = await pool.query(`SELECT COUNT(*) FROM ${table}`);
                console.log(`${table}: ${countResult.rows[0].count} rows`);
            } catch (err) {
                console.log(`${table}: Table not found or error`);
            }
        }
    } catch (err) {
        console.error('Error checking database:', err);
    } finally {
        await pool.end();
    }
}

checkDatabase(); 