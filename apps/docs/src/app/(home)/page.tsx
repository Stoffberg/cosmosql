import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex flex-col flex-1 bg-white">
      {/* Hero Section */}
      <section className="text-center py-20 px-6 max-w-5xl mx-auto">
        {/* Badge */}
        <div className="inline-flex items-center bg-gray-100 rounded-full px-4 py-1.5 text-sm text-gray-700 mb-6">
          <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
          Open Source • Type-Safe • Production Ready
        </div>

        {/* Headline */}
        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 tracking-tight">
          Type-safe ORM for <br />
          Azure CosmosDB
        </h1>

        {/* Subheadline */}
        <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-10 leading-relaxed">
          CosmosQL makes working with CosmosDB feel as safe and productive as
          SQL with Prisma, while maintaining raw performance with zero runtime
          overhead.
        </p>

        {/* CTAs */}
        <div className="flex justify-center gap-4 flex-wrap">
          <Link
            href="/docs/getting-started"
            className="px-6 py-3 bg-black text-white rounded-lg font-semibold hover:bg-gray-800 transition-colors"
          >
            Get Started for Free
          </Link>
          <Link
            href="/docs"
            className="px-6 py-3 bg-gray-100 text-gray-900 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
          >
            View Documentation
          </Link>
        </div>
      </section>

      {/* Code Preview */}
      <section className="px-6 pb-20">
        <div className="max-w-5xl mx-auto">
          <div className="bg-gray-900 rounded-xl shadow-2xl overflow-hidden border border-gray-800">
            <div className="bg-gray-800 px-4 py-3 flex items-center gap-2 border-b border-gray-700">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="ml-2 text-sm text-gray-400">app.ts</span>
            </div>
            <pre className="p-6 overflow-x-auto text-sm">
              <code className="text-gray-100 font-mono">
                {`import { createClient, container, field } from 'cosmosql';

// Define your schema with full type safety
const users = container('users', {
  id: field.string(),
  email: field.string(),
  name: field.string(),
  age: field.number()
}).partitionKey('email');

const db = createClient({
  connectionString: process.env.COSMOS_CONNECTION_STRING!,
  database: 'myapp'
}).withContainers({ users });

// TypeScript catches errors before runtime
const user = await db.users.findUnique({
  where: { 
    id: 'user_123', 
    email: 'john@example.com' // Partition key required!
  }
});`}
              </code>
            </pre>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Built for modern development
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              CosmosQL enforces best practices at compile time, preventing
              costly mistakes before they reach production.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white rounded-lg p-8 border border-gray-200">
              <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">🎯</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                100% Type-Safe
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Full TypeScript support with compile-time validation. Catch
                errors before they cost you money in production.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white rounded-lg p-8 border border-gray-200">
              <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">⚡</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Zero Overhead
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Direct REST API calls with no heavy SDK. All validation happens
                at compile time, zero runtime cost.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white rounded-lg p-8 border border-gray-200">
              <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">🧠</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Partition Key Aware
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Prevents expensive cross-partition queries automatically.
                Enforces CosmosDB best practices at the type level.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-white rounded-lg p-8 border border-gray-200">
              <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">📦</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Minimal Dependencies
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Only TypeScript required. Perfect for microservices with tight
                dependency budgets.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-white rounded-lg p-8 border border-gray-200">
              <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">🎨</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Excellent DX
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Familiar Prisma-inspired API with CosmosDB-specific
                optimizations built in. Intuitive and productive.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-white rounded-lg p-8 border border-gray-200">
              <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">🚀</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Production Ready
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Battle-tested in production. Stable, maintainable, and built for
                performance at scale.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Example Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              From zero to queries in 60 seconds
            </h2>
            <p className="text-lg text-gray-600">
              Install, define your schema, and start querying with full type
              safety
            </p>
          </div>

          <div className="space-y-6">
            {/* Step 1 */}
            <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-black text-white rounded-full flex items-center justify-center font-semibold shrink-0">
                  1
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-2">Install</h3>
                  <pre className="bg-white rounded p-3 text-sm border border-gray-200">
                    <code>npm install cosmosql</code>
                  </pre>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-black text-white rounded-full flex items-center justify-center font-semibold shrink-0">
                  2
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-2">
                    Define your schema
                  </h3>
                  <pre className="bg-white rounded p-3 text-sm border border-gray-200 overflow-x-auto">
                    <code>{`const users = container('users', {
  id: field.string(),
  email: field.string()
}).partitionKey('email');`}</code>
                  </pre>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-black text-white rounded-full flex items-center justify-center font-semibold shrink-0">
                  3
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-2">
                    Start querying
                  </h3>
                  <pre className="bg-white rounded p-3 text-sm border border-gray-200 overflow-x-auto">
                    <code>{`const user = await db.users.findUnique({
  where: { id: '123', email: 'user@example.com' }
});`}</code>
                  </pre>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-10 text-center">
            <Link
              href="/docs/getting-started"
              className="inline-flex items-center text-black font-semibold hover:underline"
            >
              Read the full guide
              <svg
                className="ml-2 w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                role="img"
                aria-label="Arrow right"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* Documentation Grid */}
      <section className="py-20 px-6 bg-gray-50 border-t border-gray-200">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Comprehensive documentation
            </h2>
            <p className="text-lg text-gray-600">
              Everything you need to build with CosmosQL
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Link
              href="/docs/getting-started"
              className="bg-white rounded-lg p-6 border border-gray-200 hover:border-gray-900 hover:shadow-sm transition-all group"
            >
              <h3 className="font-semibold text-gray-900 mb-2 group-hover:underline">
                Getting Started
              </h3>
              <p className="text-sm text-gray-600">
                Install and create your first queries
              </p>
            </Link>

            <Link
              href="/docs/guide/core-concepts"
              className="bg-white rounded-lg p-6 border border-gray-200 hover:border-gray-900 hover:shadow-sm transition-all group"
            >
              <h3 className="font-semibold text-gray-900 mb-2 group-hover:underline">
                Core Concepts
              </h3>
              <p className="text-sm text-gray-600">
                CosmosDB fundamentals and schema definition
              </p>
            </Link>

            <Link
              href="/docs/guide/create"
              className="bg-white rounded-lg p-6 border border-gray-200 hover:border-gray-900 hover:shadow-sm transition-all group"
            >
              <h3 className="font-semibold text-gray-900 mb-2 group-hover:underline">
                CRUD Operations
              </h3>
              <p className="text-sm text-gray-600">
                Create, read, update, and delete with type safety
              </p>
            </Link>

            <Link
              href="/docs/guide/common-patterns"
              className="bg-white rounded-lg p-6 border border-gray-200 hover:border-gray-900 hover:shadow-sm transition-all group"
            >
              <h3 className="font-semibold text-gray-900 mb-2 group-hover:underline">
                Common Patterns
              </h3>
              <p className="text-sm text-gray-600">
                Authentication, multi-tenant apps, and more
              </p>
            </Link>

            <Link
              href="/docs/guide/advanced-patterns"
              className="bg-white rounded-lg p-6 border border-gray-200 hover:border-gray-900 hover:shadow-sm transition-all group"
            >
              <h3 className="font-semibold text-gray-900 mb-2 group-hover:underline">
                Advanced Patterns
              </h3>
              <p className="text-sm text-gray-600">
                Partition keys, TTL, raw queries, error handling
              </p>
            </Link>

            <Link
              href="/docs/advanced/performance"
              className="bg-white rounded-lg p-6 border border-gray-200 hover:border-gray-900 hover:shadow-sm transition-all group"
            >
              <h3 className="font-semibold text-gray-900 mb-2 group-hover:underline">
                Performance Best Practices
              </h3>
              <p className="text-sm text-gray-600">
                Optimize for speed and cost efficiency
              </p>
            </Link>
          </div>

          <div className="mt-10 text-center">
            <Link
              href="/docs"
              className="inline-flex items-center text-black font-semibold hover:underline"
            >
              View all documentation
              <svg
                className="ml-2 w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                role="img"
                aria-label="Arrow right"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Ready to build with CosmosQL?
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            Start building type-safe applications with Azure CosmosDB today
          </p>
          <div className="flex justify-center gap-4 flex-wrap">
            <Link
              href="/docs/getting-started"
              className="px-6 py-3 bg-black text-white rounded-lg font-semibold hover:bg-gray-800 transition-colors"
            >
              Get Started for Free
            </Link>
            <a
              href="https://github.com/yourusername/cosmosql"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 bg-gray-100 text-gray-900 rounded-lg font-semibold hover:bg-gray-200 transition-colors inline-flex items-center gap-2"
            >
              <svg
                className="w-5 h-5"
                fill="currentColor"
                viewBox="0 0 24 24"
                role="img"
                aria-label="GitHub"
              >
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              Star on GitHub
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
