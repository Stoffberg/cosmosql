import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex flex-col flex-1">
      {/* Hero Section */}
      <section className="flex flex-col items-center justify-center text-center py-20 px-4">
        <h1 className="text-5xl font-bold mb-6 bg-linear-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          CosmosQL
        </h1>
        <p className="text-xl text-muted-foreground mb-4 max-w-2xl">
          A lightweight, type-safe ORM for Azure CosmosDB that makes working
          with NoSQL databases feel as safe and productive as SQL with Prisma.
        </p>
        <p className="text-lg text-muted-foreground mb-8 max-w-2xl">
          Catch errors at compile time, not runtime. Maintain the raw speed of
          direct REST API calls. Enforce CosmosDB best practices at the type
          level.
        </p>
        <div className="flex gap-4 flex-wrap justify-center">
          <Link
            href="/docs/getting-started"
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            Get Started
          </Link>
          <Link
            href="/docs"
            className="px-6 py-3 border border-border rounded-lg font-medium hover:bg-accent transition-colors"
          >
            View Docs
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            Why Choose CosmosQL?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-6 rounded-lg bg-background border border-border">
              <h3 className="text-xl font-semibold mb-3">🎯 100% Type-Safe</h3>
              <p className="text-muted-foreground">
                Catch errors at compile time, not runtime. TypeScript ensures
                your queries are correct before they reach production.
              </p>
            </div>
            <div className="p-6 rounded-lg bg-background border border-border">
              <h3 className="text-xl font-semibold mb-3">⚡ Zero Overhead</h3>
              <p className="text-muted-foreground">
                Direct REST API calls with no heavy SDK. Minimal dependencies,
                maximum performance. All validation happens at compile time.
              </p>
            </div>
            <div className="p-6 rounded-lg bg-background border border-border">
              <h3 className="text-xl font-semibold mb-3">
                🧠 Partition Key Aware
              </h3>
              <p className="text-muted-foreground">
                Enforces CosmosDB best practices at the type level. Prevents
                expensive cross-partition queries accidentally.
              </p>
            </div>
            <div className="p-6 rounded-lg bg-background border border-border">
              <h3 className="text-xl font-semibold mb-3">
                📦 Minimal Dependencies
              </h3>
              <p className="text-muted-foreground">
                Only TypeScript required. No external packages. Perfect for
                microservices with minimal dependency budgets.
              </p>
            </div>
            <div className="p-6 rounded-lg bg-background border border-border">
              <h3 className="text-xl font-semibold mb-3">🎨 Excellent DX</h3>
              <p className="text-muted-foreground">
                Intuitive API inspired by Prisma. Familiar patterns with
                CosmosDB-specific optimizations built in.
              </p>
            </div>
            <div className="p-6 rounded-lg bg-background border border-border">
              <h3 className="text-xl font-semibold mb-3">
                🚀 Production Ready
              </h3>
              <p className="text-muted-foreground">
                Built for performance and reliability. Used in production
                environments. Stable and maintainable.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Start Preview */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8">
            Get Started in Minutes
          </h2>
          <div className="bg-muted p-6 rounded-lg border border-border">
            <pre className="text-sm overflow-x-auto">
              <code>{`import { createClient, container, field } from 'cosmosql';

// Define your schema
const users = container('users', {
  id: field.string(),
  email: field.string(),
  name: field.string(),
  age: field.number()
}).partitionKey('email');

// Create client
const db = createClient({
  connectionString: process.env.COSMOS_CONNECTION_STRING!,
  database: 'myapp'
}).withContainers({ users });

// Query with full type safety
const user = await db.users.findUnique({
  where: {
    id: 'user_123',
    email: 'john@example.com'
  }
});`}</code>
            </pre>
          </div>
          <div className="mt-6 text-center">
            <Link
              href="/docs/getting-started"
              className="text-primary font-medium hover:underline"
            >
              Read the full getting started guide →
            </Link>
          </div>
        </div>
      </section>

      {/* Documentation Links */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8">Documentation</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Link
              href="/docs/getting-started"
              className="p-5 rounded-lg bg-background border border-border hover:border-primary transition-colors"
            >
              <h3 className="font-semibold mb-2">Getting Started</h3>
              <p className="text-sm text-muted-foreground">
                Install CosmosQL and create your first queries
              </p>
            </Link>
            <Link
              href="/docs/core-concepts"
              className="p-5 rounded-lg bg-background border border-border hover:border-primary transition-colors"
            >
              <h3 className="font-semibold mb-2">Core Concepts</h3>
              <p className="text-sm text-muted-foreground">
                Understand CosmosDB fundamentals and schema definition
              </p>
            </Link>
            <Link
              href="/docs/crud-operations"
              className="p-5 rounded-lg bg-background border border-border hover:border-primary transition-colors"
            >
              <h3 className="font-semibold mb-2">CRUD Operations</h3>
              <p className="text-sm text-muted-foreground">
                Create, read, update, and delete documents with type safety
              </p>
            </Link>
            <Link
              href="/docs/common-patterns"
              className="p-5 rounded-lg bg-background border border-border hover:border-primary transition-colors"
            >
              <h3 className="font-semibold mb-2">Common Patterns</h3>
              <p className="text-sm text-muted-foreground">
                Real-world usage patterns for authentication, multi-tenant apps,
                and more
              </p>
            </Link>
            <Link
              href="/docs/advanced-patterns"
              className="p-5 rounded-lg bg-background border border-border hover:border-primary transition-colors"
            >
              <h3 className="font-semibold mb-2">Advanced Patterns</h3>
              <p className="text-sm text-muted-foreground">
                Working with partition keys, TTL, raw queries, and error
                handling
              </p>
            </Link>
            <Link
              href="/docs/performance"
              className="p-5 rounded-lg bg-background border border-border hover:border-primary transition-colors"
            >
              <h3 className="font-semibold mb-2">Performance</h3>
              <p className="text-sm text-muted-foreground">
                Optimize queries for speed and cost efficiency
              </p>
            </Link>
          </div>
          <div className="mt-8 text-center">
            <Link
              href="/docs"
              className="text-primary font-medium hover:underline"
            >
              View all documentation →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
