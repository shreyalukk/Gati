const fs = require('fs');
const path = require('path');
const db = require('./db');

async function migrate() {
  console.log('🚀 Running Gati database migrations...\n');

  const migrationsDir = path.join(__dirname, '../../migrations');
  const files = fs.readdirSync(migrationsDir).sort();

  for (const file of files) {
    if (!file.endsWith('.sql')) continue;
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    console.log(`  📄 Running ${file}...`);
    try {
      await db.query(sql);
      console.log(`  ✅ ${file} completed`);
    } catch (err) {
      console.error(`  ❌ ${file} failed:`, err.message);
      process.exit(1);
    }
  }

  console.log('\n✅ All migrations completed successfully!');
  process.exit(0);
}

migrate();
