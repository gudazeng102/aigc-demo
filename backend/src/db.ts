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

// 对旧数据库自动补充第三轮新增的字段
const columns = db.prepare('PRAGMA table_info(tasks)').all() as { name: string }[];
const columnNames = new Set(columns.map((c) => c.name));

if (!columnNames.has('platform')) {
  db.exec("ALTER TABLE tasks ADD COLUMN platform TEXT DEFAULT 'volcano'");
}

if (!columnNames.has('platform_task_id')) {
  db.exec("ALTER TABLE tasks ADD COLUMN platform_task_id TEXT DEFAULT ''");
}

if (!columnNames.has('error_message')) {
  db.exec("ALTER TABLE tasks ADD COLUMN error_message TEXT DEFAULT ''");
}

export default db;
