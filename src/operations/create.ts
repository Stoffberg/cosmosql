import type { CosmosClient } from "../client/cosmos-client";
import type { ContainerSchema } from "../schema/container";
import type { CreateInput, InferSchema } from "../types";

/**
 * Handles document creation operations for a Cosmos DB container.
 *
 * @internal This class is used internally by ContainerClient
 */
export class CreateOperations<
	TSchema extends Record<string, any>,
	TPartitionKey extends keyof InferSchema<TSchema>,
> {
	constructor(
		private client: CosmosClient,
		private schema: ContainerSchema<any, TSchema, TPartitionKey>,
	) {}

	/**
	 * Creates a new document in the container.
	 *
	 * Applies schema defaults to missing fields and auto-generates document ID if not provided.
	 *
	 * @param args - Creation arguments
	 * @param args.data - The document data to create
	 * @returns The created document with ID and Cosmos DB metadata
	 * @throws {CosmosError} If the creation fails
	 */
	async create(args: { data: CreateInput<TSchema> }): Promise<InferSchema<TSchema>> {
		const { data } = args;

		// Apply defaults
		const document = this.applyDefaults(data);

		const path = `/dbs/${this.client.getDatabase()}/colls/${this.schema.name}/docs`;

		const partitionKeyValue = this.schema.partitionKeyField
			? (document as any)[this.schema.partitionKeyField]
			: undefined;

		const result = await this.client.request("POST", path, document, partitionKeyValue);

		return result;
	}

	/**
	 * Creates a document or replaces it if it already exists (based on ID).
	 *
	 * Uses Cosmos DB's native upsert functionality for efficient create-or-replace.
	 *
	 * @param args - Upsert arguments
	 * @param args.data - Complete document data (must include ID if updating)
	 * @returns The created or updated document
	 * @throws {CosmosError} If the operation fails
	 */
	async upsert(args: { data: CreateInput<TSchema> }): Promise<InferSchema<TSchema>> {
		const { data } = args;

		// Apply defaults
		const document = this.applyDefaults(data);

		const path = `/dbs/${this.client.getDatabase()}/colls/${this.schema.name}/docs`;

		const partitionKeyValue = this.schema.partitionKeyField
			? (document as any)[this.schema.partitionKeyField]
			: undefined;

		const result = await this.client.request(
			"POST",
			path,
			document,
			partitionKeyValue,
			undefined, // enableCrossPartitionQuery
			{ "x-ms-documentdb-is-upsert": "true" }, // extraHeaders
		);

		return result;
	}

	/**
	 * Creates multiple documents in a single batch operation.
	 *
	 * All documents must belong to the same partition key.
	 * This is more efficient than calling create() multiple times.
	 *
	 * @param args - Batch creation arguments
	 * @param args.data - Array of documents to create
	 * @param args.partitionKey - The partition key value shared by all documents
	 * @returns Result of the batch operation
	 * @throws {Error} If documents don't share the same partition key
	 * @throws {CosmosError} If the batch operation fails
	 */
	async createMany(args: {
		data: Array<CreateInput<TSchema>>;
		partitionKey: InferSchema<TSchema>[TPartitionKey];
	}) {
		const { data, partitionKey } = args;

		// Verify all documents have same partition key
		if (this.schema.partitionKeyField) {
			const allSamePartition = data.every(
				(doc) => (doc as any)[this.schema.partitionKeyField] === partitionKey,
			);

			if (!allSamePartition) {
				throw new Error("All documents in createMany must share the same partition key");
			}
		}

		// CosmosDB batch API
		const path = `/dbs/${this.client.getDatabase()}/colls/${this.schema.name}`;

		const operations = data.map((doc) => ({
			operationType: "Create",
			resourceBody: this.applyDefaults(doc),
		}));

		const result = await this.client.request("POST", path, operations, partitionKey);

		return result;
	}

	/**
	 * Applies schema default values to fields that are undefined.
	 *
	 * @param data - The document data
	 * @returns Document data with defaults applied
	 * @internal
	 */
	private applyDefaults(data: any): any {
		const result = { ...data };

		for (const [key, config] of Object.entries(this.schema.schema)) {
			if (config.default !== undefined && result[key] === undefined) {
				result[key] = typeof config.default === "function" ? config.default() : config.default;
			}
		}

		return result;
	}
}
