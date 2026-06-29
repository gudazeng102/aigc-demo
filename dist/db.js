"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const DB_DIR = path_1.default.resolve(__dirname, '../database');
const DB_PATH = path_1.default.join(DB_DIR, 'demo.db');
const MIGRATION_PATH = path_1.default.join(DB_DIR, 'migrations.sql');
if (!fs_1.default.existsSync(DB_DIR)) {
    fs_1.default.mkdirSync(DB_DIR, { recursive: true });
}
const db = new better_sqlite3_1.default(DB_PATH);
const migrationSql = fs_1.default.readFileSync(MIGRATION_PATH, 'utf8');
db.exec(migrationSql);
// 对旧数据库自动补充第三轮新增的字段
const columns = db.prepare('PRAGMA table_info(tasks)').all();
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
exports.default = db;
