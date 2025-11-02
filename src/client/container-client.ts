import type { ContainerSchema } from '../schema/container';
import type { CosmosClient } from './cosmos-client';
import { FindOperations } from '../operations/find';
import { CreateOperations } from '../operations/create';
import { UpdateOperations } from '../operations/update';
import { DeleteOperations } from '../operations/delete';

export class ContainerClient<
  TSchema extends Record<string, any>,
  TPartitionKey extends keyof TSchema
> {
  private findOps: FindOperations<TSchema, TPartitionKey>;
  private createOps: CreateOperations<TSchema, TPartitionKey>;
  private updateOps: UpdateOperations<TSchema, TPartitionKey>;
  private deleteOps: DeleteOperations<TSchema, TPartitionKey>;

  constructor(
    client: CosmosClient,
    schema: ContainerSchema<any, TSchema, TPartitionKey>
  ) {
    this.findOps = new FindOperations(client, schema);
    this.createOps = new CreateOperations(client, schema);
    this.updateOps = new UpdateOperations(client, schema);
    this.deleteOps = new DeleteOperations(client, schema);
  }

  findUnique(args: any) { return this.findOps.findUnique(args); }
  findMany(args?: any) { return this.findOps.findMany(args); }
  query(args: any) { return this.findOps.query(args); }
  
  create(args: any) { return this.createOps.create(args); }
  createMany(args: any) { return this.createOps.createMany(args); }
  
  update(args: any) { return this.updateOps.update(args); }
  upsert(args: any) { return this.updateOps.upsert(args); }
  
  delete(args: any) { return this.deleteOps.delete(args); }
}
