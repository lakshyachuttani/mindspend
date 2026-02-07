/**
 * Optional: run init.sql against an existing Postgres (e.g. local dev).
 * Usage: node scripts/init-db.js   (requires .env with DB_*)
 */
require('dotenv').config();
const { pool } = require('../src/db');
const fs = require('fs');
const path = require('path');

const sqlPath = path.join(__dirname, 'init.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');

pool.query(sql)
  .then(() => {
    console.log('Init SQL executed successfully.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Init failed:', err.message);
    process.exit(1);
  })
  .finally(() => pool.end());
