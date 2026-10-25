"use client";

import { useEffect, useRef } from "react";
import { CATEGORIES } from "@/lib/categories";
import { COLOR_PRESETS, type Filters } from "@/lib/filter";

type Props = {
  filters: Filters;
  onChange: (next: Filters) => void;
  categories: string[];
};

const chip =
  "label field px-2.5 py-1 text-muted transition-colors hover:text-ink aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-paper";

export function FilterBar({ filters, onChange, categories }: Props) {
  const search = useRef<HTMLInputElement>(null);
  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch });
  const active = filters.q || filters.color || filters.category;
  const presetMatch = COLOR_PRESETS.some((c) => c.hex === filters.color);

  // "/" jumps to search from anywhere that isn't a text field.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || (e.target as HTMLElement).closest("input, textarea, select, [contenteditable]")) return;
      e.preventDefault();
      search.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="mb-6 space-y-3">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <label className="flex min-w-56 flex-1 items-center gap-2 border-b border-line focus-within:border-ink">
          <span className="sr-only">Search</span>
          <input
            ref={search}
            type="search"
            value={filters.q}
            onChange={(e) => set({ q: e.target.value })}
            onKeyDown={(e) => e.key === "Escape" && (set({ q: "" }), e.currentTarget.blur())}
            placeholder="Search titles, notes, credits"
            className="w-full bg-transparent py-2 outline-none placeholder:text-muted/70 focus-visible:outline-none"
          />
          <kbd className="label field px-1.5 text-muted">/</kbd>
        </label>

        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by colour">
          {COLOR_PRESETS.map((c) => {
            const on = filters.color === c.hex;
            return (
              <button
                key={c.hex}
                type="button"
                title={c.name}
                aria-label={`${c.name}${on ? " (selected)" : ""}`}
                aria-pressed={on}
                onClick={() => set({ color: on ? null : c.hex })}
                className={`size-6 rounded-full border border-line transition-transform hover:scale-110 ${on ? "ring-2 ring-ink ring-offset-2 ring-offset-paper" : ""}`}
                style={{ background: c.hex }}
              />
            );
          })}
          <label
            title="Any colour"
            className={`relative grid size-6 cursor-pointer place-items-center overflow-hidden rounded-full border border-line ${
              filters.color && !presetMatch ? "ring-2 ring-ink ring-offset-2 ring-offset-paper" : ""
            }`}
            style={{
              background:
                filters.color && !presetMatch
                  ? filters.color
                  : "conic-gradient(#ff4f4f, #ffd84f, #4fff7a, #4fd8ff, #7a4fff, #ff4fd8, #ff4f4f)",
            }}
          >
            <span className="sr-only">Pick any colour</span>
            <input
              type="color"
              value={filters.color ?? "#ff4f9a"}
              onChange={(e) => set({ color: e.target.value })}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
          </label>
        </div>
      </div>

      {(categories.length > 0 || active) && (
        <div className="flex flex-wrap items-center gap-1.5">
          {CATEGORIES.filter((c) => categories.includes(c)).map((c) => (
            <button key={c} type="button" aria-pressed={filters.category === c} onClick={() => set({ category: filters.category === c ? null : c })} className={chip}>
              {c}
            </button>
          ))}
          {active && (
            <button type="button" onClick={() => onChange({ q: "", color: null, category: null })} className="label ml-auto px-2 py-1 text-muted underline-offset-2 hover:text-ink hover:underline">
              Clear filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}
