const { Pool } = require('pg');
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

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
            // Enhanced configuration for Supabase connection
            const connectionConfig = isProduction ? {
                connectionString: process.env.DATABASE_URL,
                ssl: {
                    rejectUnauthorized: false,
                    sslmode: 'require'
                },
                keepAlive: true,
                keepAliveInitialDelayMillis: 10000
            } : {
                user: process.env.DB_USER,
                password: process.env.DB_PASSWORD,
                host: process.env.DB_HOST,
                port: process.env.DB_PORT,
                database: process.env.DB_NAME,
                ssl: false
            };

            this.pool = new Pool({
                ...connectionConfig,
                max: isProduction ? 20 : 10, // Reduced max connections
                min: isProduction ? 2 : 1,   // Minimum connections
                idleTimeoutMillis: 30000,    // Reduced idle timeout
                connectionTimeoutMillis: 30000,
                statement_timeout: 60000,     // 1 minute statement timeout
                query_timeout: 60000,         // 1 minute query timeout
                application_name: 'saranga-ayurveda-backend'
            });

            // Test the connection with retry logic
            let retries = 0;
            while (retries < MAX_RETRIES) {
                try {
                    await this.pool.query('SELECT 1');
                    console.log(`Database connection established successfully in ${process.env.NODE_ENV} mode`);
                    break;
                } catch (err) {
                    retries++;
                    if (retries === MAX_RETRIES) {
                        throw err;
                    }
                    console.log(`Connection attempt ${retries} failed, retrying in ${INITIAL_RETRY_DELAY_MS * retries}ms...`);
                    await new Promise(resolve => setTimeout(resolve, INITIAL_RETRY_DELAY_MS * retries));
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
                position: err.position
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
                hint: err.hint,
                position: err.position
            });
            console.log('Attempting to recover from pool error...');
            
            // Attempt to reconnect
            setTimeout(() => {
                console.log('Attempting to reconnect to database...');
                this.initialize().catch(err => {
                    console.error('Failed to reconnect to database:', err);
                });
            }, INITIAL_RETRY_DELAY_MS);
        });

        this.pool.on('connect', () => {
            console.log(`Database connected successfully in ${process.env.NODE_ENV} mode`);
        });

        this.pool.on('remove', () => {
            console.log('Database connection pool removed');
            if (isProduction) {
                setTimeout(() => {
                    this.initialize().catch(err => {
                        console.error('Error reconnecting to the database:', err);
                    });
                }, INITIAL_RETRY_DELAY_MS);
            }
        });
    }

    async query(...args) {
        if (!this.pool) {
            await this.initialize();
        }
        try {
            return await this.pool.query(...args);
        } catch (err) {
            console.error('Database query error:', {
                error: err.message,
                code: err.code,
                detail: err.detail,
                hint: err.hint,
                position: err.position,
                query: args[0]
            });
            throw err;
        }
    }

    async getClient() {
        if (!this.pool) {
            await this.initialize();
        }
        return this.pool.connect();
    }
}

const db = new Database();

module.exports = db; 