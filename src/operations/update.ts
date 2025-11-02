import type { InferSchema, UpdateInput, CreateInput, PartitionKeyMissingError } from '../types';
import type { CosmosClient } from '../client/cosmos-client';
import type { ContainerSchema } from '../schema/container';
import { CreateOperations } from './create';

export class UpdateOperations<
  TSchema extends Record<string, any>,
  TPartitionKey extends keyof InferSchema<TSchema>
> {
  constructor(
    private client: CosmosClient,
    private schema: ContainerSchema<any, TSchema, TPartitionKey>
  ) {}

  async update(
    args: TPartitionKey extends never
      ? PartitionKeyMissingError
      : {
          where: { [K in TPartitionKey]: InferSchema<TSchema>[K] } & { id: string };
          data: UpdateInput<TSchema>;
        }
  ): Promise<InferSchema<TSchema>> {
    const { where, data } = args as any;

    if (!this.schema.partitionKeyField) {
      throw new Error('Container must have partition key defined');
    }

    const partitionKeyValue = where[this.schema.partitionKeyField];
    const id = where.id;

    // Get existing document
    const path = `/dbs/${this.client.getDatabase()}/colls/${this.schema.name}/docs/${id}`;
    const existing = await this.client.request('GET', path, undefined, partitionKeyValue);

    // Merge updates
    const updated = { ...existing, ...data };

    // Replace document
    const result = await this.client.request(
      'PUT',
      path,
      updated,
      partitionKeyValue
    );

    return result;
  }

  async upsert(
    args: TPartitionKey extends never
      ? PartitionKeyMissingError
      : {
          where: { [K in TPartitionKey]: InferSchema<TSchema>[K] } & { id: string };
          create: CreateInput<TSchema>;
          update: UpdateInput<TSchema>;
        }
  ): Promise<InferSchema<TSchema>> {
    const { where, create, update } = args as any;

    try {
      // Try to update
      return await this.update({ where, data: update } as any);
    } catch (error: any) {
      if (error.statusCode === 404) {
        // Document doesn't exist, create it
        const createOps = new CreateOperations(this.client, this.schema);
        return await createOps.create({ data: create });
      }
      throw error;
    }
  }
}

