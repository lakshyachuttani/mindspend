/**
 * Run migration files in scripts/migrations/ in order.
 * Usage: node scripts/run-migrations.js
 * Requires .env with DB_*
 */
require('dotenv').config();
const { pool } = require('../src/db');
const fs = require('fs');
const path = require('path');

const migrationsDir = path.join(__dirname, 'migrations');
const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();

async function run() {
  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    await pool.query(sql);
    console.log('Ran migration:', file);
  }
  console.log('Migrations complete.');
  process.exit(0);
}

run().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
}).finally(() => pool.end());
