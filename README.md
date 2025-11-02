# CosmosQL

Type-safe, minimal ORM for Azure CosmosDB with excellent developer experience.

## Features

- 🎯 **100% Type-Safe** - Catch errors at compile time
- ⚡ **Zero Overhead** - Direct REST API, no heavy SDK
- 🧠 **Partition Key Aware** - Enforces best practices
- 📦 **Zero Dependencies** - Only TypeScript
- 🎨 **Excellent DX** - Intuitive Prisma-inspired API

## Installation

```bash
npm install cosmosql
```

## Quick Start

```typescript
import { createClient, container, field } from 'cosmosql';

// Define schema
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

// Query with type safety
const user = await db.users.findUnique({
  where: { id: 'user_123', email: 'john@example.com' }
});
```

## Documentation

See the [full documentation](https://cosmosql.dev) for complete API reference and guides.

## Repository

[GitHub](https://github.com/Stoffberg/cosmosql)

## License

MIT

