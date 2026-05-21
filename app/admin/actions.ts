"use server";

import { revalidatePath } from "next/cache";
import {
  createPrompt,
  deletePrompt,
  updatePrompt,
  type PromptInput,
} from "@/lib/prompts";
import {
  categoryExists,
  createCategory,
  deleteCategory,
  renameCategory,
} from "@/lib/categories";

type ActionResult = { ok: true } | { ok: false; error: string };

function refresh() {
  revalidatePath("/");
  revalidatePath("/admin");
}

// ---------------------------------------------------------------- prompts ---

async function validatePrompt(input: PromptInput): Promise<string | null> {
  if (!input.title.trim()) return "请填写标题";
  if (!(await categoryExists(input.category))) {
    return "分类无效，请先在分类管理中创建";
  }
  if (input.keywords.length === 0) return "请至少添加一个查询词语";
  if (!input.prompt.trim()) return "请填写提示词内容";
  return null;
}

export async function createPromptAction(
  input: PromptInput,
): Promise<ActionResult> {
  const error = await validatePrompt(input);
  if (error) return { ok: false, error };
  await createPrompt(input);
  refresh();
  return { ok: true };
}

export async function updatePromptAction(
  id: string,
  input: PromptInput,
): Promise<ActionResult> {
  const error = await validatePrompt(input);
  if (error) return { ok: false, error };
  if (!(await updatePrompt(id, input))) {
    return { ok: false, error: "没有找到要更新的提示词" };
  }
  refresh();
  return { ok: true };
}

export async function deletePromptAction(id: string): Promise<ActionResult> {
  if (!(await deletePrompt(id))) {
    return { ok: false, error: "删除失败：提示词不存在" };
  }
  refresh();
  return { ok: true };
}

// ------------------------------------------------------------- categories ---

export async function createCategoryAction(
  name: string,
): Promise<ActionResult> {
  const result = await createCategory(name);
  if (result.ok) refresh();
  return result;
}

export async function renameCategoryAction(
  id: number,
  name: string,
): Promise<ActionResult> {
  const result = await renameCategory(id, name);
  if (result.ok) refresh();
  return result;
}

export async function deleteCategoryAction(id: number): Promise<ActionResult> {
  const result = await deleteCategory(id);
  if (result.ok) refresh();
  return result;
}
