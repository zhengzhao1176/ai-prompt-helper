import PromptExplorer from "@/components/PromptExplorer";
import { fetchCategories } from "@/lib/categories";
import { fetchPrompts } from "@/lib/prompts";
import type { Prompt } from "@/lib/search";

// The word library lives in a local SQLite database — read it fresh on every
// request so edits made in the admin page show up on the next load.
export const dynamic = "force-dynamic";

type PageData = { prompts: Prompt[]; categories: string[] };

function loadData(): PageData | null {
  try {
    return {
      prompts: fetchPrompts(),
      categories: fetchCategories().map((category) => category.name),
    };
  } catch (error) {
    console.error("[prompt-helper] failed to read the SQLite database:", error);
    return null;
  }
}

export default function Home() {
  const data = loadData();

  if (data === null) {
    return (
      <SetupNotice
        title="数据库读取失败"
        message="无法读取本地 SQLite 数据库（data/prompts.db）。"
        steps={["npm run db:seed", "刷新本页面"]}
      />
    );
  }

  if (data.prompts.length === 0) {
    return (
      <SetupNotice
        title="词库为空"
        message="SQLite 数据库已就绪，但里面还没有提示词。"
        steps={["npm run db:seed", "刷新本页面"]}
      />
    );
  }

  return <PromptExplorer prompts={data.prompts} categories={data.categories} />;
}

function SetupNotice({
  title,
  message,
  steps,
}: {
  title: string;
  message: string;
  steps: string[];
}) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center px-6 py-20">
      <div className="w-full rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
        <h1 className="text-xl font-semibold text-amber-900">{title}</h1>
        <p className="mt-2 text-sm text-amber-700">{message}</p>
        <ol className="mt-5 space-y-2 text-left">
          {steps.map((step, index) => (
            <li
              key={step}
              className="flex items-center gap-3 rounded-lg bg-white px-3 py-2 text-sm text-slate-700 ring-1 ring-inset ring-amber-200"
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-white">
                {index + 1}
              </span>
              <code className="font-mono">{step}</code>
            </li>
          ))}
        </ol>
      </div>
    </main>
  );
}
