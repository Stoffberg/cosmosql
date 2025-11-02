import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: "CosmosQL",
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
    githubUrl: "https://github.com/cosmosql/cosmosql",
  };
}
