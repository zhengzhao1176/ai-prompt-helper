"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import SearchBox from "@/components/SearchBox";
import CategoryFilter, { type CategoryOption } from "@/components/CategoryFilter";
import PromptCard from "@/components/PromptCard";
import { ALL_CATEGORY, createSearchEngine, type Prompt } from "@/lib/search";

export default function PromptExplorer({
  prompts,
  categories,
}: {
  prompts: Prompt[];
  categories: string[];
}) {
  const engine = useMemo(() => createSearchEngine(prompts), [prompts]);

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>(ALL_CATEGORY);

  const trimmed = query.trim();
  const isSearching = trimmed.length > 0;

  // 每次搜索词变化，分类筛选回到「全部」：先看全部结果，再按分类细分。
  useEffect(() => {
    setCategory(ALL_CATEGORY);
  }, [trimmed]);

  // 搜索结果（跨全部分类）—— 用来派生「可选择的分类」。
  const searchResults = useMemo(
    () => (isSearching ? engine.search(trimmed) : null),
    [engine, trimmed, isSearching],
  );

  // 搜索结果里每个分类的命中数。
  const facetCounts = useMemo(() => {
    if (!searchResults) return null;
    const counts = new Map<string, number>();
    for (const item of searchResults) {
      counts.set(item.category, (counts.get(item.category) ?? 0) + 1);
    }
    return counts;
  }, [searchResults]);

  // 分类筛选项（带数量）。搜索态：只列出结果里出现的分类；浏览态：列出全部分类。
  const categoryOptions = useMemo<CategoryOption[]>(() => {
    if (searchResults && facetCounts) {
      const options: CategoryOption[] = [
        { name: ALL_CATEGORY, count: searchResults.length },
      ];
      for (const name of categories) {
        const count = facetCounts.get(name);
        if (count) options.push({ name, count });
      }
      return options;
    }
    return [
      { name: ALL_CATEGORY, count: prompts.length },
      ...categories.map((name) => ({
        name,
        count: prompts.filter((item) => item.category === name).length,
      })),
    ];
  }, [searchResults, facetCounts, categories, prompts]);

  // 最终展示的结果。
  const results = useMemo(() => {
    if (searchResults) {
      return category === ALL_CATEGORY
        ? searchResults
        : searchResults.filter((item) => item.category === category);
    }
    if (category !== ALL_CATEGORY) return engine.getByCategory(category);
    return engine.getFeatured();
  }, [searchResults, category, engine]);

  const heading = isSearching
    ? category === ALL_CATEGORY
      ? `找到 ${results.length} 条匹配`
      : `「${category}」· ${results.length} 条`
    : category !== ALL_CATEGORY
      ? `${category} · ${results.length} 条`
      : "热门推荐";

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
      <div className="mb-2 flex justify-end">
        <Link
          href="/admin"
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-500 ring-1 ring-inset ring-slate-200 transition hover:bg-white hover:text-slate-700"
        >
          管理词库
        </Link>
      </div>

      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          AI 绘画提示词助手
        </h1>
        <p className="mt-3 text-sm text-slate-500 sm:text-base">
          输入几个模糊的词，自动匹配你可能需要的提示词 · 内置 {prompts.length} 条词库
        </p>
      </header>

      <div className="mx-auto max-w-2xl">
        <SearchBox value={query} onChange={setQuery} />
        <p className="mt-2 px-1 text-xs text-slate-400">
          支持模糊匹配、拼音（如 senlin）与多个关键词；搜索后可点下方分类进一步筛选
        </p>
      </div>

      {categoryOptions.length > 1 && (
        <div className="mt-6">
          {isSearching && (
            <p className="mb-2 text-xs text-slate-400">在结果中按分类筛选：</p>
          )}
          <CategoryFilter
            options={categoryOptions}
            active={category}
            onChange={setCategory}
          />
        </div>
      )}

      <section className="mt-8">
        <h2 className="mb-4 text-sm font-medium text-slate-500">{heading}</h2>

        {results.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center">
            <p className="text-slate-500">没有找到匹配的提示词</p>
            <p className="mt-1.5 text-sm text-slate-400">
              换个说法试试，或在「管理词库」里新增提示词
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((prompt) => (
              <PromptCard key={prompt.id} prompt={prompt} />
            ))}
          </div>
        )}
      </section>

      <footer className="mt-14 text-center text-xs text-slate-400">
        匹配到的提示词可直接复制，用于 Midjourney / Stable Diffusion 等绘画工具
      </footer>
    </main>
  );
}
