"use client";

type SearchBoxProps = {
  value: string;
  onChange: (value: string) => void;
};

export default function SearchBox({ value, onChange }: SearchBoxProps) {
  return (
    <div className="relative">
      <svg
        className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="7" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>

      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="输入模糊关键词，如：森林 少女、赛博朋克、senlin、柔光…"
        autoFocus
        className="w-full rounded-2xl border border-slate-200 bg-white py-4 pl-14 pr-12 text-base text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
      />

      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="清空"
          className="absolute right-4 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
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
      )}
    </div>
  );
}
