import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

const DB_DIR = path.resolve(__dirname, '../database');
const DB_PATH = path.join(DB_DIR, 'demo.db');
const MIGRATION_PATH = path.join(DB_DIR, 'migrations.sql');

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const db = new Database(DB_PATH);

const migrationSql = fs.readFileSync(MIGRATION_PATH, 'utf8');
db.exec(migrationSql);

export default db;
