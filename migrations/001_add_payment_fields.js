const { Pool } = require('pg');

async function up() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Add payment_id column
        await client.query(`
            ALTER TABLE orders 
            ADD COLUMN IF NOT EXISTS payment_id VARCHAR(255),
            ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50),
            ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50)
        `);

        await client.query('COMMIT');
        console.log('Successfully added payment fields to orders table');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error adding payment fields:', err);
        throw err;
    } finally {
        client.release();
        await pool.end();
    }
}

module.exports = { up }; 