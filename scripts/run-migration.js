/**
 * Run a SQL migration file. Usage: node scripts/run-migration.js [migration-name]
 * Example: node scripts/run-migration.js 001_auth_and_sessions
 * Loads scripts/migrations/<name>.sql and executes against DB from .env
 */
require('dotenv').config();
const { pool } = require('../src/db');
const fs = require('fs');
const path = require('path');

const name = process.argv[2] || '001_auth_and_sessions';
const sqlPath = path.join(__dirname, 'migrations', `${name}.sql`);

if (!fs.existsSync(sqlPath)) {
  console.error('Migration not found:', sqlPath);
  process.exit(1);
}

const sql = fs.readFileSync(sqlPath, 'utf8');

pool
  .query(sql)
  .then(() => {
    console.log('Migration completed:', name);
    process.exit(0);
  })
  .catch((err) => {
    console.error('Migration failed:', err.message);
    process.exit(1);
  })
  .finally(() => pool.end());
