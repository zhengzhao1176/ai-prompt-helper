"use client";

import { useState, useTransition } from "react";
import type { Category } from "@/lib/categories";
import {
  createCategoryAction,
  deleteCategoryAction,
  renameCategoryAction,
} from "@/app/admin/actions";

export default function CategoryManager({
  categories,
}: {
  categories: Category[];
}) {
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [feedback, setFeedback] = useState<{
    kind: "ok" | "error";
    text: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  function add() {
    const name = newName.trim();
    if (!name) return;
    startTransition(async () => {
      const result = await createCategoryAction(name);
      if (result.ok) {
        setFeedback({ kind: "ok", text: `已添加分类「${name}」` });
        setNewName("");
      } else {
        setFeedback({ kind: "error", text: result.error });
      }
    });
  }

  function startRename(category: Category) {
    setEditingId(category.id);
    setEditName(category.name);
    setFeedback(null);
  }

  function saveRename(category: Category) {
    startTransition(async () => {
      const result = await renameCategoryAction(category.id, editName.trim());
      if (result.ok) {
        setFeedback({ kind: "ok", text: "分类已重命名" });
        setEditingId(null);
        setEditName("");
      } else {
        setFeedback({ kind: "error", text: result.error });
      }
    });
  }

  function remove(category: Category) {
    if (!window.confirm(`确定删除分类「${category.name}」？`)) return;
    startTransition(async () => {
      const result = await deleteCategoryAction(category.id);
      setFeedback(
        result.ok
          ? { kind: "ok", text: `已删除分类「${category.name}」` }
          : { kind: "error", text: result.error },
      );
    });
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-800">分类管理</h2>
      <p className="mb-4 mt-1 text-sm text-slate-500">
        提示词的分类来自这里。重命名会同步更新该分类下的提示词；分类下还有提示词时不能删除。
      </p>

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

      <div className="mb-5 flex gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder="输入新分类名称"
          className="w-56 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
        />
        <button
          type="button"
          onClick={add}
          disabled={isPending}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50"
        >
          添加分类
        </button>
      </div>

      {categories.length === 0 ? (
        <p className="text-sm text-slate-400">还没有分类，先添加一个。</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <li
              key={category.id}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5"
            >
              {editingId === category.id ? (
                <>
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        saveRename(category);
                      }
                    }}
                    autoFocus
                    className="w-28 rounded border border-slate-300 px-2 py-0.5 text-sm outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => saveRename(category)}
                    disabled={isPending}
                    className="text-sm font-medium text-indigo-600 disabled:opacity-50"
                  >
                    保存
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="text-sm text-slate-400"
                  >
                    取消
                  </button>
                </>
              ) : (
                <>
                  <span className="text-sm font-medium text-slate-700">
                    {category.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => startRename(category)}
                    disabled={isPending}
                    className="text-xs text-slate-400 transition hover:text-indigo-600 disabled:opacity-50"
                  >
                    改名
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(category)}
                    disabled={isPending}
                    className="text-xs text-slate-400 transition hover:text-rose-600 disabled:opacity-50"
                  >
                    删除
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
