"use client";

import { type KeyboardEvent, type ReactNode, useRef, useState } from "react";

export type ApiMethod = {
  name: string;
  note: string;
  code: ReactNode;
};

type ApiExplorerProps = {
  methods: ApiMethod[];
};

export function ApiExplorer({ methods }: ApiExplorerProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const selected = methods[selectedIndex];

  function selectAndFocus(index: number) {
    const wrappedIndex = (index + methods.length) % methods.length;
    setSelectedIndex(wrappedIndex);
    tabRefs.current[wrappedIndex]?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const previousKeys = ["ArrowUp", "ArrowLeft"];
    const nextKeys = ["ArrowDown", "ArrowRight"];
    if (previousKeys.includes(event.key)) {
      event.preventDefault();
      selectAndFocus(selectedIndex - 1);
    }
    if (nextKeys.includes(event.key)) {
      event.preventDefault();
      selectAndFocus(selectedIndex + 1);
    }
  }

  return (
    <div className="reveal grid border border-rule-strong bg-paper-raised md:grid-cols-[220px_minmax(0,1fr)]">
      <div
        role="tablist"
        aria-label="CosmosQL methods"
        aria-orientation="vertical"
        className="flex overflow-x-auto border-b border-rule md:flex-col md:border-b-0 md:border-r"
      >
        {methods.map((method, index) => {
          const isSelected = index === selectedIndex;
          return (
            <button
              key={method.name}
              ref={(element) => {
                tabRefs.current[index] = element;
              }}
              type="button"
              role="tab"
              id={`api-tab-${method.name}`}
              aria-selected={isSelected}
              aria-controls="api-panel"
              tabIndex={isSelected ? 0 : -1}
              onClick={() => setSelectedIndex(index)}
              onKeyDown={handleKeyDown}
              className={`group relative flex shrink-0 flex-col items-start gap-0.5 border-rule px-4 py-3 text-left transition-colors md:border-b ${isSelected ? "bg-paper" : "hover:bg-paper/60"}`}
            >
              <span
                className={`absolute bottom-0 left-0 h-px w-full bg-signal transition-transform duration-300 md:top-0 md:h-full md:w-px ${isSelected ? "scale-100" : "scale-0"}`}
                aria-hidden="true"
              />
              <span
                className={`font-mono text-[13px] ${isSelected ? "text-ink" : "text-ink-2"}`}
              >
                .{method.name}()
              </span>
              <span className="hidden text-[12px] text-ink-3 md:block">
                {method.note}
              </span>
            </button>
          );
        })}
      </div>
      <div
        id="api-panel"
        role="tabpanel"
        aria-labelledby={`api-tab-${selected.name}`}
        className="min-h-[340px] min-w-0"
      >
        {selected.code}
      </div>
    </div>
  );
}
