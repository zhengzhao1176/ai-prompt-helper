// Seeds the database from data/prompts.json.
//   本地（默认）：写入 data/prompts.db
//   Turso：       TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... npm run db:seed
//
// 使用 UPSERT，可重复运行：刷新种子行，不动你在后台另外加的内容。

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@libsql/client";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

const prompts = JSON.parse(
  await readFile(join(projectRoot, "data", "prompts.json"), "utf8"),
);

const tursoUrl = process.env.TURSO_DATABASE_URL;
const db = tursoUrl
  ? createClient({ url: tursoUrl, authToken: process.env.TURSO_AUTH_TOKEN })
  : createClient({ url: `file:${join(projectRoot, "data", "prompts.db")}` });

await db.execute(`
  CREATE TABLE IF NOT EXISTS prompts (
    id TEXT PRIMARY KEY, title TEXT NOT NULL, category TEXT NOT NULL,
    keywords TEXT NOT NULL, prompt TEXT NOT NULL, note TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);
await db.execute(`
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

const categoryNames = [];
for (const item of prompts) {
  if (!categoryNames.includes(item.category)) categoryNames.push(item.category);
}

const statements = [];
prompts.forEach((item, index) => {
  statements.push({
    sql: `INSERT INTO prompts (id, title, category, keywords, prompt, note, sort_order)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            title = excluded.title, category = excluded.category,
            keywords = excluded.keywords, prompt = excluded.prompt,
            note = excluded.note, sort_order = excluded.sort_order`,
    args: [
      item.id,
      item.title,
      item.category,
      JSON.stringify(item.keywords),
      item.prompt,
      item.note ?? null,
      index,
    ],
  });
});
categoryNames.forEach((name, index) => {
  statements.push({
    sql: `INSERT INTO categories (name, sort_order) VALUES (?, ?)
          ON CONFLICT(name) DO UPDATE SET sort_order = excluded.sort_order`,
    args: [name, index],
  });
});

await db.batch(statements, "write");

console.log(
  `Seeded ${prompts.length} prompts and ${categoryNames.length} categories ` +
    `(${tursoUrl ? "Turso" : "local SQLite"}).`,
);
db.close();
