import Link from "next/link";

const FEATURES = [
  {
    name: "Migrations",
    detail:
      "Versioned up and down migrations with dry-run plans, checksums and rollback.",
    snippet: "defineMigration({ up, down })",
    href: "/docs/guides/schema-migrations",
  },
  {
    name: "Bulk operations",
    detail:
      "updateMany and deleteMany in batches, with progress callbacks and retries.",
    snippet: "updateMany({ onProgress })",
    href: "/docs/guides/updating-documents#bulk-operations",
  },
  {
    name: "Aggregations",
    detail: "count, sum, avg, min, max and groupBy, typed end to end.",
    snippet: 'groupBy({ by: "category" })',
    href: "/docs/guides/aggregations",
  },
  {
    name: "Management",
    detail:
      "Health checks, schema drift detection and orphaned container cleanup.",
    snippet: "management.diffSchema()",
    href: "/docs/guides/database-management",
  },
  {
    name: "Retries",
    detail:
      "Throttled and unavailable responses back off and retry on their own.",
    snippet: "retryOptions: { maxRetries: 3 }",
    href: "/docs/guides/error-handling",
  },
  {
    name: "Raw SQL",
    detail: "Drop down to Cosmos SQL with parameters and a typed result.",
    snippet: "query<T>({ sql, parameters })",
    href: "/docs/reference/query-methods",
  },
];

export function FeatureIndex() {
  return (
    <ul className="reveal border-t border-rule-strong">
      {FEATURES.map((feature, index) => (
        <li key={feature.name} className="border-b border-rule">
          <Link
            href={feature.href}
            className="group grid grid-cols-[2.5rem_minmax(0,1fr)_1.5rem] items-baseline gap-x-4 gap-y-1 py-5 transition-colors hover:bg-paper-raised md:grid-cols-[3rem_11rem_minmax(0,1fr)_minmax(0,17rem)_1.5rem] md:px-2"
          >
            <span className="font-mono text-[12px] text-ink-3">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="text-[16px] font-medium text-ink decoration-signal underline-offset-4 group-hover:underline">
              {feature.name}
            </span>
            <span className="col-start-2 row-start-2 text-[14px] leading-snug text-ink-2 md:col-start-auto md:row-start-auto">
              {feature.detail}
            </span>
            <code className="col-start-2 row-start-3 truncate font-mono text-[12px] text-ink-3 md:col-start-auto md:row-start-auto">
              {feature.snippet}
            </code>
            <span
              className="col-start-3 row-start-1 text-ink-3 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-signal md:col-start-auto md:row-start-auto"
              aria-hidden="true"
            >
              →
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
