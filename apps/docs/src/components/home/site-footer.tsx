import Link from "next/link";
import { CHANGELOG_URL, GITHUB_URL, NPM_URL, QUICKSTART_URL } from "@/lib/site";
import { BrandMark } from "./brand-mark";

const FOOTER_COLUMNS = [
  {
    title: "Docs",
    links: [
      { label: "Quickstart", href: QUICKSTART_URL },
      { label: "Guides", href: "/docs/guides/crud-operations" },
      { label: "API reference", href: "/docs/reference/api-reference" },
      {
        label: "From the Azure SDK",
        href: "/docs/project-info/migrating-from-azure-sdk",
      },
    ],
  },
  {
    title: "Project",
    links: [
      { label: "GitHub", href: GITHUB_URL },
      { label: "npm", href: NPM_URL },
      { label: "Changelog", href: CHANGELOG_URL },
      { label: "Issues", href: `${GITHUB_URL}/issues` },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-rule">
      <div className="mx-auto grid max-w-[1240px] border-x border-rule lg:grid-cols-[200px_minmax(0,1fr)]">
        <div className="px-5 py-10 lg:border-r lg:border-rule lg:px-6">
          <Link href="/" className="flex items-center gap-2.5 text-ink">
            <BrandMark className="size-[19px]" />
            <span className="font-display text-[15px] font-medium">
              cosmosql
            </span>
          </Link>
        </div>
        <div className="grid gap-10 px-5 py-10 sm:grid-cols-[1fr_auto_auto] sm:gap-16 lg:px-12">
          <p className="max-w-sm text-[14px] leading-relaxed text-ink-3">
            MIT licensed. Azure and Cosmos DB are trademarks of Microsoft.
            CosmosQL is an independent open-source project.
          </p>
          {FOOTER_COLUMNS.map((column) => (
            <div key={column.title}>
              <p className="font-display text-[11px] uppercase tracking-[0.16em] text-ink-3">
                {column.title}
              </p>
              <ul className="mt-4 space-y-2.5 text-[14px]">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-ink-2 transition-colors hover:text-ink"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </footer>
  );
}
