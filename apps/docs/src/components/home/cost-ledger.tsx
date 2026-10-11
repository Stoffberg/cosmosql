const LEDGER_ROWS = [
  {
    operation: "Point read",
    call: "findUnique({ where: { id, email } })",
    requestUnits: { low: 1, high: 1, label: "1" },
    policy: "The default. Won't compile without the partition key.",
    isExpensive: false,
  },
  {
    operation: "Partition query",
    call: "findMany({ partitionKey, where })",
    requestUnits: { low: 3, high: 5, label: "3–5" },
    policy: "Filters, sorting and paging inside one partition.",
    isExpensive: false,
  },
  {
    operation: "Cross-partition scan",
    call: "findMany({ enableCrossPartitionQuery: true })",
    requestUnits: { low: 100, high: 100, label: "~100" },
    policy: "Refused unless you opt in, by name, in the call.",
    isExpensive: true,
  },
];

const SCALE_TICKS = [1, 10, 100];

function logScalePercent(requestUnits: number) {
  const minimumVisibleWidth = 4;
  const fraction = Math.log10(requestUnits) / Math.log10(100);
  return minimumVisibleWidth + fraction * (100 - minimumVisibleWidth);
}

export function CostLedger() {
  return (
    <div className="reveal border-y border-rule-strong">
      <div className="hidden grid-cols-[3rem_minmax(0,1.25fr)_minmax(0,1fr)_minmax(0,0.9fr)] border-b border-rule py-3 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-3 md:grid">
        <span>#</span>
        <span>Operation</span>
        <span>Request units</span>
        <span className="pl-6">In CosmosQL</span>
      </div>

      {LEDGER_ROWS.map((row, index) => {
        const barStart =
          row.requestUnits.low === row.requestUnits.high
            ? 0
            : logScalePercent(row.requestUnits.low);
        const barEnd = logScalePercent(row.requestUnits.high);
        const barColor = row.isExpensive ? "bg-signal" : "bg-ink";

        return (
          <div
            key={row.operation}
            className="grid grid-cols-[2rem_minmax(0,1fr)] gap-y-4 border-b border-rule py-6 last:border-b-0 md:grid-cols-[3rem_minmax(0,1.25fr)_minmax(0,1fr)_minmax(0,0.9fr)] md:items-center"
          >
            <span className="font-mono text-[12px] text-ink-3">
              {String(index + 1).padStart(2, "0")}
            </span>

            <div className="min-w-0">
              <p className="text-[16px] font-medium text-ink">
                {row.operation}
              </p>
              <code className="mt-1 block truncate font-mono text-[12.5px] text-ink-2">
                {row.call}
              </code>
            </div>

            <div className="col-start-2 flex items-center gap-4 md:col-start-auto">
              <div className="relative h-2 flex-1 border-x border-rule-strong">
                <div className="absolute inset-x-0 top-1/2 h-px bg-rule" />
                <div
                  className="draw-x absolute inset-y-0 flex"
                  style={{ left: 0, width: `${barEnd}%` }}
                >
                  {barStart > 0 && (
                    <div
                      className={`h-full ${barColor}`}
                      style={{ width: `${(barStart / barEnd) * 100}%` }}
                    />
                  )}
                  <div
                    className={`h-full flex-1 ${barColor} ${barStart > 0 ? "opacity-40" : ""}`}
                  />
                </div>
              </div>
              <span
                className={`w-12 text-right font-mono text-[13px] tabular-nums ${row.isExpensive ? "text-signal" : "text-ink"}`}
              >
                {row.requestUnits.label}
              </span>
            </div>

            <p className="col-start-2 text-[14px] leading-snug text-ink-2 md:col-start-auto md:pl-6">
              {row.policy}
            </p>
          </div>
        );
      })}

      <div className="hidden grid-cols-[3rem_minmax(0,1.25fr)_minmax(0,1fr)_minmax(0,0.9fr)] border-t border-rule py-3 md:grid">
        <span />
        <span className="font-mono text-[11px] text-ink-3">
          Typical for a 1 KB document. Scans grow with partition count.
        </span>
        <div className="relative mr-16 font-mono text-[11px] text-ink-3">
          {SCALE_TICKS.map((tick) => (
            <span
              key={tick}
              className="absolute -translate-x-1/2"
              style={{ left: `${logScalePercent(tick)}%` }}
            >
              {tick}
            </span>
          ))}
        </div>
        <span />
      </div>
    </div>
  );
}
