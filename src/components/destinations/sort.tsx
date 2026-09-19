"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { CustomSelect } from "../ui/custom-select";

export function SortSelect({ sort }: { sort: string }) {
  const router = useRouter();
  const search = useSearchParams();

  return (
    <label className="sort">
      <span>Sort by</span>
      <CustomSelect
        ariaLabel="Sort tips"
        value={sort}
        onValueChange={(nextSort) => {
          const params = new URLSearchParams(search);
          params.set("sort", nextSort);
          params.delete("cursor");
          router.push(`?${params}#tips`);
        }}
        options={[
          { value: "recent", label: "Recent visits" },
          { value: "newest", label: "Newest shared" },
        ]}
      />
    </label>
  );
}
