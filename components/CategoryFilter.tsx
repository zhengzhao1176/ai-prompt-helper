"use client";

export type CategoryOption = {
  name: string;
  count: number;
};

type CategoryFilterProps = {
  options: CategoryOption[];
  active: string;
  onChange: (category: string) => void;
};

export default function CategoryFilter({
  options,
  active,
  onChange,
}: CategoryFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(({ name, count }) => {
        const isActive = name === active;
        return (
          <button
            key={name}
            type="button"
            onClick={() => onChange(name)}
            className={
              isActive
                ? "flex items-center gap-1.5 rounded-full bg-indigo-600 px-3.5 py-1.5 text-sm font-medium text-white shadow-sm transition"
                : "flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-sm font-medium text-slate-600 ring-1 ring-inset ring-slate-200 transition hover:bg-slate-50"
            }
          >
            <span>{name}</span>
            <span
              className={
                isActive
                  ? "text-xs font-normal text-indigo-200"
                  : "text-xs font-normal text-slate-400"
              }
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
