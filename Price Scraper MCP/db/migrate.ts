import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function migrate() {
  const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/price_scraper';
  const pool = new pg.Pool({ connectionString: databaseUrl });

  try {
    // Create migrations tracking table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    const { rows: applied } = await pool.query('SELECT name FROM _migrations');
    const appliedNames = new Set(applied.map(r => r.name));

    for (const file of files) {
      if (appliedNames.has(file)) {
        console.log(`  ✓ ${file} (already applied)`);
        continue;
      }

      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
      console.log(`  → Applying ${file}...`);

      await pool.query('BEGIN');
      try {
        await pool.query(sql);
        await pool.query('INSERT INTO _migrations (name) VALUES ($1)', [file]);
        await pool.query('COMMIT');
        console.log(`  ✓ ${file} applied`);
      } catch (err) {
        await pool.query('ROLLBACK');
        throw new Error(`Migration ${file} failed: ${err}`);
      }
    }

    console.log('All migrations applied successfully.');
  } finally {
    await pool.end();
  }
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
