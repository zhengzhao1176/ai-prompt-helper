// 把本地 data/prompts.db 的全部数据复制到 Turso。
// 由 setup-turso.sh 调用；需要环境变量 TURSO_DATABASE_URL / TURSO_AUTH_TOKEN。

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@libsql/client";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
if (!url) {
  console.error("错误：缺少 TURSO_DATABASE_URL 环境变量。");
  process.exit(1);
}

const local = createClient({
  url: `file:${join(projectRoot, "data", "prompts.db")}`,
});
const turso = createClient({ url, authToken });

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS prompts (
    id TEXT PRIMARY KEY, title TEXT NOT NULL, category TEXT NOT NULL,
    keywords TEXT NOT NULL, prompt TEXT NOT NULL, note TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
];
for (const stmt of SCHEMA) await turso.execute(stmt);

const prompts = (
  await local.execute(
    "SELECT id, title, category, keywords, prompt, note, sort_order FROM prompts ORDER BY sort_order ASC",
  )
).rows;
const categories = (
  await local.execute(
    "SELECT name, sort_order FROM categories ORDER BY sort_order ASC",
  )
).rows;

// 先清空 Turso 再写入，保证与本地一致（可重复运行）。
const statements = [
  { sql: "DELETE FROM prompts", args: [] },
  { sql: "DELETE FROM categories", args: [] },
];
for (const p of prompts) {
  statements.push({
    sql: `INSERT INTO prompts (id, title, category, keywords, prompt, note, sort_order)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [
      p.id,
      p.title,
      p.category,
      p.keywords,
      p.prompt,
      p.note,
      p.sort_order,
    ],
  });
}
for (const c of categories) {
  statements.push({
    sql: "INSERT INTO categories (name, sort_order) VALUES (?, ?)",
    args: [c.name, c.sort_order],
  });
}
await turso.batch(statements, "write");

console.log(
  `已迁移 ${prompts.length} 条提示词、${categories.length} 个分类到 Turso。`,
);
local.close();
turso.close();
