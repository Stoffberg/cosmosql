# CosmosQL Documentation Site

This is the official documentation site for [CosmosQL](https://cosmosql.dev) - a type-safe, zero-dependency library for Azure CosmosDB. Built with [Next.js](https://nextjs.org) and [Fumadocs](https://fumadocs.dev).

## Overview

This documentation site provides comprehensive guides, API references, and examples for using CosmosQL in your projects. The site is built using modern web technologies and provides a fast, searchable experience for developers.

## Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org)
- **Documentation**: [Fumadocs](https://fumadocs.dev)
- **Content**: [MDX](https://mdxjs.com)
- **Styling**: [Tailwind CSS](https://tailwindcss.com)
- **TypeScript**: Full type safety throughout
- **Search**: Built-in search functionality
- **Runtime**: Node.js 18+ or Bun 1.0+

## Local Development

### Prerequisites

- Node.js 18+ or Bun 1.0+
- npm, yarn, pnpm, or bun package manager

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/cosmosql-docs
cd cosmosql-docs

# Install dependencies
npm install
# or
bun install
```

### Development Server

```bash
# Start the development server
npm run dev
# or
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

The site supports hot reloading, so changes to content or code will automatically refresh in the browser.

### Build for Production

```bash
# Build the site
npm run build

# Preview the production build
npm run start
```

### Other Scripts

```bash
# Run linting
npm run lint

# Format code
npm run format

# Generate full docs for LLM context
npm run generate-docs
```

## Project Structure

```
cosmosql-docs/
├── content/
│   └── docs/                    # Documentation content (MDX files)
│       ├── index.mdx           # Homepage
│       ├── getting-started/
│       │   └── index.mdx       # Getting started guide
│       ├── guide/              # Core guides
│       │   ├── core-concepts.mdx
│       │   ├── create.mdx
│       │   ├── read.mdx
│       │   └── ...
│       ├── reference/          # API reference
│       ├── advanced/           # Advanced topics
│       └── faq.mdx            # FAQ
├── src/
│   ├── app/                   # Next.js app directory
│   │   ├── (home)/           # Homepage route group
│   │   ├── docs/             # Documentation routes
│   │   ├── api/              # API routes (search, etc.)
│   │   ├── global.css        # Global styles
│   │   └── layout.tsx        # Root layout
│   └── lib/                  # Utility libraries
│       ├── source.ts         # Fumadocs source configuration
│       └── layout.shared.tsx # Shared layout options
├── public/                   # Static assets
├── scripts/                  # Build and utility scripts
├── biome.json               # Code formatting/linting
├── next.config.mjs          # Next.js configuration
├── tailwind.config.ts       # Tailwind CSS configuration
├── tsconfig.json            # TypeScript configuration
└── package.json             # Dependencies and scripts
```

## Contributing to Documentation

### Content Structure

Documentation is written in MDX format and organized by topic:

- **`content/docs/index.mdx`** - Homepage with overview and getting started
- **`content/docs/getting-started/`** - Installation and first steps
- **`content/docs/guide/`** - Core usage guides and patterns
- **`content/docs/reference/`** - Complete API reference
- **`content/docs/advanced/`** - Advanced topics and best practices

### Writing Documentation

1. **Create or edit MDX files** in the appropriate directory under `content/docs/`
2. **Use frontmatter** for metadata:

```mdx
---
title: Your Page Title
description: Brief description for SEO and previews
---

# Your Content Here

Use standard Markdown syntax with React components where needed.
```

3. **Add to navigation** by updating the `meta.json` files in each directory if needed
4. **Test locally** with `npm run dev`
5. **Run formatting** with `npm run format`

### Frontmatter Schema

Each MDX file should include:

```yaml
---
title: string              # Page title (required)
description: string        # SEO description (required)
---
```

### MDX Features

- **Standard Markdown** - All standard Markdown syntax works
- **React Components** - Import and use React components
- **Code Highlighting** - Automatic syntax highlighting for code blocks
- **Interactive Examples** - Live code examples where applicable

### Navigation Structure

Navigation is configured through `meta.json` files in each documentation directory:

```json
{
  "title": "Guide",
  "description": "Core concepts and usage patterns",
  "pages": [
    "core-concepts",
    "create",
    "read",
    "update",
    "delete",
    "type-system",
    "common-patterns",
    "advanced-patterns",
    "aggregations"
  ]
}
```

## Content Guidelines

### Writing Style

- **Developer-focused** - Write for developers using CosmosQL
- **Practical** - Include real code examples and use cases
- **Progressive** - Start simple, build complexity gradually
- **Action-oriented** - Use imperative language ("Install X", "Run Y")

### Code Examples

- **Complete and runnable** - Examples should work when copied
- **Well-commented** - Explain what's happening in each step
- **TypeScript-first** - Use TypeScript in all examples
- **Modern syntax** - Use ES2020+ features where appropriate

### Documentation Types

- **Tutorials** - Step-by-step guides for specific tasks
- **Reference** - Complete API documentation
- **Guides** - Best practices and patterns
- **Examples** - Real-world use cases

## Search and Navigation

### Built-in Search

The site includes a built-in search feature powered by Fumadocs:

- **Full-text search** across all documentation content
- **Fast and responsive** - Search as you type
- **Context-aware** - Shows relevant sections and snippets

### API Routes

- **`/api/search`** - Search endpoint for documentation content
- **`/api/og/docs/[...slug]`** - Open Graph images for social sharing
- **`/llms-full.txt`** - Full documentation for LLM context

## Deployment

The site is designed to deploy to any platform that supports Next.js:

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Other Platforms

The site works with any Node.js hosting platform:
- Netlify
- Railway
- Render
- Self-hosted with Docker

### Environment Variables

No environment variables are required for the basic documentation site. For advanced features:

```env
# Optional: Analytics
NEXT_PUBLIC_ANALYTICS_ID=your-analytics-id

# Optional: Search customization
SEARCH_INDEX_SIZE=1000
```

## Development Workflow

### Branching Strategy

- **`main`** - Production branch, auto-deploys to production
- **`develop`** - Development branch for ongoing work
- **Feature branches** - `feature/add-new-guide`, `fix/typo-in-api-ref`

### Pull Request Process

1. **Create a feature branch** from `develop`
2. **Make changes** and test locally
3. **Run formatting and linting**: `npm run format && npm run lint`
4. **Test build**: `npm run build`
5. **Create PR** with clear description
6. **Code review** and merge to `develop`
7. **Deploy to production** when ready

### Content Updates

For documentation updates:
1. Edit MDX files in `content/docs/`
2. Update navigation in `meta.json` if adding new pages
3. Test locally with `npm run dev`
4. Ensure proper frontmatter and formatting
5. Create PR for review

## Customization

### Styling

The site uses Tailwind CSS for styling. Custom styles can be added to:

- **`src/app/global.css`** - Global styles
- **`tailwind.config.ts`** - Tailwind configuration

### Fumadocs Configuration

Site configuration is in:

- **`src/lib/source.ts`** - Content source and MDX configuration
- **`src/lib/layout.shared.tsx`** - Shared layout options
- **`source.config.ts`** - Fumadocs source configuration

### Adding Features

To add new features:

1. **API routes** - Add to `src/app/api/`
2. **Components** - Add to `src/components/` (if created)
3. **Pages** - Add to appropriate route groups
4. **Utilities** - Add to `src/lib/`

## Performance

### Optimization Features

- **Static generation** - Pages are statically generated at build time
- **Image optimization** - Automatic image optimization via Next.js
- **Code splitting** - Automatic code splitting for better performance
- **Caching** - Appropriate caching headers for static assets

### Bundle Analysis

```bash
# Analyze bundle size
npm run build
npx @next/bundle-analyzer
```

## Troubleshooting

### Common Issues

**Development server won't start:**
```bash
# Clear Next.js cache
rm -rf .next
npm run dev
```

**Content not updating:**
```bash
# Clear Fumadocs cache
rm -rf .fumadocs
npm run dev
```

**Build failures:**
```bash
# Check for TypeScript errors
npm run build 2>&1 | head -50
```

### Getting Help

- **GitHub Issues** - Report bugs and request features
- **GitHub Discussions** - Ask questions and get help
- **Contributing Guide** - Detailed contribution guidelines

## License

This documentation site is part of the CosmosQL project and follows the same license terms.

## Contributing

We welcome contributions to improve the CosmosQL documentation! See our [Contributing Guide](CONTRIBUTING.md) for details.

---

**Questions?** Join our [GitHub Discussions](https://github.com/your-org/cosmosql-docs/discussions) or open an [issue](https://github.com/your-org/cosmosql-docs/issues).