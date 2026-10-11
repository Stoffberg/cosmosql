# CosmosQL docs

Source for [cosmosql.dev](https://cosmosql.dev), built with [Next.js](https://nextjs.org) and [Fumadocs](https://fumadocs.dev).

## Development

From the repository root:

```bash
bun install
bun run dev
```

The site runs on http://localhost:3000.

## Structure

```
apps/docs/
├── content/docs/   # MDX pages; each folder's meta.json sets sidebar order
├── src/app/        # Next.js routes: home, docs, search API, OG images, llms-full.txt
├── src/lib/        # Fumadocs source and shared layout options
└── source.config.ts
```

## Writing docs

Every page needs `title` and `description` frontmatter:

```mdx
---
title: Reading documents
description: Point reads, queries, and pagination.
---
```

Run `bun run --filter docs build` before opening a pull request, and `bun run --filter docs check-links` to catch broken internal links.

## Deployment

Deployed on Vercel with the project root directory set to `apps/docs`.
