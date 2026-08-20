"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import type { Category } from "@/lib/types";
import { Input } from "@/components/ui/Input";

export function BrowseFilters({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") ?? "");

  function pushParams(next: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    router.push(`/browse?${params.toString()}`);
  }

  return (
    <div className="flex flex-col sm:flex-row gap-4 mb-10">
      <form
        className="flex-1"
        onSubmit={(e) => {
          e.preventDefault();
          pushParams({ q: q || null });
        }}
      >
        <Input
          type="search"
          placeholder="Search plugins..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </form>
      <select
        value={searchParams.get("category") ?? ""}
        onChange={(e) => pushParams({ category: e.target.value || null })}
        className="border border-border px-3.5 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:border-foreground sm:w-56"
      >
        <option value="">All categories</option>
        {categories.map((c) => (
          <option key={c.id} value={c.slug}>
            {c.name}
          </option>
        ))}
      </select>
    </div>
  );
}
