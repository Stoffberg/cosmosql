import { highlight } from "fumadocs-core/highlight";
import { codeTheme } from "@/lib/code-theme";

type CodeBlockProps = {
  code: string;
  lang?: "ts" | "bash";
};

export async function CodeBlock({ code, lang = "ts" }: CodeBlockProps) {
  const rendered = await highlight(code.trim(), {
    lang,
    theme: codeTheme,
  });

  return <div className="not-fumadocs-codeblock code">{rendered}</div>;
}
