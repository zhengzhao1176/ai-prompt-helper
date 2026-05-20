"use client";

import { useState } from "react";
import type { Prompt } from "@/lib/search";

const CATEGORY_BADGE: Record<string, string> = {
  主体角色: "bg-rose-50 text-rose-600 ring-rose-200",
  场景背景: "bg-emerald-50 text-emerald-600 ring-emerald-200",
  风格画风: "bg-violet-50 text-violet-600 ring-violet-200",
  光照: "bg-amber-50 text-amber-700 ring-amber-200",
  氛围情绪: "bg-sky-50 text-sky-600 ring-sky-200",
  构图镜头: "bg-indigo-50 text-indigo-600 ring-indigo-200",
  画质增强: "bg-slate-100 text-slate-600 ring-slate-200",
};

export default function PromptCard({ prompt }: { prompt: Prompt }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(prompt.prompt);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = prompt.prompt;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  const badgeClass = CATEGORY_BADGE[prompt.category] ?? CATEGORY_BADGE["画质增强"];

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-base font-semibold text-slate-800">
          {prompt.title}
        </h3>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${badgeClass}`}
        >
          {prompt.category}
        </span>
      </div>

      <p className="rounded-xl bg-slate-50 px-3 py-2.5 font-mono text-sm leading-relaxed text-slate-700">
        {prompt.prompt}
      </p>

      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-slate-400">{prompt.note ?? ""}</span>
        <button
          type="button"
          onClick={handleCopy}
          className={
            copied
              ? "flex shrink-0 items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-600 transition"
              : "flex shrink-0 items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-indigo-700"
          }
        >
          {copied ? (
            <>
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              已复制
            </>
          ) : (
            <>
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="9" y="9" width="13" height="13" rx="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              复制
            </>
          )}
        </button>
      </div>
    </div>
  );
}
