import Link from "next/link";
import { source } from "@/lib/source";
import type { Metadata } from "next";

export default async function SitemapPage() {
  const pages = source.getPages();
  
  // Group pages by their first slug (section)
  const sections = new Map<string, Array<{ title: string; url: string; description?: string }>>();
  
  for (const page of pages) {
    const section = page.slugs[0] || "root";
    if (!sections.has(section)) {
      sections.set(section, []);
    }
    sections.get(section)!.push({
      title: page.data.title,
      url: `/docs/${page.slugs.join("/")}`,
      description: page.data.description,
    });
  }
  
  // Sort sections
  const sortedSections = Array.from(sections.entries()).sort((a, b) => {
    if (a[0] === "index") return -1;
    if (b[0] === "index") return 1;
    return a[0].localeCompare(b[0]);
  });
  
  const sectionNames: Record<string, string> = {
    index: "Home",
    "getting-started": "Getting Started",
    guide: "Guide",
    guides: "Guides",
    patterns: "Patterns",
    reference: "API Reference",
    advanced: "Advanced",
    "project-info": "Project Info",
    management: "Management",
    migrations: "Migrations",
  };
  
  return (
    <div className="container max-w-5xl mx-auto py-12 px-6">
      <header className="mb-12">
        <h1 className="text-4xl font-bold mb-4">Site Map</h1>
        <p className="text-lg text-muted-foreground">
          Complete sitemap of all documentation pages for easy navigation and indexing
        </p>
      </header>
      
      <div className="prose prose-neutral dark:prose-invert max-w-none">
        <div className="space-y-8">
          {sortedSections.map(([section, pages]) => (
            <section key={section} className="border-b border-border pb-8 last:border-b-0">
              <h2 className="text-3xl font-bold mb-4 capitalize">
                {sectionNames[section] || section.replace(/-/g, " ")}
              </h2>
              <ul className="space-y-3">
                {pages.sort((a, b) => a.title.localeCompare(b.title)).map((page) => (
                  <li key={page.url} className="flex flex-col gap-1">
                    <Link
                      href={page.url}
                      className="text-lg font-semibold text-foreground hover:text-primary hover:underline transition-colors block"
                    >
                      {page.title}
                    </Link>
                    {page.description && (
                      <p className="text-sm text-muted-foreground ml-0 mt-1">
                        {page.description}
                      </p>
                    )}
                    <span className="text-xs text-muted-foreground ml-0 mt-1 block font-mono">
                      {page.url}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
        
        <div className="mt-12 p-6 bg-muted rounded-lg">
          <h3 className="text-xl font-semibold mb-2">Quick Stats</h3>
          <ul className="text-sm space-y-1 text-muted-foreground">
            <li>Total Pages: {pages.length}</li>
            <li>Sections: {sections.size}</li>
            <li>
              <Link href="/sitemap.xml" className="hover:underline text-primary">
                XML Sitemap (for search engines) →
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export async function generateMetadata() {
  return {
    title: "Site Map - CosmosQL Documentation",
    description: "Complete sitemap of all CosmosQL documentation pages",
  };
}
