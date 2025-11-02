import { createRelativeLink } from "fumadocs-ui/mdx";
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from "fumadocs-ui/page";
import type { Metadata } from "next";
import { source } from "@/lib/source";
import { getMDXComponents } from "@/mdx-components";

export default async function AllDocsPage() {
  const pages = source.getPages();

  return (
    <DocsPage full>
      <DocsTitle>Complete Documentation</DocsTitle>
      <DocsDescription>
        All documentation pages compiled into a single view for easy reference
        and LLM consumption.
      </DocsDescription>
      <DocsBody>
        <div className="mb-12 p-6 bg-muted rounded-lg">
          <h2 className="text-2xl font-semibold mb-4">Table of Contents</h2>
          <nav className="space-y-2">
            {pages.map((page) => {
              const url = `/docs/${page.slugs.join("/")}`;
              const indent =
                page.slugs.length > 1 ? (page.slugs.length - 1) * 20 : 0;

              return (
                <a
                  key={url}
                  href={`#${page.slugs.join("-")}`}
                  className="block text-sm hover:text-foreground text-muted-foreground hover:underline"
                  style={{ paddingLeft: `${indent}px` }}
                >
                  {page.data.title}
                </a>
              );
            })}
          </nav>
        </div>

        <div className="space-y-16">
          {pages.map((page) => {
            const MDX = page.data.body;
            const url = `/docs/${page.slugs.join("/")}`;

            return (
              <article
                key={url}
                id={page.slugs.join("-")}
                className="scroll-mt-20 border-b border-border pb-16 last:border-b-0"
              >
                <div className="mb-8">
                  <h1 className="text-4xl font-bold mb-2">{page.data.title}</h1>
                  {page.data.description && (
                    <p className="text-muted-foreground text-lg mb-4">
                      {page.data.description}
                    </p>
                  )}
                  <a
                    href={url}
                    className="text-sm text-muted-foreground hover:text-foreground underline"
                  >
                    View on separate page →
                  </a>
                </div>
                <MDX
                  components={getMDXComponents({
                    a: createRelativeLink(source, page),
                  })}
                />
              </article>
            );
          })}
        </div>
      </DocsBody>
    </DocsPage>
  );
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Complete Documentation",
    description: "All CosmosQL documentation pages compiled into a single view",
  };
}
