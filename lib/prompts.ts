import "server-only";
import { randomUUID } from "node:crypto";
import type { Row } from "@libsql/client";
import { db, ensureSchema } from "@/lib/db";
import type { Prompt } from "@/lib/search";

// Shape submitted from the admin form.
export type PromptInput = {
  title: string;
  category: string;
  keywords: string[];
  prompt: string;
  note: string;
};

function rowToPrompt(row: Row): Prompt {
  let keywords: string[] = [];
  try {
    const parsed = JSON.parse(String(row.keywords ?? "[]"));
    if (Array.isArray(parsed)) keywords = parsed.map((item) => String(item));
  } catch {
    keywords = [];
  }
  return {
    id: String(row.id),
    title: String(row.title),
    category: String(row.category),
    keywords,
    prompt: String(row.prompt),
    note: row.note == null ? undefined : String(row.note),
  };
}

export async function fetchPrompts(): Promise<Prompt[]> {
  await ensureSchema();
  const result = await db.execute(
    `SELECT id, title, category, keywords, prompt, note
       FROM prompts
   ORDER BY sort_order ASC, id ASC`,
  );
  return result.rows.map(rowToPrompt);
}

export async function createPrompt(input: PromptInput): Promise<void> {
  await ensureSchema();
  const maxResult = await db.execute(
    "SELECT COALESCE(MAX(sort_order), 0) AS maxOrder FROM prompts",
  );
  const maxOrder = Number(maxResult.rows[0]?.maxOrder ?? 0);

  await db.execute({
    sql: `INSERT INTO prompts (id, title, category, keywords, prompt, note, sort_order)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [
      `p-${randomUUID().slice(0, 8)}`,
      input.title.trim(),
      input.category,
      JSON.stringify(input.keywords),
      input.prompt.trim(),
      input.note.trim() || null,
      maxOrder + 1,
    ],
  });
}

export async function updatePrompt(
  id: string,
  input: PromptInput,
): Promise<boolean> {
  await ensureSchema();
  const result = await db.execute({
    sql: `UPDATE prompts
             SET title = ?, category = ?, keywords = ?, prompt = ?,
                 note = ?, updated_at = datetime('now')
           WHERE id = ?`,
    args: [
      input.title.trim(),
      input.category,
      JSON.stringify(input.keywords),
      input.prompt.trim(),
      input.note.trim() || null,
      id,
    ],
  });
  return result.rowsAffected > 0;
}

export async function deletePrompt(id: string): Promise<boolean> {
  await ensureSchema();
  const result = await db.execute({
    sql: "DELETE FROM prompts WHERE id = ?",
    args: [id],
  });
  return result.rowsAffected > 0;
}
