import "server-only";
import { db, ensureSchema } from "@/lib/db";

export type Category = {
  id: number;
  name: string;
  sortOrder: number;
};

type Result = { ok: true } | { ok: false; error: string };

export async function fetchCategories(): Promise<Category[]> {
  await ensureSchema();
  const result = await db.execute(
    "SELECT id, name, sort_order FROM categories ORDER BY sort_order ASC, id ASC",
  );
  return result.rows.map((row) => ({
    id: Number(row.id),
    name: String(row.name),
    sortOrder: Number(row.sort_order),
  }));
}

export async function categoryExists(name: string): Promise<boolean> {
  await ensureSchema();
  const result = await db.execute({
    sql: "SELECT 1 FROM categories WHERE name = ?",
    args: [name],
  });
  return result.rows.length > 0;
}

export async function createCategory(name: string): Promise<Result> {
  await ensureSchema();
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "分类名称不能为空" };
  if (await categoryExists(trimmed)) return { ok: false, error: "该分类已存在" };

  const maxResult = await db.execute(
    "SELECT COALESCE(MAX(sort_order), 0) AS maxOrder FROM categories",
  );
  const maxOrder = Number(maxResult.rows[0]?.maxOrder ?? 0);
  await db.execute({
    sql: "INSERT INTO categories (name, sort_order) VALUES (?, ?)",
    args: [trimmed, maxOrder + 1],
  });
  return { ok: true };
}

export async function renameCategory(
  id: number,
  name: string,
): Promise<Result> {
  await ensureSchema();
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "分类名称不能为空" };

  const currentResult = await db.execute({
    sql: "SELECT name FROM categories WHERE id = ?",
    args: [id],
  });
  if (currentResult.rows.length === 0) {
    return { ok: false, error: "分类不存在" };
  }
  const currentName = String(currentResult.rows[0].name);
  if (trimmed === currentName) return { ok: true };

  const duplicate = await db.execute({
    sql: "SELECT 1 FROM categories WHERE name = ? AND id <> ?",
    args: [trimmed, id],
  });
  if (duplicate.rows.length > 0) {
    return { ok: false, error: "已有同名分类" };
  }

  // 重命名分类，并把该分类下的提示词一并改名（同一事务）。
  await db.batch(
    [
      {
        sql: "UPDATE categories SET name = ?, updated_at = datetime('now') WHERE id = ?",
        args: [trimmed, id],
      },
      {
        sql: "UPDATE prompts SET category = ?, updated_at = datetime('now') WHERE category = ?",
        args: [trimmed, currentName],
      },
    ],
    "write",
  );
  return { ok: true };
}

export async function deleteCategory(id: number): Promise<Result> {
  await ensureSchema();
  const currentResult = await db.execute({
    sql: "SELECT name FROM categories WHERE id = ?",
    args: [id],
  });
  if (currentResult.rows.length === 0) {
    return { ok: false, error: "分类不存在" };
  }
  const currentName = String(currentResult.rows[0].name);

  const countResult = await db.execute({
    sql: "SELECT COUNT(*) AS count FROM prompts WHERE category = ?",
    args: [currentName],
  });
  const count = Number(countResult.rows[0]?.count ?? 0);
  if (count > 0) {
    return {
      ok: false,
      error: `该分类下还有 ${count} 条提示词，请先删除或改分类`,
    };
  }

  await db.execute({
    sql: "DELETE FROM categories WHERE id = ?",
    args: [id],
  });
  return { ok: true };
}
