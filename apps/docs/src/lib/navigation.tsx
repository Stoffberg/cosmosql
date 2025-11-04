import Link from "next/link";
import { source } from "./source";

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
