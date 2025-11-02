import type { CosmosClient } from "../client/cosmos-client";
import type { ContainerSchema } from "../schema/container";
import type { InferSchema, PartitionKeyMissingError } from "../types";

export class DeleteOperations<
	TSchema extends Record<string, any>,
	TPartitionKey extends keyof InferSchema<TSchema>,
> {
	constructor(
		private client: CosmosClient,
		private schema: ContainerSchema<any, TSchema, TPartitionKey>,
	) {}

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
