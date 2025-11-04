import type { CosmosClient } from "../client/cosmos-client";
import type { ContainerSchema } from "../schema/container";
import type { CreateInput, InferSchema, PartitionKeyMissingError, UpdateInput } from "../types";
import { CreateOperations } from "./create";

/**
 * Handles document update operations for a Cosmos DB container.
 * 
 * @internal This class is used internally by ContainerClient
 */
export class UpdateOperations<
	TSchema extends Record<string, any>,
	TPartitionKey extends keyof InferSchema<TSchema>,
> {
	constructor(
		private client: CosmosClient,
		private schema: ContainerSchema<any, TSchema, TPartitionKey>,
	) {}

	/**
	 * Updates an existing document by ID and partition key.
	 * 
	 * Performs a read-modify-write operation. Only the specified fields are updated;
	 * other fields remain unchanged. Supports nested field updates using dot notation.
	 * 
	 * @param args - Update arguments
	 * @param args.where - Must include both 'id' and the partition key field
	 * @param args.data - Partial document with fields to update
	 * @returns The updated document
	 * @throws {Error} If partition key is missing
	 * @throws {CosmosError} If the update fails
	 */
	async update(
		args: TPartitionKey extends never
			? PartitionKeyMissingError
			: {
					where: { [K in TPartitionKey]: InferSchema<TSchema>[K] } & {
						id: string;
					};
					data: UpdateInput<TSchema>;
				},
	) {
		const { where, data } = args as any;

		if (!this.schema.partitionKeyField) {
			throw new Error("Container must have partition key defined");
		}

		const partitionKeyValue = where[this.schema.partitionKeyField];
		const id = where.id;

		// Get existing document
		const path = `/dbs/${this.client.getDatabase()}/colls/${this.schema.name}/docs/${id}`;
		const existing = await this.client.request("GET", path, undefined, partitionKeyValue);

		// Merge updates (handle nested paths like "metadata.updated")
		const updated = { ...existing };
		for (const [key, value] of Object.entries(data)) {
			if (key.includes(".")) {
				// Handle nested path
				const parts = key.split(".");
				let current: any = updated;
				for (let i = 0; i < parts.length - 1; i++) {
					if (!current[parts[i]]) {
						current[parts[i]] = {};
					}
					current = current[parts[i]];
				}
				current[parts[parts.length - 1]] = value;
			} else {
				// Simple field
				updated[key] = value;
			}
		}

		// Replace document
		const result = await this.client.request("PUT", path, updated, partitionKeyValue);

		return result;
	}

	/**
	 * Updates a document if it exists, creates it if it doesn't.
	 * 
	 * Attempts to update first. If the document doesn't exist (404), creates it instead.
	 * 
	 * @param args - Upsert arguments
	 * @param args.where - Must include both 'id' and the partition key field
	 * @param args.create - Data to use if creating a new document
	 * @param args.update - Data to use if updating an existing document
	 * @returns The created or updated document
	 * @throws {CosmosError} If the operation fails
	 */
	async upsert(
		args: TPartitionKey extends never
			? PartitionKeyMissingError
			: {
					where: { [K in TPartitionKey]: InferSchema<TSchema>[K] } & {
						id: string;
					};
					create: CreateInput<TSchema>;
					update: UpdateInput<TSchema>;
				},
	) {
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
