"use client";

import { useSearchContext } from "fumadocs-ui/contexts/search";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { CHANGELOG_URL, GITHUB_URL } from "@/lib/site";
import { BrandMark } from "./brand-mark";

const NAV_LINKS = [
  { label: "Docs", href: "/docs" },
  { label: "Guides", href: "/docs/guides/crud-operations" },
  { label: "API", href: "/docs/reference/api-reference" },
  { label: "Changelog", href: CHANGELOG_URL },
];

type SiteHeaderProps = {
  version: string;
};

export function SiteHeader({ version }: SiteHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-rule bg-paper/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[1240px] items-center gap-6 border-x border-rule px-5 lg:px-6">
        <Link
          href="/"
          className="group flex items-center gap-2.5 text-ink"
          aria-label="CosmosQL home"
        >
          <BrandMark className="size-[19px] transition-transform duration-500 group-hover:rotate-90" />
          <span className="font-display text-[15px] font-medium tracking-tight">
            cosmosql
          </span>
          <span className="hidden border border-rule px-1.5 py-px font-mono text-[11px] text-ink-3 sm:inline">
            v{version}
          </span>
        </Link>

        <nav className="ml-auto hidden items-center md:flex" aria-label="Main">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="px-3 py-1.5 text-[14px] text-ink-2 transition-colors hover:text-ink"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <SearchButton />
          <a
            href={GITHUB_URL}
            className="flex size-8 items-center justify-center text-ink-2 transition-colors hover:text-ink"
            aria-label="CosmosQL on GitHub"
          >
            <GitHubIcon />
          </a>
          <ThemeSwitch />
        </div>
      </div>
    </header>
  );
}

function SearchButton() {
  const { setOpenSearch } = useSearchContext();

  return (
    <button
      type="button"
      onClick={() => setOpenSearch(true)}
      className="flex h-8 items-center gap-3 border border-rule px-2.5 text-[13px] text-ink-3 transition-colors hover:border-rule-strong hover:text-ink"
    >
      <span>Search</span>
      <kbd className="hidden font-mono text-[11px] sm:inline">⌘K</kbd>
    </button>
  );
}

function ThemeSwitch() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && resolvedTheme === "dark";
  const nextTheme = isDark ? "light" : "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(nextTheme)}
      className="flex size-8 items-center justify-center text-ink-2 transition-colors hover:text-ink"
      aria-label={`Switch to ${nextTheme} theme`}
    >
      <svg
        viewBox="0 0 16 16"
        className="size-4 transition-transform duration-500"
        style={{ transform: isDark ? "rotate(180deg)" : "rotate(0deg)" }}
        aria-hidden="true"
      >
        <circle
          cx="8"
          cy="8"
          r="6.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
        />
        <path d="M8 1.5a6.5 6.5 0 0 1 0 13z" fill="currentColor" />
      </svg>
    </button>
  );
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-4" aria-hidden="true">
      <path
        fill="currentColor"
        d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"
      />
    </svg>
  );
}
