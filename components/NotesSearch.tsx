"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useCallback } from "react";
import { Search } from "lucide-react";

const NotesSearch = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("search") || "");

  const handleSearch = useCallback(
    (value: string) => {
      setQuery(value);
      const params = new URLSearchParams();
      if (value.trim()) {
        params.set("search", value.trim());
      }
      router.push(`/notes${params.toString() ? `?${params.toString()}` : ""}`);
    },
    [router]
  );

  return (
    <div className="relative w-full max-w-sm">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
      <input
        type="text"
        placeholder="Search notes..."
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-colors"
        aria-label="Search notes"
      />
    </div>
  );
};

export default NotesSearch;
