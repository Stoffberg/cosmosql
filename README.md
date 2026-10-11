# CosmosQL

Type-safe, zero-dependency client for Azure Cosmos DB. Partition keys are enforced by the type checker, so the expensive query never ships.

[![npm version](https://img.shields.io/npm/v/cosmosql)](https://www.npmjs.com/package/cosmosql)
[![License: MIT](https://img.shields.io/badge/license-MIT-black)](LICENSE)

```bash
npm install cosmosql
```

```typescript
import { createClient, container, field } from "cosmosql";

const users = container("users", {
  id: field.string(),
  email: field.string(),
  name: field.string(),
}).partitionKey("email");

const db = await createClient({
  connectionString: process.env.COSMOS_CONNECTION_STRING!,
  database: "myapp",
}).withContainers({ users });

const user = await db.users.findUnique({
  where: { id: "user_123", email: "ada@example.com" },
});
```

**[Documentation](https://cosmosql.dev)** · [Package README](packages/cosmosql/README.md) · [Changelog](packages/cosmosql/CHANGELOG.md)

## Repository

| Path                | Contents                                     |
| ------------------- | -------------------------------------------- |
| `packages/cosmosql` | The library published to npm as `cosmosql`   |
| `apps/docs`         | [cosmosql.dev](https://cosmosql.dev), built with Next.js and Fumadocs |

## Development

Requires [Bun](https://bun.sh) 1.2 or newer.

```bash
bun install          # install every workspace
bun run dev          # docs site on http://localhost:3000
bun run test         # library unit tests
bun run type-check   # type-check every workspace
bun run build        # build every workspace
bun run lint         # Biome across the repo
```

Run a script in one workspace with `bun run --filter <name> <script>`, for example `bun run --filter cosmosql test:integration`.

## Releasing

Publishing a GitHub release publishes `packages/cosmosql` to npm with provenance.

## License

[MIT](LICENSE)
