"use client";

import { useState } from "react";

const PACKAGE_MANAGERS = [
  { name: "npm", command: "npm install cosmosql" },
  { name: "pnpm", command: "pnpm add cosmosql" },
  { name: "bun", command: "bun add cosmosql" },
  { name: "yarn", command: "yarn add cosmosql" },
];

export function InstallCommand() {
  const [selectedName, setSelectedName] = useState("npm");
  const [copied, setCopied] = useState(false);

  const selected =
    PACKAGE_MANAGERS.find((manager) => manager.name === selectedName) ??
    PACKAGE_MANAGERS[0];

  async function copyCommand() {
    await navigator.clipboard.writeText(selected.command);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="border border-rule-strong bg-paper-raised font-mono text-[13px]">
      <div
        className="flex border-b border-rule"
        role="tablist"
        aria-label="Package manager"
      >
        {PACKAGE_MANAGERS.map((manager) => {
          const isSelected = manager.name === selected.name;
          return (
            <button
              key={manager.name}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => setSelectedName(manager.name)}
              className={`relative px-3.5 py-2 text-[12px] transition-colors ${isSelected ? "text-ink" : "text-ink-3 hover:text-ink-2"}`}
            >
              {manager.name}
              {isSelected && (
                <span className="absolute inset-x-3.5 -bottom-px h-px bg-signal" />
              )}
            </button>
          );
        })}
      </div>
      <div className="flex items-center justify-between gap-4 py-3 pl-4 pr-2">
        <code className="truncate text-ink">
          <span className="select-none text-ink-3">$ </span>
          {selected.command}
        </code>
        <button
          type="button"
          onClick={copyCommand}
          className="shrink-0 px-2 py-1 text-[12px] text-ink-3 transition-colors hover:text-ink"
          aria-label={`Copy ${selected.command}`}
        >
          {copied ? "copied" : "copy"}
        </button>
      </div>
    </div>
  );
}
