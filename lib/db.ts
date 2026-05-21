import "server-only";
import fs from "node:fs";
import path from "node:path";
import { createClient, type Client } from "@libsql/client";

// 每条 CREATE 单独执行（libsql 的 execute 一次只跑一条语句）。
const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS prompts (
    id          TEXT    PRIMARY KEY,
    title       TEXT    NOT NULL,
    category    TEXT    NOT NULL,
    keywords    TEXT    NOT NULL,
    prompt      TEXT    NOT NULL,
    note        TEXT,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS categories (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL UNIQUE,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  )`,
];

// 本地开发用本地 SQLite 文件；设置了 TURSO_DATABASE_URL 时（如 Vercel）走 Turso。
function createDbClient(): Client {
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  if (tursoUrl) {
    return createClient({
      url: tursoUrl,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  const dataDir = path.join(process.cwd(), "data");
  fs.mkdirSync(dataDir, { recursive: true });
  return createClient({ url: `file:${path.join(dataDir, "prompts.db")}` });
}

declare global {
  // 跨开发态热重载缓存，避免重复建连接 / 重复建表。
  var __promptDb: Client | undefined;
  var __promptSchema: Promise<void> | undefined;
}

export const db: Client = globalThis.__promptDb ?? createDbClient();
if (process.env.NODE_ENV !== "production") {
  globalThis.__promptDb = db;
}

// 首次访问数据库前确保表已存在（只执行一次，结果缓存）。
export function ensureSchema(): Promise<void> {
  if (!globalThis.__promptSchema) {
    globalThis.__promptSchema = (async () => {
      for (const statement of SCHEMA_STATEMENTS) {
        await db.execute(statement);
      }
    })();
  }
  return globalThis.__promptSchema;
}
