import Link from "next/link";
import AdminClient from "@/components/AdminClient";
import CategoryManager from "@/components/CategoryManager";
import { fetchCategories } from "@/lib/categories";
import { fetchPrompts } from "@/lib/prompts";

export const dynamic = "force-dynamic";

export default function AdminPage() {
  const prompts = fetchPrompts();
  const categories = fetchCategories();

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
      <div className="mb-3">
        <Link
          href="/"
          className="text-sm text-slate-500 transition hover:text-slate-700"
        >
          ← 返回搜索页
        </Link>
      </div>

      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          提示词管理
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          管理分类与提示词 · 当前 {categories.length} 个分类、{prompts.length} 条提示词
        </p>
      </header>

      <div className="space-y-8">
        <CategoryManager categories={categories} />
        <AdminClient
          prompts={prompts}
          categories={categories.map((category) => category.name)}
        />
      </div>
    </main>
  );
}
