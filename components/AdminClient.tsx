"use client";

import { useMemo, useState, useTransition } from "react";
import type { Prompt } from "@/lib/search";
import {
  createPromptAction,
  deletePromptAction,
  updatePromptAction,
} from "@/app/admin/actions";

type Draft = {
  title: string;
  category: string;
  keywords: string[];
  prompt: string;
  note: string;
};

function emptyDraft(defaultCategory: string): Draft {
  return {
    title: "",
    category: defaultCategory,
    keywords: [],
    prompt: "",
    note: "",
  };
}

function splitKeywords(text: string): string[] {
  return text
    .split(/[\s,，、]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export default function AdminClient({
  prompts,
  categories,
}: {
  prompts: Prompt[];
  categories: string[];
}) {
  const [draft, setDraft] = useState<Draft>(() =>
    emptyDraft(categories[0] ?? ""),
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [keywordDraft, setKeywordDraft] = useState("");
  const [filter, setFilter] = useState("");
  const [feedback, setFeedback] = useState<{
    kind: "ok" | "error";
    text: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return prompts;
    return prompts.filter((item) =>
      [item.title, item.category, item.prompt, ...item.keywords]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [prompts, filter]);

  function addKeywords(text: string) {
    const parts = splitKeywords(text);
    if (parts.length === 0) return;
    setDraft((current) => {
      const next = [...current.keywords];
      for (const part of parts) {
        if (!next.includes(part)) next.push(part);
      }
      return { ...current, keywords: next };
    });
    setKeywordDraft("");
  }

  function removeKeyword(keyword: string) {
    setDraft((current) => ({
      ...current,
      keywords: current.keywords.filter((item) => item !== keyword),
    }));
  }

  function startEdit(item: Prompt) {
    setEditingId(item.id);
    setDraft({
      title: item.title,
      category: item.category,
      keywords: [...item.keywords],
      prompt: item.prompt,
      note: item.note ?? "",
    });
    setKeywordDraft("");
    setFeedback(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setEditingId(null);
    setDraft(emptyDraft(categories[0] ?? ""));
    setKeywordDraft("");
  }

  function submit() {
    const keywords = [...draft.keywords];
    for (const part of splitKeywords(keywordDraft)) {
      if (!keywords.includes(part)) keywords.push(part);
    }
    const payload = {
      title: draft.title,
      category: draft.category,
      keywords,
      prompt: draft.prompt,
      note: draft.note,
    };

    startTransition(async () => {
      const result = editingId
        ? await updatePromptAction(editingId, payload)
        : await createPromptAction(payload);
      if (result.ok) {
        setFeedback({
          kind: "ok",
          text: editingId ? "已保存修改" : "已新增提示词",
        });
        resetForm();
      } else {
        setFeedback({ kind: "error", text: result.error });
      }
    });
  }

  function remove(item: Prompt) {
    if (!window.confirm(`确定删除「${item.title}」？`)) return;
    startTransition(async () => {
      const result = await deletePromptAction(item.id);
      if (result.ok) {
        setFeedback({ kind: "ok", text: `已删除「${item.title}」` });
        if (editingId === item.id) resetForm();
      } else {
        setFeedback({ kind: "error", text: result.error });
      }
    });
  }

  const inputClass =
    "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100";

  return (
    <div className="space-y-8">
      {/* ---------- add / edit form ---------- */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">
            {editingId ? "编辑提示词" : "新增提示词"}
          </h2>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="text-sm text-slate-500 transition hover:text-slate-700"
            >
              取消编辑
            </button>
          )}
        </div>

        {feedback && (
          <div
            className={
              feedback.kind === "ok"
                ? "mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
                : "mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700"
            }
          >
            {feedback.text}
          </div>
        )}

        {categories.length === 0 ? (
          <p className="text-sm text-slate-500">
            请先在上方「分类管理」里添加至少一个分类，然后才能新增提示词。
          </p>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-600">
                  标题（中文名）
                </span>
                <input
                  value={draft.title}
                  onChange={(e) =>
                    setDraft({ ...draft, title: e.target.value })
                  }
                  placeholder="例如：迷雾森林"
                  className={inputClass}
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-600">
                  分类
                </span>
                <select
                  value={draft.category}
                  onChange={(e) =>
                    setDraft({ ...draft, category: e.target.value })
                  }
                  className={inputClass}
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-4">
              <span className="mb-1 block text-sm font-medium text-slate-600">
                查询词语（用户搜索时用来匹配，可加多个）
              </span>
              <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-slate-200 p-2 transition focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-100">
                {draft.keywords.map((keyword) => (
                  <span
                    key={keyword}
                    className="flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-1 text-sm text-indigo-700"
                  >
                    {keyword}
                    <button
                      type="button"
                      onClick={() => removeKeyword(keyword)}
                      aria-label={`移除 ${keyword}`}
                      className="text-indigo-400 transition hover:text-indigo-700"
                    >
                      ×
                    </button>
                  </span>
                ))}
                <input
                  value={keywordDraft}
                  onChange={(e) => setKeywordDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === ",") {
                      e.preventDefault();
                      addKeywords(keywordDraft);
                    } else if (
                      e.key === "Backspace" &&
                      keywordDraft === "" &&
                      draft.keywords.length > 0
                    ) {
                      removeKeyword(draft.keywords[draft.keywords.length - 1]);
                    }
                  }}
                  onBlur={() => addKeywords(keywordDraft)}
                  placeholder={
                    draft.keywords.length === 0
                      ? "输入词语后按回车，支持中英文、拼音"
                      : "继续添加…"
                  }
                  className="min-w-[10rem] flex-1 bg-transparent px-1 py-1 text-sm outline-none"
                />
              </div>
            </div>

            <label className="mt-4 block">
              <span className="mb-1 block text-sm font-medium text-slate-600">
                提示词内容（可直接用于 Midjourney / Stable Diffusion）
              </span>
              <textarea
                value={draft.prompt}
                onChange={(e) => setDraft({ ...draft, prompt: e.target.value })}
                rows={3}
                placeholder="a misty forest at dawn, soft volumetric fog, dense trees"
                className={`${inputClass} font-mono`}
              />
            </label>

            <label className="mt-4 block">
              <span className="mb-1 block text-sm font-medium text-slate-600">
                备注（可选）
              </span>
              <input
                value={draft.note}
                onChange={(e) => setDraft({ ...draft, note: e.target.value })}
                placeholder="例如：氛围感背景"
                className={inputClass}
              />
            </label>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={submit}
                disabled={isPending}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50"
              >
                {isPending ? "处理中…" : editingId ? "保存修改" : "添加提示词"}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  disabled={isPending}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 ring-1 ring-inset ring-slate-200 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  取消
                </button>
              )}
            </div>
          </>
        )}
      </section>

      {/* ---------- existing prompts ---------- */}
      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-800">
            全部提示词
            <span className="ml-2 text-sm font-normal text-slate-400">
              {filtered.length} / {prompts.length}
            </span>
          </h2>
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="筛选标题 / 分类 / 关键词…"
            className="w-60 rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
          />
        </div>

        {filtered.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 bg-white py-10 text-center text-sm text-slate-400">
            没有匹配的提示词
          </p>
        ) : (
          <ul className="space-y-2">
            {filtered.map((item) => (
              <li
                key={item.id}
                className="rounded-xl border border-slate-200 bg-white p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-slate-800">
                        {item.title}
                      </h3>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                        {item.category}
                      </span>
                    </div>
                    <p className="mt-1 font-mono text-xs leading-relaxed text-slate-500">
                      {item.prompt}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {item.keywords.map((keyword) => (
                        <span
                          key={keyword}
                          className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500"
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <button
                      type="button"
                      onClick={() => startEdit(item)}
                      disabled={isPending}
                      className="rounded-lg px-2.5 py-1 text-sm font-medium text-indigo-600 ring-1 ring-inset ring-indigo-200 transition hover:bg-indigo-50 disabled:opacity-50"
                    >
                      编辑
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(item)}
                      disabled={isPending}
                      className="rounded-lg px-2.5 py-1 text-sm font-medium text-rose-600 ring-1 ring-inset ring-rose-200 transition hover:bg-rose-50 disabled:opacity-50"
                    >
                      删除
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
