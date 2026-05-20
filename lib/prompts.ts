import "server-only";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import type { Prompt } from "@/lib/search";

// Shape submitted from the admin form.
export type PromptInput = {
  title: string;
  category: string;
  keywords: string[];
  prompt: string;
  note: string;
};

interface PromptRow {
  id: string;
  title: string;
  category: string;
  keywords: string;
  prompt: string;
  note: string | null;
}

function rowToPrompt(row: PromptRow): Prompt {
  let keywords: string[] = [];
  try {
    const parsed = JSON.parse(row.keywords);
    if (Array.isArray(parsed)) keywords = parsed.map((item) => String(item));
  } catch {
    keywords = [];
  }
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    keywords,
    prompt: row.prompt,
    note: row.note ?? undefined,
  };
}

export function fetchPrompts(): Prompt[] {
  const rows = db
    .prepare(
      `SELECT id, title, category, keywords, prompt, note
         FROM prompts
     ORDER BY sort_order ASC, id ASC`,
    )
    .all() as PromptRow[];
  return rows.map(rowToPrompt);
}

export function createPrompt(input: PromptInput): void {
  const { maxOrder } = db
    .prepare("SELECT COALESCE(MAX(sort_order), 0) AS maxOrder FROM prompts")
    .get() as { maxOrder: number };

  db.prepare(
    `INSERT INTO prompts (id, title, category, keywords, prompt, note, sort_order)
     VALUES (@id, @title, @category, @keywords, @prompt, @note, @sortOrder)`,
  ).run({
    id: `p-${randomUUID().slice(0, 8)}`,
    title: input.title.trim(),
    category: input.category,
    keywords: JSON.stringify(input.keywords),
    prompt: input.prompt.trim(),
    note: input.note.trim() || null,
    sortOrder: maxOrder + 1,
  });
}

export function updatePrompt(id: string, input: PromptInput): boolean {
  const result = db
    .prepare(
      `UPDATE prompts
          SET title = @title,
              category = @category,
              keywords = @keywords,
              prompt = @prompt,
              note = @note,
              updated_at = datetime('now')
        WHERE id = @id`,
    )
    .run({
      id,
      title: input.title.trim(),
      category: input.category,
      keywords: JSON.stringify(input.keywords),
      prompt: input.prompt.trim(),
      note: input.note.trim() || null,
    });
  return result.changes > 0;
}

export function deletePrompt(id: string): boolean {
  const result = db.prepare("DELETE FROM prompts WHERE id = ?").run(id);
  return result.changes > 0;
}
