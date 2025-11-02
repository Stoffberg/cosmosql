import { type InferPageType, loader } from "fumadocs-core/source";
import { lucideIconsPlugin } from "fumadocs-core/source/lucide-icons";
import { docs } from "@/.source";

// See https://fumadocs.dev/docs/headless/source-api for more info
const BASE_URL = "/docs";

export const source = loader({
  baseUrl: BASE_URL,
  source: docs.toFumadocsSource(),
  plugins: [lucideIconsPlugin()],
});

export function getPageImage(page: InferPageType<typeof source>) {
  const segments = [...page.slugs, "image.png"];

  return {
    segments,
    url: `/og/docs/${segments.join("/")}`,
  };
}

export async function getLLMText(page: InferPageType<typeof source>) {
  const processed = await page.data.getText("processed");
  const url = `${BASE_URL}/${page.slugs.join("/")}`;
  const description = page.data.description ? `\n\n*${page.data.description}*` : "";

  return `# ${page.data.title}

**URL:** ${url}${description}

---

${processed}`;
}

export async function getAllLLMText() {
  const pages = source.getPages();
  const toc: string[] = [];
  const content: string[] = [];

  // Build table of contents
  toc.push("# Table of Contents\n");
  for (const page of pages) {
    const url = `${BASE_URL}/${page.slugs.join("/")}`;
    const indent = page.slugs.length > 1 ? "  ".repeat(page.slugs.length - 1) : "";
    toc.push(`${indent}- [${page.data.title}](${url})`);
  }
  toc.push("");

  // Build content sections
  for (const page of pages) {
    const text = await getLLMText(page);
    content.push(text);
    content.push("\n\n"); // Double newline between sections
  }

  return {
    toc: toc.join("\n"),
    content: content.join(""),
    full: `${toc.join("\n")}\n\n---\n\n${content.join("")}`,
  };
}
