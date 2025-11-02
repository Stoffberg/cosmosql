import { CosmosClient, type CosmosClientConfig } from './client/cosmos-client';
import { ContainerClient } from './client/container-client';
import type { ContainerSchema } from './schema/container';

export { field } from './schema/field';
export { container } from './schema/container';
export { CosmosError, isCosmosError } from './errors/cosmos-error';

export type { 
  InferSchema,
  CreateInput,
  UpdateInput,
  WhereInput,
  SelectInput,
  OrderByInput
} from './types';

export function createClient(config: CosmosClientConfig) {
  const client = new CosmosClient(config);

  return {
    withContainers<T extends Record<string, ContainerSchema<any, any, any>>>(
      containers: T
    ): {
      [K in keyof T]: T[K] extends ContainerSchema<any, infer S, infer PK>
        ? ContainerClient<S, PK>
        : never;
    } {
      const result: any = {};

      for (const [name, schema] of Object.entries(containers)) {
        result[name] = new ContainerClient(client, schema);
      }

      return result;
    }
  };
}

