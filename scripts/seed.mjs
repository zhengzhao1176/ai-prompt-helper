// Seeds the SQLite database (data/prompts.db) from data/prompts.json.
// Run with:  npm run db:seed
//
// Seeds the `prompts` table and derives the `categories` table from the
// distinct categories used by those prompts. Uses UPSERT, so re-running
// refreshes seed rows and leaves anything you added in the admin untouched.

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

const prompts = JSON.parse(
  await readFile(join(projectRoot, "data", "prompts.json"), "utf8"),
);

const db = new Database(join(projectRoot, "data", "prompts.db"));
db.pragma("journal_mode = WAL");
db.exec(`
  CREATE TABLE IF NOT EXISTS prompts (
    id          TEXT    PRIMARY KEY,
    title       TEXT    NOT NULL,
    category    TEXT    NOT NULL,
    keywords    TEXT    NOT NULL,
    prompt      TEXT    NOT NULL,
    note        TEXT,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS categories (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL UNIQUE,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  );
`);

const upsertPrompt = db.prepare(`
  INSERT INTO prompts (id, title, category, keywords, prompt, note, sort_order)
  VALUES (@id, @title, @category, @keywords, @prompt, @note, @sortOrder)
  ON CONFLICT(id) DO UPDATE SET
    title      = excluded.title,
    category   = excluded.category,
    keywords   = excluded.keywords,
    prompt     = excluded.prompt,
    note       = excluded.note,
    sort_order = excluded.sort_order
`);

const upsertCategory = db.prepare(`
  INSERT INTO categories (name, sort_order)
  VALUES (@name, @sortOrder)
  ON CONFLICT(name) DO UPDATE SET sort_order = excluded.sort_order
`);

const categoryNames = [];
for (const item of prompts) {
  if (!categoryNames.includes(item.category)) categoryNames.push(item.category);
}

db.transaction(() => {
  prompts.forEach((item, index) => {
    upsertPrompt.run({
      id: item.id,
      title: item.title,
      category: item.category,
      keywords: JSON.stringify(item.keywords),
      prompt: item.prompt,
      note: item.note ?? null,
      sortOrder: index,
    });
  });
  categoryNames.forEach((name, index) => {
    upsertCategory.run({ name, sortOrder: index });
  });
})();

console.log(
  `Seeded ${prompts.length} prompts and ${categoryNames.length} categories into SQLite (data/prompts.db).`,
);
db.close();
