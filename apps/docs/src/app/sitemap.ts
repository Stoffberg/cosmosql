import { MetadataRoute } from "next";
import { source } from "@/lib/source";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://cosmosql.dev";
  const pages = source.getPages();
  
  const entries: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${baseUrl}/docs`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
  ];
  
  // Add all documentation pages
  for (const page of pages) {
    // Skip if it's the index page (already added as /docs)
    if (page.slugs.length === 1 && page.slugs[0] === "index") {
      continue;
    }
    
    const url = `${baseUrl}/docs/${page.slugs.join("/")}`;
    entries.push({
      url,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: page.slugs.length === 1 ? 0.8 : 0.7,
    });
  }
  
  // Add other important pages
  entries.push(
    {
      url: `${baseUrl}/docs/all`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.6,
    },
    {
      url: `${baseUrl}/site-map`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.5,
    }
  );
  
  return entries;
}
