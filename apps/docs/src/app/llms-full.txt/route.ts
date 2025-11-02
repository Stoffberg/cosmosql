import { getAllLLMText } from "@/lib/source";

export const revalidate = false;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") || "full"; // full, content, toc
  const contentType = searchParams.get("type") || "text"; // text, markdown, md

  const { toc, content, full } = await getAllLLMText();

  let body: string;
  if (format === "toc") {
    body = toc;
  } else if (format === "content") {
    body = content;
  } else {
    body = full;
  }

  const extension = contentType === "md" || contentType === "markdown" ? "md" : "txt";
  const mimeType =
    contentType === "md" || contentType === "markdown"
      ? "text/markdown"
      : "text/plain";

  return new Response(body, {
    headers: {
      "Content-Type": `${mimeType}; charset=utf-8`,
      "Content-Disposition": `attachment; filename="cosmosql-docs.${extension}"`,
    },
  });
}
