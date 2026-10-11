"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";

type Phase = "drafting" | "error" | "typing" | "fixed";

const FIX_SEGMENTS = [
  { text: ", ", className: "tok-punc" },
  { text: "email", className: "tok-prop" },
  { text: ": ", className: "tok-punc" },
  { text: '"ada@lovelace.dev"', className: "tok-str" },
];

const FIX_LENGTH = FIX_SEGMENTS.reduce(
  (total, segment) => total + segment.text.length,
  0,
);

const FIRST_CHECK_MS = 1100;
const AUTO_FIX_DELAY_MS = 2800;
const RECHECK_MS = 420;

function keystrokeDelay(position: number) {
  const rhythm = [34, 52, 41, 63, 38];
  return rhythm[position % rhythm.length];
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function HeroDemo() {
  const [phase, setPhase] = useState<Phase>("drafting");
  const [typedLength, setTypedLength] = useState(0);
  const hasAutoFixed = useRef(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setPhase("error"), FIRST_CHECK_MS);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (phase !== "error" || hasAutoFixed.current) {
      return;
    }
    const timer = window.setTimeout(() => {
      hasAutoFixed.current = true;
      setPhase("typing");
    }, AUTO_FIX_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [phase]);

  useEffect(() => {
    if (phase !== "typing") {
      return;
    }
    if (prefersReducedMotion()) {
      setTypedLength(FIX_LENGTH);
      setPhase("fixed");
      return;
    }
    if (typedLength < FIX_LENGTH) {
      const timer = window.setTimeout(
        () => setTypedLength(typedLength + 1),
        keystrokeDelay(typedLength),
      );
      return () => window.clearTimeout(timer);
    }
    const timer = window.setTimeout(() => setPhase("fixed"), RECHECK_MS);
    return () => window.clearTimeout(timer);
  }, [phase, typedLength]);

  function fixQuery() {
    hasAutoFixed.current = true;
    setPhase("typing");
  }

  function breakQuery() {
    setTypedLength(0);
    setPhase("error");
  }

  const hasError = phase === "error" || phase === "typing";
  const isFixed = phase === "fixed";
  const showCaret = !isFixed;

  return (
    <figure
      className="relative border border-rule-strong bg-paper-raised"
      aria-label="CosmosQL rejecting a point read that is missing its partition key, then accepting it once the key is added"
    >
      <div className="flex h-10 items-center justify-between border-b border-rule pr-2 font-mono text-[12px]">
        <div className="flex h-full items-center gap-2 border-r border-rule px-4 text-ink">
          <span
            className={`size-1.5 rounded-full transition-colors ${hasError ? "bg-signal" : "bg-ink-3"}`}
          />
          query.ts
        </div>
        <DemoAction phase={phase} onFix={fixQuery} onBreak={breakQuery} />
      </div>

      <div className="code relative overflow-visible">
        <Line number={1}>
          <K>const</K> users <P>=</P> <F>container</F>
          <P>(</P>
          <S>"users"</S>
          <P>, {"{"}</P>
        </Line>
        <Line number={2}>
          {"  "}id<P>:</P> field<P>.</P>
          <F>string</F>
          <P>(),</P>
        </Line>
        <Line number={3}>
          {"  "}email<P>:</P> field<P>.</P>
          <F>string</F>
          <P>(),</P>
        </Line>
        <Line number={4}>
          {"  "}name<P>:</P> field<P>.</P>
          <F>string</F>
          <P>(),</P>
        </Line>
        <Line number={5}>
          <P>{"})."}</P>
          <F>partitionKey</F>
          <P>(</P>
          <S>"email"</S>
          <P>);</P>
        </Line>
        <Line number={6} />
        <Line number={7}>
          <K>const</K> user <P>=</P> <K>await</K> db<P>.</P>users<P>.</P>
          <F>findUnique</F>
          <P>{"({"}</P>
        </Line>
        <Line number={8}>
          {"  "}
          <span className="squiggle" data-active={hasError}>
            where
          </span>
          <P>:</P> <P>{"{"}</P> id<P>:</P> <S>"u_1"</S>
          <TypedFix length={typedLength} />
          {showCaret && <span className="caret" aria-hidden="true" />}
          <P>{" },"}</P>
          <Diagnostic open={hasError} />
        </Line>
        <Line number={9}>
          <P>{"});"}</P>
        </Line>
        <Line number={10}>
          <span
            className="tok-cm transition-opacity duration-500"
            style={{ opacity: isFixed ? 1 : 0 }}
          >
            {"//    ^? { id: string; email: string; name: string } | null"}
          </span>
        </Line>
      </div>

      <StatusBar phase={phase} />
    </figure>
  );
}

type LineProps = {
  number: number;
  children?: ReactNode;
};

function Line({ number, children }: LineProps) {
  return (
    <div className="relative flex whitespace-pre">
      <span
        className="w-12 shrink-0 select-none pr-5 text-right text-ink-3/60"
        aria-hidden="true"
      >
        {number}
      </span>
      <span className="text-ink">{children}</span>
    </div>
  );
}

function TypedFix({ length }: { length: number }) {
  let remaining = length;
  const visibleSegments = [];

  for (const segment of FIX_SEGMENTS) {
    const visibleText = segment.text.slice(0, Math.max(0, remaining));
    remaining -= segment.text.length;
    if (visibleText.length > 0) {
      visibleSegments.push(
        <span key={segment.text} className={segment.className}>
          {visibleText}
        </span>,
      );
    }
  }

  return visibleSegments;
}

function Diagnostic({ open }: { open: boolean }) {
  return (
    <div
      className="absolute left-[calc(3rem+2ch)] top-[calc(100%+6px)] z-10 w-[min(29rem,calc(100vw-6rem))] transition-all duration-300 ease-out"
      style={{
        opacity: open ? 1 : 0,
        transform: open ? "translateY(0)" : "translateY(-4px)",
        pointerEvents: open ? "auto" : "none",
      }}
      aria-hidden={!open}
    >
      <div className="whitespace-normal border border-rule-strong bg-paper font-mono text-[12px] leading-relaxed shadow-[0_18px_40px_-24px_rgb(0_0_0/0.45)]">
        <div className="flex gap-2.5 px-3.5 py-3 text-ink">
          <span
            className="mt-[3px] size-2 shrink-0 bg-signal"
            aria-hidden="true"
          />
          <p>
            Property <span className="text-signal">'email'</span> is missing in
            type '{"{ id: string; }"}' but required in type '
            {"{ email: string; }"}'.{" "}
            <span className="text-ink-3">ts(2322)</span>
          </p>
        </div>
      </div>
    </div>
  );
}

type DemoActionProps = {
  phase: Phase;
  onFix: () => void;
  onBreak: () => void;
};

function DemoAction({ phase, onFix, onBreak }: DemoActionProps) {
  const buttonClass =
    "h-7 px-2.5 text-ink-2 transition-colors hover:text-signal disabled:opacity-0";

  if (phase === "fixed") {
    return (
      <button type="button" className={buttonClass} onClick={onBreak}>
        [ remove partition key ]
      </button>
    );
  }

  return (
    <button
      type="button"
      className={buttonClass}
      onClick={onFix}
      disabled={phase !== "error"}
    >
      [ add partition key ]
    </button>
  );
}

function StatusBar({ phase }: { phase: Phase }) {
  const isFixed = phase === "fixed";
  const isChecking = phase === "drafting";

  let problems = "1 problem";
  if (isChecking) {
    problems = "checking…";
  } else if (isFixed) {
    problems = "0 problems";
  }

  let icon = "✕";
  if (isChecking) {
    icon = "◌";
  } else if (isFixed) {
    icon = "✓";
  }

  let verdict = "point read needs id + partition key";
  if (isChecking) {
    verdict = "tsc --noEmit";
  } else if (isFixed) {
    verdict = "point read · 1 RU";
  }

  return (
    <div className="flex h-9 items-center justify-between border-t border-rule px-4 font-mono text-[11.5px]">
      <span
        className={`flex items-center gap-2 transition-colors ${isFixed || isChecking ? "text-ink-2" : "text-signal"}`}
        aria-live="polite"
      >
        <span aria-hidden="true">{icon}</span>
        {problems}
      </span>
      <span className="text-ink-3">{verdict}</span>
    </div>
  );
}

function K({ children }: { children: ReactNode }) {
  return <span className="tok-kw">{children}</span>;
}

function S({ children }: { children: ReactNode }) {
  return <span className="tok-str">{children}</span>;
}

function F({ children }: { children: ReactNode }) {
  return <span className="tok-fn">{children}</span>;
}

function P({ children }: { children: ReactNode }) {
  return <span className="tok-punc">{children}</span>;
}
