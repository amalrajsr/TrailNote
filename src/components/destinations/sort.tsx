"use client";
import { useRouter, useSearchParams } from "next/navigation";
export function SortSelect({ sort }: { sort: string }) {
  const router = useRouter(),
    search = useSearchParams();
  return (
    <label className="sort">
      Sort by{" "}
      <select
        className="field-input"
        value={sort}
        onChange={(e) => {
          const params = new URLSearchParams(search);
          params.set("sort", e.target.value);
          params.delete("cursor");
          router.push(`?${params}#tips`);
        }}
      >
        <option value="recent">Recent visits</option>
        <option value="newest">Newest shared</option>
      </select>
    </label>
  );
}
