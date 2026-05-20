import "server-only";
import { db } from "@/lib/db";

export type Category = {
  id: number;
  name: string;
  sortOrder: number;
};

type Result = { ok: true } | { ok: false; error: string };

interface CategoryRow {
  id: number;
  name: string;
  sort_order: number;
}

export function fetchCategories(): Category[] {
  const rows = db
    .prepare(
      "SELECT id, name, sort_order FROM categories ORDER BY sort_order ASC, id ASC",
    )
    .all() as CategoryRow[];
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    sortOrder: row.sort_order,
  }));
}

export function categoryExists(name: string): boolean {
  return Boolean(db.prepare("SELECT 1 FROM categories WHERE name = ?").get(name));
}

export function createCategory(name: string): Result {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "分类名称不能为空" };
  if (categoryExists(trimmed)) return { ok: false, error: "该分类已存在" };
  const { maxOrder } = db
    .prepare("SELECT COALESCE(MAX(sort_order), 0) AS maxOrder FROM categories")
    .get() as { maxOrder: number };
  db.prepare("INSERT INTO categories (name, sort_order) VALUES (?, ?)").run(
    trimmed,
    maxOrder + 1,
  );
  return { ok: true };
}

export function renameCategory(id: number, name: string): Result {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "分类名称不能为空" };
  const current = db.prepare("SELECT name FROM categories WHERE id = ?").get(id) as
    | { name: string }
    | undefined;
  if (!current) return { ok: false, error: "分类不存在" };
  if (trimmed === current.name) return { ok: true };
  const duplicate = db
    .prepare("SELECT 1 FROM categories WHERE name = ? AND id <> ?")
    .get(trimmed, id);
  if (duplicate) return { ok: false, error: "已有同名分类" };

  // Rename the category and cascade the change to its prompts.
  db.transaction(() => {
    db.prepare(
      "UPDATE categories SET name = ?, updated_at = datetime('now') WHERE id = ?",
    ).run(trimmed, id);
    db.prepare(
      "UPDATE prompts SET category = ?, updated_at = datetime('now') WHERE category = ?",
    ).run(trimmed, current.name);
  })();

  return { ok: true };
}

export function deleteCategory(id: number): Result {
  const current = db.prepare("SELECT name FROM categories WHERE id = ?").get(id) as
    | { name: string }
    | undefined;
  if (!current) return { ok: false, error: "分类不存在" };
  const { count } = db
    .prepare("SELECT COUNT(*) AS count FROM prompts WHERE category = ?")
    .get(current.name) as { count: number };
  if (count > 0) {
    return {
      ok: false,
      error: `该分类下还有 ${count} 条提示词，请先删除或改分类`,
    };
  }
  db.prepare("DELETE FROM categories WHERE id = ?").run(id);
  return { ok: true };
}
