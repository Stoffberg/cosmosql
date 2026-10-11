import type { ReactNode } from "react";

type SectionProps = {
  id: string;
  index: string;
  label: string;
  title: string;
  intro?: ReactNode;
  children: ReactNode;
};

export function Section({
  id,
  index,
  label,
  title,
  intro,
  children,
}: SectionProps) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="crosshair relative border-t border-rule"
    >
      <div className="grid lg:grid-cols-[200px_minmax(0,1fr)]">
        <div className="px-5 pt-12 lg:border-r lg:border-rule lg:px-6 lg:pt-20">
          <p className="font-display text-[11px] uppercase tracking-[0.16em] text-ink-3 lg:sticky lg:top-24">
            <span className="text-signal">§{index}</span>
            <span className="mx-2 text-rule-strong">/</span>
            {label}
          </p>
        </div>
        <div className="min-w-0 px-5 pb-20 pt-5 lg:px-12 lg:pb-24 lg:pt-20">
          <div className="reveal max-w-[44rem]">
            <h2
              id={`${id}-title`}
              className="text-balance font-display text-[28px] font-medium leading-[1.15] tracking-[-0.02em] font-stretch-semi-condensed text-ink sm:text-[36px]"
            >
              {title}
            </h2>
            {intro && (
              <p className="mt-4 text-pretty text-[17px] leading-relaxed text-ink-2">
                {intro}
              </p>
            )}
          </div>
          <div className="mt-12">{children}</div>
        </div>
      </div>
    </section>
  );
}
