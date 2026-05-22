"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { updatePromptAction } from "@/app/admin/actions";
import type { Prompt } from "@/lib/search";

// 与后台一致:空白、中英文逗号、顿号都作为分隔符。
function splitKeywords(text: string): string[] {
  return text
    .split(/[\s,，、]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

type PromptEditDialogProps = {
  prompt: Prompt;
  categories: string[];
  onClose: () => void;
};

// 首页搜索结果上的「快速编辑」弹窗 —— 复用后台的 updatePromptAction。
export default function PromptEditDialog({
  prompt,
  categories,
  onClose,
}: PromptEditDialogProps) {
  const [title, setTitle] = useState(prompt.title);
  const [category, setCategory] = useState(prompt.category);
  const [keywords, setKeywords] = useState<string[]>(prompt.keywords);
  const [keywordDraft, setKeywordDraft] = useState("");
  const [promptText, setPromptText] = useState(prompt.prompt);
  const [note, setNote] = useState(prompt.note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // 当前分类可能已被删除 —— 仍把它列进去,避免下拉框丢失当前值。
  const categoryOptions = categories.includes(category)
    ? categories
    : [category, ...categories];

  // 打开时锁定页面滚动。
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  // Esc 关闭(保存中除外)。
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isPending) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isPending, onClose]);

  function addKeywords(text: string) {
    const parts = splitKeywords(text);
    if (parts.length === 0) return;
    setKeywords((current) => {
      const next = [...current];
      for (const part of parts) {
        if (!next.includes(part)) next.push(part);
      }
      return next;
    });
    setKeywordDraft("");
  }

  function removeKeyword(keyword: string) {
    setKeywords((current) => current.filter((item) => item !== keyword));
  }

  function submit() {
    // 把输入框里还没成 chip 的残留文字也并进去。
    const finalKeywords = [...keywords];
    for (const part of splitKeywords(keywordDraft)) {
      if (!finalKeywords.includes(part)) finalKeywords.push(part);
    }
    setError(null);
    startTransition(async () => {
      const result = await updatePromptAction(prompt.id, {
        title,
        category,
        keywords: finalKeywords,
        prompt: promptText,
        note,
      });
      if (result.ok) {
        onClose();
      } else {
        setError(result.error);
      }
    });
  }

  const inputClass =
    "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100";

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 sm:items-center"
      onMouseDown={(event) => {
        // 仅点到背景(而非弹窗内部)才关闭。
        if (event.target === event.currentTarget && !isPending) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="编辑提示词"
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">编辑提示词</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            aria-label="关闭"
            className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-600">
              标题
            </span>
            <input
              autoFocus
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className={inputClass}
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-600">
              分类
            </span>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className={inputClass}
            >
              {categoryOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4">
          <span className="mb-1 block text-sm font-medium text-slate-600">
            查询词语（用户搜索时用来匹配）
          </span>
          <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-slate-200 p-2 transition focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-100">
            {keywords.map((keyword) => (
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
              onChange={(event) => setKeywordDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === ",") {
                  event.preventDefault();
                  addKeywords(keywordDraft);
                } else if (
                  event.key === "Backspace" &&
                  keywordDraft === "" &&
                  keywords.length > 0
                ) {
                  removeKeyword(keywords[keywords.length - 1]);
                }
              }}
              onBlur={() => addKeywords(keywordDraft)}
              placeholder={
                keywords.length === 0 ? "输入词语后按回车" : "继续添加…"
              }
              className="min-w-[8rem] flex-1 bg-transparent px-1 py-1 text-sm outline-none"
            />
          </div>
        </div>

        <label className="mt-4 block">
          <span className="mb-1 block text-sm font-medium text-slate-600">
            提示词内容
          </span>
          <textarea
            value={promptText}
            onChange={(event) => setPromptText(event.target.value)}
            rows={8}
            className={`${inputClass} resize-y font-mono leading-relaxed`}
          />
        </label>

        <label className="mt-4 block">
          <span className="mb-1 block text-sm font-medium text-slate-600">
            备注（可选）
          </span>
          <input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className={inputClass}
          />
        </label>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 ring-1 ring-inset ring-slate-200 transition hover:bg-slate-50 disabled:opacity-50"
          >
            取消
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={isPending}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50"
          >
            {isPending ? "保存中…" : "保存"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
