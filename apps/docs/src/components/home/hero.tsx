import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { GITHUB_URL, QUICKSTART_URL } from "@/lib/site";
import { HeroDemo } from "./hero-demo";
import { InstallCommand } from "./install-command";

const SPEC_CELLS = [
  { value: "0", label: "runtime dependencies" },
  { value: "1 RU", label: "per point read" },
  { value: "TS 5+", label: "types from your schema" },
  { value: "Node 18+", label: "and Bun 1.0+" },
  { value: "MIT", label: "open source" },
];

function delay(milliseconds: number): CSSProperties {
  return { "--delay": `${milliseconds}ms` } as CSSProperties;
}

type HeadlineLineProps = {
  number: string;
  delayMs: number;
  children: ReactNode;
};

function HeadlineLine({ number, delayMs, children }: HeadlineLineProps) {
  return (
    <span className="flex items-baseline lg:-ml-10">
      <span
        className="hidden w-10 shrink-0 font-mono text-[12px] font-normal tracking-normal text-ink-3 lg:block"
        aria-hidden="true"
      >
        {number}
      </span>
      <span className="block overflow-hidden pb-[0.08em]">
        <span className="line-up block" style={delay(delayMs)}>
          {children}
        </span>
      </span>
    </span>
  );
}

export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="relative">
      <div className="px-5 pb-16 pt-14 lg:px-14 lg:pb-20 lg:pt-24">
        <p
          className="rise flex items-center gap-2.5 font-mono text-[12px] text-ink-2"
          style={delay(0)}
        >
          <span className="size-1.5 bg-signal" aria-hidden="true" />
          TypeScript client for Azure Cosmos DB
        </p>

        <h1
          id="hero-title"
          className="mt-7 font-display text-[clamp(40px,7.4vw,96px)] font-medium leading-[0.98] tracking-[-0.045em] font-stretch-condensed text-ink"
        >
          <HeadlineLine number="01" delayMs={80}>
            Your Cosmos DB bill,
          </HeadlineLine>
          <HeadlineLine number="02" delayMs={170}>
            type-checked<span className="text-signal">.</span>
          </HeadlineLine>
        </h1>

        <div className="mt-14 grid gap-12 lg:mt-16 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-14">
          <div className="rise flex flex-col gap-8" style={delay(320)}>
            <p className="max-w-[30rem] text-pretty text-[18px] leading-relaxed text-ink-2">
              CosmosQL turns your schema into types and your partition key into
              a compile-time requirement. Point reads stay at 1 RU, scans across
              partitions are opt-in, and the package ships with zero runtime
              dependencies.
            </p>
            <InstallCommand />
            <div className="flex flex-wrap gap-3">
              <Link
                href={QUICKSTART_URL}
                className="group inline-flex h-11 items-center gap-3 bg-ink px-5 font-mono text-[13px] text-paper transition-colors hover:bg-signal"
              >
                Read the quickstart
                <span
                  className="transition-transform duration-300 group-hover:translate-x-1"
                  aria-hidden="true"
                >
                  →
                </span>
              </Link>
              <a
                href={GITHUB_URL}
                className="inline-flex h-11 items-center border border-rule-strong px-5 font-mono text-[13px] text-ink transition-colors hover:border-ink"
              >
                View on GitHub
              </a>
            </div>
          </div>

          <div className="rise min-w-0" style={delay(440)}>
            <HeroDemo />
          </div>
        </div>
      </div>

      <dl
        className="rise grid grid-cols-2 border-t border-rule sm:grid-cols-3 lg:grid-cols-5"
        style={delay(560)}
      >
        {SPEC_CELLS.map((cell) => (
          <div
            key={cell.label}
            className="flex flex-col-reverse gap-1.5 border-b border-r border-rule px-5 py-6 last:border-r-0 lg:border-b-0 lg:px-6"
          >
            <dt className="font-mono text-[11.5px] text-ink-3">{cell.label}</dt>
            <dd className="font-display text-[26px] font-medium tracking-[-0.03em] font-stretch-semi-condensed text-ink">
              {cell.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
