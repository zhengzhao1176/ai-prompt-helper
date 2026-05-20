import "server-only";
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

const dataDir = path.join(process.cwd(), "data");
fs.mkdirSync(dataDir, { recursive: true });

const DB_PATH = path.join(dataDir, "prompts.db");

const SCHEMA = `
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
`;

declare global {
  // Cached across dev hot-reloads so we don't reopen the database each time.
  var __promptDb: Database.Database | undefined;
}

function openDatabase(): Database.Database {
  const database = new Database(DB_PATH);
  database.pragma("journal_mode = WAL");
  database.exec(SCHEMA);
  return database;
}

export const db: Database.Database = globalThis.__promptDb ?? openDatabase();

if (process.env.NODE_ENV !== "production") {
  globalThis.__promptDb = db;
}
