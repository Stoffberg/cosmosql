import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { source } from "./source";
import type { InferPageType } from "fumadocs-core/source";

export function AllPagesNavigation() {
  const pages = source.getPages();
  
  // Group pages by their first slug (section)
  const sections = new Map<string, Array<{ title: string; url: string; slugs: string[] }>>();
  
  for (const page of pages) {
    const section = page.slugs[0] || "root";
    if (!sections.has(section)) {
      sections.set(section, []);
    }
    sections.get(section)!.push({
      title: page.data.title,
      url: `/docs/${page.slugs.join("/")}`,
      slugs: page.slugs,
    });
  }
  
  // Sort sections and pages
  const sortedSections = Array.from(sections.entries()).sort((a, b) => {
    // Put index first, then alphabetical
    if (a[0] === "index") return -1;
    if (b[0] === "index") return 1;
    return a[0].localeCompare(b[0]);
  });
  
  return (
    <nav className="mt-16 pt-8 border-t border-border">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-semibold">All Documentation Pages</h2>
        <Link
          href="/site-map"
          className="text-sm text-muted-foreground hover:text-foreground hover:underline"
        >
          View Full Sitemap →
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedSections.map(([section, pages]) => (
          <div key={section} className="space-y-2">
            <h3 className="font-semibold text-lg capitalize mb-2">
              {section === "index" ? "Home" : section.replace(/-/g, " ")}
            </h3>
            <ul className="space-y-1">
              {pages.sort((a, b) => a.title.localeCompare(b.title)).map((page) => (
                <li key={page.url}>
                  <Link
                    href={page.url}
                    className="text-sm text-muted-foreground hover:text-foreground hover:underline transition-colors"
                  >
                    {page.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  );
}

/**
 * Gets all pages in order based on their slugs
 * This respects the directory structure and provides a consistent ordering
 */
function getOrderedPages(): Array<InferPageType<typeof source>> {
  const pages = source.getPages();
  
  // Sort pages by their slug path to maintain order
  return [...pages].sort((a, b) => {
    const aPath = a.slugs.join("/") || "index";
    const bPath = b.slugs.join("/") || "index";
    
    // Index page always first
    if (aPath === "index") return -1;
    if (bPath === "index") return 1;
    
    // Compare paths lexicographically
    // This respects directory structure and meta.json ordering within directories
    return aPath.localeCompare(bPath);
  });
}

/**
 * Finds the previous and next pages for navigation
 */
export function getPreviousNextPages(
  currentPage: InferPageType<typeof source>
): {
  previous: InferPageType<typeof source> | null;
  next: InferPageType<typeof source> | null;
} {
  const orderedPages = getOrderedPages();
  const currentIndex = orderedPages.findIndex(
    (page) => page.slugs.join("/") === currentPage.slugs.join("/")
  );
  
  if (currentIndex === -1) {
    return { previous: null, next: null };
  }
  
  return {
    previous: currentIndex > 0 ? orderedPages[currentIndex - 1] : null,
    next: currentIndex < orderedPages.length - 1 ? orderedPages[currentIndex + 1] : null,
  };
}

/**
 * Navigation component showing previous and next page cards
 */
export function PreviousNextNavigation({
  currentPage,
}: {
  currentPage: InferPageType<typeof source>;
}) {
  const { previous, next } = getPreviousNextPages(currentPage);
  
  if (!previous && !next) {
    return null;
  }
  
  return (
    <nav className="mt-16 pt-8 border-t border-border">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {previous ? (
          <Link
            href={`/docs/${previous.slugs.join("/")}`}
            className="group flex items-start gap-4 p-4 rounded-lg border border-border hover:border-foreground/20 hover:bg-accent/50 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 mt-0.5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm text-muted-foreground group-hover:text-foreground transition-colors mb-1">
                Previous
              </div>
              <div className="font-semibold group-hover:underline">
                {previous.data.title}
              </div>
              {previous.data.description && (
                <div className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {previous.data.description}
                </div>
              )}
            </div>
          </Link>
        ) : (
          <div />
        )}
        
        {next ? (
          <Link
            href={`/docs/${next.slugs.join("/")}`}
            className="group flex items-start gap-4 p-4 rounded-lg border border-border hover:border-foreground/20 hover:bg-accent/50 transition-colors md:text-right"
          >
            <div className="flex-1 min-w-0">
              <div className="text-sm text-muted-foreground group-hover:text-foreground transition-colors mb-1">
                Next
              </div>
              <div className="font-semibold group-hover:underline">
                {next.data.title}
              </div>
              {next.data.description && (
                <div className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {next.data.description}
                </div>
              )}
            </div>
            <ChevronRight className="w-5 h-5 mt-0.5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
          </Link>
        ) : null}
      </div>
    </nav>
  );
}

export function SimplePageMap() {
  const pages = source.getPages();
  
  return (
    <div className="mt-16 pt-8 border-t border-border">
      <h2 className="text-xl font-semibold mb-4">Site Map</h2>
      <ul className="space-y-1 columns-1 md:columns-2 lg:columns-3 gap-4">
        {pages.map((page) => {
          const url = `/docs/${page.slugs.join("/")}`;
          return (
            <li key={url} className="break-inside-avoid mb-1">
              <Link
                href={url}
                className="text-sm text-muted-foreground hover:text-foreground hover:underline transition-colors"
              >
                {page.data.title}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
