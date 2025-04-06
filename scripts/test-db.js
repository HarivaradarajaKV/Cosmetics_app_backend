const db = require('../db');

async function testConnection() {
    try {
        const pool = await db.initialize();
        console.log('Successfully connected to database pool');

        // Test basic query
        const result = await db.query('SELECT NOW() as time');
        console.log('Current database time:', result.rows[0].time);

        // Test table access
        const tables = await db.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            AND table_type = 'BASE TABLE'
        `);
        console.log('Available tables:', tables.rows.map(r => r.table_name));

        // Test connection pool
        const client = await db.getClient();
        console.log('Successfully acquired client from pool');
        
        try {
            const dbInfo = await client.query(`
                SELECT current_database() as database,
                       current_user as user,
                       version() as version,
                       inet_server_addr() as server_ip,
                       inet_server_port() as server_port
            `);
            console.log('Database information:', dbInfo.rows[0]);
        } finally {
            client.release();
            console.log('Successfully released client back to pool');
        }

        // Cleanup
        await pool.end();
        console.log('Successfully closed connection pool');
    } catch (error) {
        console.error('Error during database connection test:', error);
        process.exit(1);
    }
}

// Run the test
console.log('Starting database connection test...');
testConnection(); 