const { Pool } = require('pg');
require('dotenv').config();

// Connection retry configuration
const MAX_RETRIES = 5;
const INITIAL_RETRY_DELAY_MS = 1000;

class Database {
    constructor() {
        this.pool = null;
    }

    async initialize() {
        if (this.pool) {
            return this.pool;
        }

        try {
            const connectionConfig = {
                connectionString: process.env.DATABASE_URL,
                ssl: {
                    rejectUnauthorized: false,
                    sslmode: 'require'
                },
                // Enhanced pool configuration for better stability
                max: parseInt(process.env.PG_POOL_MAX, 10) || 10,
                min: 0,
                idleTimeoutMillis: parseInt(process.env.PG_POOL_IDLE_TIMEOUT, 10) || 30000,
                connectionTimeoutMillis: parseInt(process.env.PG_POOL_CONNECTION_TIMEOUT, 10) || 10000,
                application_name: 'saranga-ayurveda-backend',
                keepAlive: true,
                keepAliveInitialDelayMillis: 10000
            };

            console.log('Initializing database with config:', {
                ...connectionConfig,
                connectionString: '[REDACTED]',
                ssl: connectionConfig.ssl
            });

            this.pool = new Pool(connectionConfig);

            // Test the connection with retry logic
            let retries = 0;
            while (retries < MAX_RETRIES) {
                let client;
                try {
                    client = await this.pool.connect();
                    console.log('Connected to database, testing query...');
                    const result = await client.query('SELECT current_database() as db, current_user as user, version() as version');
                    console.log('Database connection test result:', result.rows[0]);
                    client.release();
                    console.log('Database connection established successfully');
                    break;
                } catch (err) {
                    if (client) client.release();
                    retries++;
                    console.error('Connection attempt failed:', {
                        attempt: retries,
                        error: err.message,
                        code: err.code,
                        detail: err.detail,
                        hint: err.hint
                    });
                    if (retries === MAX_RETRIES) {
                        throw err;
                    }
                    const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, retries - 1);
                    console.log(`Retrying in ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
            
            this.setupEventHandlers();
            return this.pool;
        } catch (err) {
            console.error('Failed to initialize database:', {
                error: err.message,
                code: err.code,
                detail: err.detail,
                hint: err.hint,
                stack: err.stack
            });
            throw err;
        }
    }

    setupEventHandlers() {
        this.pool.on('error', (err, client) => {
            console.error('Unexpected error on idle client:', {
                error: err.message,
                code: err.code,
                detail: err.detail,
                hint: err.hint
            });
            
            // Remove the client from the pool
            client.release(true);
            
            // Attempt to reconnect after a delay
            setTimeout(() => {
                console.log('Attempting to reconnect to database...');
                this.initialize().catch(err => {
                    console.error('Failed to reconnect to database:', err);
                });
            }, INITIAL_RETRY_DELAY_MS);
        });

        this.pool.on('connect', () => {
            console.log('Database connected successfully');
        });

        this.pool.on('acquire', () => {
            console.log('Client acquired from pool');
        });

        this.pool.on('remove', () => {
            console.log('Client removed from pool');
        });
    }

    async query(...args) {
        if (!this.pool) {
            await this.initialize();
        }
        const client = await this.pool.connect();
        try {
            const result = await client.query(...args);
            return result;
        } catch (err) {
            console.error('Database query error:', {
                error: err.message,
                code: err.code,
                detail: err.detail,
                hint: err.hint,
                query: args[0]
            });
            throw err;
        } finally {
            client.release();
        }
    }

    async getClient() {
        if (!this.pool) {
            await this.initialize();
        }
        return this.pool.connect();
    }
}

module.exports = new Database(); 