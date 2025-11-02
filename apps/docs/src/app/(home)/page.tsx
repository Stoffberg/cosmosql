"use client";

import Link from "next/link";
import { useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState("create");

  return (
    <div className="flex flex-col flex-1 bg-fd-background">
      {/* Hero Section */}
      <section className="text-center pt-24 pb-16 px-6 max-w-5xl mx-auto">
        {/* Badge */}
        <div className="inline-flex items-center bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-full px-3 py-1 text-sm text-orange-900 dark:text-orange-400 mb-8 font-medium">
          <span className="w-1.5 h-1.5 bg-orange-500 rounded-full mr-2"></span>
          Open Source • Type-Safe • Zero Runtime Overhead
        </div>

        {/* Headline */}
        <h1 className="text-6xl md:text-7xl font-bold text-fd-foreground mb-6 tracking-tight leading-[1.1]">
          Type-safe ORM for
          <br />
          Azure CosmosDB
        </h1>

        {/* Subheadline */}
        <p className="text-xl md:text-2xl text-fd-muted-foreground max-w-3xl mx-auto mb-10 leading-relaxed font-light">
          Build faster with full type safety. CosmosQL prevents costly mistakes
          at compile time, not in production.
        </p>

        {/* CTAs */}
        <div className="flex justify-center gap-4 flex-wrap mb-8">
          <Link
            href="/docs/getting-started"
            className="px-6 py-3 bg-fd-foreground text-fd-background rounded-md font-medium hover:opacity-90 transition-all text-base"
          >
            Get Started →
          </Link>
          <Link
            href="/docs"
            className="px-6 py-3 border border-fd-border text-fd-foreground rounded-md font-medium hover:bg-fd-accent transition-all text-base"
          >
            Documentation
          </Link>
        </div>

        {/* Social Proof */}
        <p className="text-sm text-fd-muted-foreground">
          npm install cosmosql • TypeScript 5+ • Node 18+
        </p>
      </section>

      {/* Main Code Example */}
      <section className="px-6 pb-20">
        <div className="max-w-5xl mx-auto">
          <div className="rounded-lg border border-fd-border overflow-hidden shadow-sm">
            <div className="bg-fd-accent/50 px-4 py-2.5 border-b border-fd-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="ml-2 text-sm text-fd-muted-foreground font-mono">
                  app.ts
                </span>
              </div>
              <span className="text-xs text-fd-muted-foreground font-medium">
                TypeScript
              </span>
            </div>
            <div className="text-sm">
              <SyntaxHighlighter
                language="typescript"
                style={oneDark}
                customStyle={{
                  margin: 0,
                  padding: "1.5rem",
                  fontSize: "14px",
                  lineHeight: "1.6",
                }}
              >
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
});

// Fully typed result
console.log(user.name); // ✓ TypeScript knows this exists`}
              </SyntaxHighlighter>
            </div>
          </div>
        </div>
      </section>

      {/* Why CosmosQL */}
      <section className="py-20 px-6 bg-fd-accent/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-fd-foreground mb-4">
              Why CosmosQL?
            </h2>
            <p className="text-lg text-fd-muted-foreground max-w-2xl mx-auto">
              Stop fighting with CosmosDB. Start building.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
            <div className="bg-fd-card rounded-lg p-6 border border-fd-border">
              <div className="text-3xl mb-3">🎯</div>
              <h3 className="text-lg font-semibold text-fd-foreground mb-2">
                Catch Errors Early
              </h3>
              <p className="text-sm text-fd-muted-foreground leading-relaxed">
                TypeScript catches mistakes before production
              </p>
            </div>

            <div className="bg-fd-card rounded-lg p-6 border border-fd-border">
              <div className="text-3xl mb-3">⚡</div>
              <h3 className="text-lg font-semibold text-fd-foreground mb-2">
                Zero Overhead
              </h3>
              <p className="text-sm text-fd-muted-foreground leading-relaxed">
                Direct REST calls. Compile-time validation only
              </p>
            </div>

            <div className="bg-fd-card rounded-lg p-6 border border-fd-border">
              <div className="text-3xl mb-3">🧠</div>
              <h3 className="text-lg font-semibold text-fd-foreground mb-2">
                Best Practices Built-in
              </h3>
              <p className="text-sm text-fd-muted-foreground leading-relaxed">
                Partition keys enforced. Cross-partition queries prevented
              </p>
            </div>
          </div>

          {/* Code Tabs */}
          <div className="rounded-lg border border-fd-border overflow-hidden bg-fd-card shadow-sm">
            <div className="border-b border-fd-border bg-fd-accent/50">
              <div className="flex">
                {["create", "find", "update", "delete"].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                      activeTab === tab
                        ? "bg-fd-card text-fd-foreground border-b-2 border-fd-foreground"
                        : "text-fd-muted-foreground hover:text-fd-foreground hover:bg-fd-accent"
                    }`}
                    type="button"
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="text-sm">
              {activeTab === "create" && (
                <SyntaxHighlighter
                  language="typescript"
                  style={oneDark}
                  customStyle={{
                    margin: 0,
                    padding: "1.5rem",
                    fontSize: "14px",
                    lineHeight: "1.6",
                  }}
                >
                  {`// Create a new user with full type safety
const newUser = await db.users.create({
  data: {
    id: 'user_123',
    email: 'john@example.com',
    name: 'John Doe',
    age: 30,
    isActive: true,
    createdAt: new Date()
  }
});

// TypeScript ensures all required fields are provided
// and types match your schema exactly`}
                </SyntaxHighlighter>
              )}

              {activeTab === "find" && (
                <SyntaxHighlighter
                  language="typescript"
                  style={oneDark}
                  customStyle={{
                    margin: 0,
                    padding: "1.5rem",
                    fontSize: "14px",
                    lineHeight: "1.6",
                  }}
                >
                  {`// Find user by ID + partition key (fastest query)
const user = await db.users.findUnique({
  where: {
    id: 'user_123',
    email: 'john@example.com' // Partition key required!
  }
});

// Query with conditions - fully typed
const activeUsers = await db.users.findMany({
  partitionKey: 'john@example.com',
  where: {
    isActive: true,
    age: { gte: 18 }
  },
  orderBy: { createdAt: 'desc' }
});`}
                </SyntaxHighlighter>
              )}

              {activeTab === "update" && (
                <SyntaxHighlighter
                  language="typescript"
                  style={oneDark}
                  customStyle={{
                    margin: 0,
                    padding: "1.5rem",
                    fontSize: "14px",
                    lineHeight: "1.6",
                  }}
                >
                  {`// Update specific fields
const updatedUser = await db.users.update({
  where: {
    id: 'user_123',
    email: 'john@example.com'
  },
  data: {
    name: 'John Smith', // Only changed fields
    age: 31
  }
});

// Update many with conditions
await db.users.updateMany({
  partitionKey: 'john@example.com',
  where: { lastLogin: { lt: new Date('2024-01-01') } },
  data: { isActive: false }
});`}
                </SyntaxHighlighter>
              )}

              {activeTab === "delete" && (
                <SyntaxHighlighter
                  language="typescript"
                  style={oneDark}
                  customStyle={{
                    margin: 0,
                    padding: "1.5rem",
                    fontSize: "14px",
                    lineHeight: "1.6",
                  }}
                >
                  {`// Delete by ID + partition key
await db.users.delete({
  where: {
    id: 'user_123',
    email: 'john@example.com'
  }
});

// Delete many with conditions
const deletedCount = await db.users.deleteMany({
  partitionKey: 'john@example.com',
  where: {
    isActive: false,
    createdAt: { lt: new Date('2023-01-01') }
  }
});`}
                </SyntaxHighlighter>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Getting Started */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-fd-foreground mb-4">
              Get started in 60 seconds
            </h2>
            <p className="text-lg text-fd-muted-foreground">
              Three steps to type-safe CosmosDB queries
            </p>
          </div>

          <div className="space-y-3">
            <div className="bg-fd-card rounded-lg p-5 border border-fd-border">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-sm font-mono text-fd-muted-foreground">
                  01
                </span>
                <h3 className="font-medium text-fd-foreground">Install</h3>
              </div>
              <div className="ml-8">
                <SyntaxHighlighter
                  language="bash"
                  style={oneDark}
                  customStyle={{
                    margin: 0,
                    padding: "0.75rem 1rem",
                    fontSize: "13px",
                    borderRadius: "0.375rem",
                  }}
                >
                  npm install cosmosql
                </SyntaxHighlighter>
              </div>
            </div>

            <div className="bg-fd-card rounded-lg p-5 border border-fd-border">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-sm font-mono text-fd-muted-foreground">
                  02
                </span>
                <h3 className="font-medium text-fd-foreground">
                  Define schema
                </h3>
              </div>
              <div className="ml-8">
                <SyntaxHighlighter
                  language="typescript"
                  style={oneDark}
                  customStyle={{
                    margin: 0,
                    padding: "0.75rem 1rem",
                    fontSize: "13px",
                    borderRadius: "0.375rem",
                  }}
                >
                  {`const users = container('users', {
  id: field.string(),
  email: field.string()
}).partitionKey('email');`}
                </SyntaxHighlighter>
              </div>
            </div>

            <div className="bg-fd-card rounded-lg p-5 border border-fd-border">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-sm font-mono text-fd-muted-foreground">
                  03
                </span>
                <h3 className="font-medium text-fd-foreground">
                  Query with type safety
                </h3>
              </div>
              <div className="ml-8">
                <SyntaxHighlighter
                  language="typescript"
                  style={oneDark}
                  customStyle={{
                    margin: 0,
                    padding: "0.75rem 1rem",
                    fontSize: "13px",
                    borderRadius: "0.375rem",
                  }}
                >
                  {`const user = await db.users.findUnique({
  where: { id: '123', email: 'user@example.com' }
});`}
                </SyntaxHighlighter>
              </div>
            </div>
          </div>

          <div className="mt-10 text-center">
            <Link
              href="/docs/getting-started"
              className="inline-flex items-center text-fd-muted-foreground hover:text-fd-foreground font-medium text-sm"
            >
              Read the full guide →
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6 bg-fd-accent/30 border-t border-fd-border">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-fd-foreground mb-6">
            Start building today
          </h2>
          <p className="text-xl text-fd-muted-foreground mb-10">
            Join developers using CosmosQL to build type-safe applications on
            Azure CosmosDB
          </p>
          <div className="flex justify-center gap-4 flex-wrap">
            <Link
              href="/docs/getting-started"
              className="px-6 py-3 bg-fd-foreground text-fd-background rounded-md font-medium hover:opacity-90 transition-all text-base"
            >
              Get Started →
            </Link>
            <Link
              href="/docs"
              className="px-6 py-3 border border-fd-border text-fd-foreground rounded-md font-medium hover:bg-fd-card transition-all text-base"
            >
              View Documentation
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
