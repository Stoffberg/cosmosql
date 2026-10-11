import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import { BrandMark } from "@/components/home/brand-mark";
import { GITHUB_URL } from "@/lib/site";

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <>
          <BrandMark className="size-[18px]" />
          <span className="font-display text-[15px] font-medium tracking-tight">
            cosmosql
          </span>
        </>
      ),
      url: "/",
    },
    links: [
      {
        text: "Introduction",
        url: "/docs",
        active: "nested-url",
      },
      {
        text: "Guide",
        url: "/docs/guide/core-concepts",
      },
      {
        text: "API Reference",
        url: "/docs/reference/api-reference",
      },
    ],
    githubUrl: GITHUB_URL,
  };
}
