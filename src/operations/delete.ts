import type { CosmosClient } from "../client/cosmos-client";
import type { ContainerSchema } from "../schema/container";
import type { InferSchema, PartitionKeyMissingError } from "../types";

/**
 * Handles document deletion operations for a Cosmos DB container.
 * 
 * @internal This class is used internally by ContainerClient
 */
export class DeleteOperations<
	TSchema extends Record<string, any>,
	TPartitionKey extends keyof InferSchema<TSchema>,
> {
	constructor(
		private client: CosmosClient,
		private schema: ContainerSchema<any, TSchema, TPartitionKey>,
	) {}

	/**
	 * Deletes a document by ID and partition key.
	 * 
	 * This operation is permanent and cannot be undone.
	 * Both the document ID and partition key value are required.
	 * 
	 * @param args - Delete arguments
	 * @param args.where - Must include both 'id' and the partition key field
	 * @returns Void on success
	 * @throws {Error} If partition key is missing
	 * @throws {CosmosError} If the deletion fails
	 */
	async delete(
		args: TPartitionKey extends never
			? PartitionKeyMissingError
			: {
					where: { [K in TPartitionKey]: InferSchema<TSchema>[K] } & {
						id: string;
					};
				},
	) {
		const { where } = args as any;

		if (!this.schema.partitionKeyField) {
			throw new Error("Container must have partition key defined");
		}

		const partitionKeyValue = where[this.schema.partitionKeyField];
		const id = where.id;

		const path = `/dbs/${this.client.getDatabase()}/colls/${this.schema.name}/docs/${id}`;

		await this.client.request("DELETE", path, undefined, partitionKeyValue);
	}
}
