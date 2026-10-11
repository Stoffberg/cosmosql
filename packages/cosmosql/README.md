# CosmosQL

> **Type-safe, zero-dependency library for Azure CosmosDB.** Catch expensive query mistakes at compile time, not when your bill arrives.

[![npm version](https://badge.fury.io/js/cosmosql.svg)](https://www.npmjs.com/package/cosmosql)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Bundle size](https://img.shields.io/bundlephobia/minzip/cosmosql)](https://bundlephobia.com/package/cosmosql)

## The Problem

CosmosDB is powerful but unforgiving. Three common mistakes cost teams thousands:

### 1. Forgotten Partition Keys → $2,400/month mistake
A developer wrote a query without a partition key. With 1,000 users it cost $5/month. With 100,000 users it cost $2,400/month. CosmosDB had to scan every partition.

### 2. Type Errors at Runtime → Production bugs
Try to access `user.emial` instead of `user.email`? JavaScript won't catch it. The bug ships, users get `undefined` emails.

### 3. Heavy Dependencies → Slow cold starts
The official Azure SDK pulls in 50+ packages. For serverless functions, this means slower cold starts and bigger bundles.

## The Solution

CosmosQL prevents these at compile time:

- **Partition keys required** - TypeScript won't compile without them
- **Type-safe queries** - Autocomplete catches field name typos
- **Zero dependencies** - Just TypeScript, direct REST API calls
- **Prisma-inspired API** - Familiar patterns with CosmosDB-specific optimizations

```typescript
import { createClient, container, field } from 'cosmosql';

const users = container('users', {
  id: field.string(),
  email: field.string(),
  name: field.string()
}).partitionKey('email');

const db = await createClient({
  connectionString: process.env.COSMOS_CONNECTION_STRING!,
  database: 'myapp',
  mode: 'auto-create'
}).withContainers({ users });

// Point read (1 RU - cheapest possible)
const user = await db.users.findUnique({
  where: { id: 'user_123', email: 'john@example.com' }
});

// TypeScript knows all return types automatically
```

## Installation

```bash
npm install cosmosql
```

**Requirements:**
- Node.js 18+ or Bun 1.0+
- TypeScript 5.0+

## Quick Start

```typescript
import { createClient, container, field } from 'cosmosql';
import dotenv from 'dotenv';

dotenv.config();

// Step 1: Define your schema
const users = container('users', {
  id: field.string(),
  email: field.string(),
  name: field.string(),
  age: field.number(),
  isActive: field.boolean().default(true),
  createdAt: field.date()
}).partitionKey('email');

// Step 2: Create a client (async - validates and creates containers)
const db = await createClient({
  connectionString: process.env.COSMOS_CONNECTION_STRING!,
  database: 'myapp',
  mode: 'auto-create' // Creates database/containers if missing (dev default)
}).withContainers({ users });

// Step 3: Create a user
const newUser = await db.users.create({
  data: {
    id: 'user_123',
    email: 'john@example.com',
    name: 'John Doe',
    age: 30,
    createdAt: new Date()
    // isActive automatically true (default)
  }
});

// Step 4: Query by ID + partition key (1 RU - cheapest)
const user = await db.users.findUnique({
  where: {
    id: 'user_123',
    email: 'john@example.com' // Partition key required!
  }
});

console.log('Created user:', newUser.name);
console.log('Found user:', user?.name);
```

## API Overview

### Schema Definition

```typescript
const users = container('users', {
  // Required fields
  id: field.string(),
  email: field.string(),
  name: field.string(),

  // Optional fields
  bio: field.string().optional(),

  // Fields with defaults
  viewCount: field.number().default(0),

  // Complex types
  tags: field.array(field.string()),
  profile: field.object({
    website: field.string().optional(),
    location: field.string().optional()
  }).optional(),

  // TTL (auto-delete after N seconds)
  ttl: field.number().optional()
}).partitionKey('email');
```

### CRUD Operations

```typescript
// Create
const user = await db.users.create({
  data: { id: 'user_123', email: 'john@example.com', name: 'John' }
});

// Read (point read - 1 RU)
const user = await db.users.findUnique({
  where: { id: 'user_123', email: 'john@example.com' }
});

// Query with filters (partition-scoped - 3-5 RU)
const activeUsers = await db.users.findMany({
  partitionKey: 'john@example.com',
  where: { isActive: true, age: { gte: 18 } },
  select: { name: true, email: true },
  orderBy: { age: 'desc' },
  take: 10
});

// Update
await db.users.update({
  where: { id: 'user_123', email: 'john@example.com' },
  data: { age: 31, name: 'John Smith' }
});

// Delete
await db.users.delete({
  where: { id: 'user_123', email: 'john@example.com' }
});
```

### Aggregations

```typescript
// Count documents
const count = await db.users.count({
  partitionKey: 'john@example.com',
  where: { isActive: true }
});

// Multiple aggregations in one query
const stats = await db.users.aggregate({
  partitionKey: 'john@example.com',
  _count: true,
  _sum: { age: true },
  _avg: { age: true },
  _min: { createdAt: true },
  _max: { createdAt: true }
});

// Group by operations
const categoryStats = await db.sales.groupBy({
  by: 'category',
  enableCrossPartitionQuery: true,
  _count: true,
  _sum: { amount: true },
  orderBy: { _sum_amount: 'desc' },
  take: 10
});
```

### Raw SQL Queries

```typescript
const result = await db.users.query<{ count: number }>({
  sql: 'SELECT COUNT(1) as count FROM c WHERE c.isActive = true',
  parameters: [{ name: '@active', value: true }],
  partitionKey: 'john@example.com'
});
```

## Performance Benefits

### Cost Comparison

| Query Type | RU Cost | Monthly Cost (1M queries) |
|------------|---------|---------------------------|
| Point read (with partition key) | 1 RU | $24 |
| Partition query | 3-5 RU | $72-120 |
| Cross-partition query | 100 RU | $2,400 |

**CosmosQL prevents expensive cross-partition queries at compile time.**

### Bundle Size
- **CosmosQL**: 43.6 kB packed
- **Azure SDK**: ~2-3 MB with all dependencies

### Runtime Performance
- Direct REST API calls (no SDK overhead)
- HTTP/2 connection pooling
- Automatic retries with exponential backoff
- Optimized for Bun runtime

## Use Cases

### Authentication Systems
```typescript
const users = container('users', {
  id: field.string(), // email as ID
  email: field.string(),
  passwordHash: field.string(),
}).partitionKey('email');

// Login = point read (1 RU)
const user = await db.users.findUnique({
  where: { id: email, email: email }
});
```

### Multi-Tenant SaaS
```typescript
const tenantData = container('data', {
  id: field.string(),
  tenantId: field.string(),
  data: field.object({...})
}).partitionKey('tenantId');

// Data automatically isolated per tenant
const tenantItems = await db.data.findMany({
  partitionKey: tenantId, // Only this tenant's data
  where: { status: 'active' }
});
```

### E-Commerce
```typescript
const products = container('products', {
  id: field.string(),
  category: field.string(),
  name: field.string(),
  price: field.number(),
  stock: field.number()
}).partitionKey('category');

// Fast category queries + aggregations
const electronics = await db.products.findMany({
  partitionKey: 'electronics',
  where: { stock: { gt: 0 } },
  orderBy: { price: 'asc' }
});

const stats = await db.products.aggregate({
  partitionKey: 'electronics',
  _count: true,
  _avg: { price: true }
});
```

### Analytics & Metrics
```typescript
const events = container('events', {
  id: field.string(),
  userId: field.string(),
  eventType: field.string(),
  timestamp: field.date(),
  duration: field.number()
}).partitionKey('userId');

// Time-series analysis with aggregations
const userStats = await db.events.aggregate({
  partitionKey: userId,
  where: { timestamp: { gte: new Date('2024-01-01') } },
  _count: true,
  _sum: { duration: true },
  _avg: { duration: true }
});
```

## Migration from Azure SDK

### Before (Azure SDK)
```typescript
const { CosmosClient } = require('@azure/cosmos');
const client = new CosmosClient(connectionString);
const database = client.database('myapp');
const container = database.container('users');

// Raw query - no type safety
const { resources } = await container.items
  .query('SELECT * FROM c WHERE c.email = @email', {
    parameters: [{ name: '@email', value: 'john@example.com' }]
  })
  .fetchAll();

const user = resources[0]; // Any type
```

### After (CosmosQL)
```typescript
const db = await createClient({
  connectionString,
  database: 'myapp'
}).withContainers({ users });

// Type-safe query
const user = await db.users.findUnique({
  where: { id: 'user_123', email: 'john@example.com' }
});
// Type: User | null
```

## Configuration

### Client Setup

```typescript
const db = await createClient({
  // Option 1: Connection string (recommended)
  connectionString: process.env.COSMOS_CONNECTION_STRING!,

  // Option 2: Explicit endpoint + key
  endpoint: 'https://myaccount.documents.azure.com:443/',
  key: process.env.COSMOS_KEY!,

  // Required
  database: 'myapp',

  // Optional: Container validation mode
  mode: 'auto-create', // 'auto-create' | 'verify' | 'skip'

  // Optional: Retry configuration
  retryOptions: {
    maxRetries: 3,
    initialDelay: 100,
    maxDelay: 5000
  }
}).withContainers({ users, posts, comments });
```

### Container Modes

- **`auto-create`** (development) - Creates missing containers automatically
- **`verify`** (production) - Validates containers exist with correct configuration
- **`skip`** (maximum performance) - No validation

## Error Handling

```typescript
import { CosmosError } from 'cosmosql';

try {
  const user = await db.users.findUnique({
    where: { id: 'user_123', email: 'john@example.com' }
  });
} catch (error) {
  if (error instanceof CosmosError) {
    if (error.statusCode === 429) {
      // Rate limited
      console.log('Retry after:', error.retryAfter);
    } else if (error.code === 'PARTITION_KEY_REQUIRED') {
      // Missing partition key
      console.error('Must provide partition key');
    }
  }
  throw error;
}
```

## Best Practices

### 1. Choose Good Partition Keys
- **High cardinality** - Many unique values
- **Even distribution** - Avoid hot partitions
- **Query alignment** - Match common query patterns

### 2. Use Partition-Scoped Queries
Always provide partition keys when possible:

```typescript
// ✅ Good - Single partition (fast & cheap)
const user = await db.users.findUnique({
  where: { id: 'user_123', email: 'john@example.com' }
});

// ❌ Bad - Cross-partition (expensive)
const user = await db.users.findUnique({
  where: { id: 'user_123' },
  enableCrossPartitionQuery: true
});
```

### 3. Combine Multiple Operations
More efficient than separate queries:

```typescript
// ✅ Good - Single query
const result = await db.users.findMany({
  partitionKey: 'john@example.com',
  aggregate: {
    _count: true,
    _avg: { age: true }
  }
});

// ❌ Bad - Two queries
const users = await db.users.findMany({ partitionKey: 'john@example.com' });
const stats = await db.users.aggregate({ partitionKey: 'john@example.com', _count: true });
```

### 4. Use Appropriate Modes
```typescript
// Development
const db = await createClient({
  connectionString,
  database: 'myapp',
  mode: 'auto-create' // Creates containers automatically
});

// Production
const db = await createClient({
  connectionString,
  database: 'myapp',
  mode: 'verify' // Fail fast if misconfigured
});
```

## Contributing

We welcome contributions! Please see our [Contributing Guide](https://github.com/stoffberg/cosmosql/blob/main/CONTRIBUTING.md) for details.

### Development Setup
```bash
git clone https://github.com/stoffberg/cosmosql
cd cosmosql
npm install
npm run dev
```

### Testing
```bash
npm test
npm run test:e2e  # Requires CosmosDB emulator
```

## Community

- **GitHub**: [github.com/stoffberg/cosmosql](https://github.com/stoffberg/cosmosql)
- **Issues**: [github.com/stoffberg/cosmosql/issues](https://github.com/stoffberg/cosmosql/issues)
- **Discussions**: [github.com/stoffberg/cosmosql/discussions](https://github.com/stoffberg/cosmosql/discussions)

## License

MIT © [Dirk Stoffberg](https://github.com/stoffberg/cosmosql)

---

**Ready to get started?** Check out our [Getting Started Guide](https://cosmosql.dev/docs/getting-started) and join thousands of developers building type-safe CosmosDB applications.
