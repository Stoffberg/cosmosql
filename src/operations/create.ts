import type { CosmosClient } from "../client/cosmos-client";
import type { ContainerSchema } from "../schema/container";
import type { CreateInput, InferSchema } from "../types";

export class CreateOperations<
	TSchema extends Record<string, any>,
	TPartitionKey extends keyof InferSchema<TSchema>,
> {
	constructor(
		private client: CosmosClient,
		private schema: ContainerSchema<any, TSchema, TPartitionKey>,
	) {}

	async create(args: {
		data: CreateInput<TSchema>;
	}): Promise<InferSchema<TSchema>> {
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
		);

		return result;
	}

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
				throw new Error(
					"All documents in createMany must share the same partition key",
				);
			}
		}

		// CosmosDB batch API
		const path = `/dbs/${this.client.getDatabase()}/colls/${this.schema.name}`;

		const operations = data.map((doc) => ({
			operationType: "Create",
			resourceBody: this.applyDefaults(doc),
		}));

		const result = await this.client.request(
			"POST",
			path,
			operations,
			partitionKey,
		);

		return result;
	}

	private applyDefaults(data: any): any {
		const result = { ...data };

		for (const [key, config] of Object.entries(this.schema.schema)) {
			if (config.default !== undefined && result[key] === undefined) {
				result[key] =
					typeof config.default === "function"
						? config.default()
						: config.default;
			}
		}

		return result;
	}
}
