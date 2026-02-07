/**
 * DB connection layer. Uses pg pool; all config from env.
 * Single export: pool. Routes use pool.query() for raw SQL.
 */
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

module.exports = { pool };
