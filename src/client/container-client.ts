import { CreateOperations } from "../operations/create";
import { DeleteOperations } from "../operations/delete";
import { type FindManyArgs, FindOperations, type FindUniqueArgs } from "../operations/find";
import { UpdateOperations } from "../operations/update";
import type { ContainerSchema } from "../schema/container";
import type {
	CreateInput,
	InferSchema,
	PartitionKeyMissingError,
	SelectInput,
	SelectResult,
	UpdateInput,
} from "../types";
import type { CosmosClient } from "./cosmos-client";

export class ContainerClient<
	TSchema extends Record<string, any>,
	TPartitionKey extends keyof InferSchema<TSchema>,
> {
	private findOps: FindOperations<TSchema, TPartitionKey>;
	private createOps: CreateOperations<TSchema, TPartitionKey>;
	private updateOps: UpdateOperations<TSchema, TPartitionKey>;
	private deleteOps: DeleteOperations<TSchema, TPartitionKey>;

	constructor(client: CosmosClient, schema: ContainerSchema<any, TSchema, TPartitionKey>) {
		this.findOps = new FindOperations(client, schema);
		this.createOps = new CreateOperations(client, schema);
		this.updateOps = new UpdateOperations(client, schema);
		this.deleteOps = new DeleteOperations(client, schema);
	}

	findUnique<S extends SelectInput<InferSchema<TSchema>> | undefined = undefined>(
		args: TPartitionKey extends never
			? PartitionKeyMissingError
			: FindUniqueArgs<InferSchema<TSchema>, TPartitionKey, NonNullable<S>>,
	) {
		return this.findOps.findUnique(args);
	}

	findMany<S extends SelectInput<InferSchema<TSchema>> | undefined = undefined>(
		args?: FindManyArgs<InferSchema<TSchema>, NonNullable<S>, TPartitionKey>,
	): Promise<
		S extends undefined
			? InferSchema<TSchema>[]
			: SelectResult<InferSchema<TSchema>, NonNullable<S>>[]
	> {
		return this.findOps.findMany(args);
	}

	query<TResult = InferSchema<TSchema>>(args: {
		sql: string;
		parameters?: Array<{ name: string; value: unknown }>;
		partitionKey?: InferSchema<TSchema>[TPartitionKey];
	}) {
		return this.findOps.query<TResult>(args);
	}

	create(args: { data: CreateInput<TSchema> }) {
		return this.createOps.create(args);
	}

	createMany(args: {
		data: Array<CreateInput<TSchema>>;
		partitionKey: InferSchema<TSchema>[TPartitionKey];
	}) {
		return this.createOps.createMany(args);
	}

	update(
		args: TPartitionKey extends never
			? PartitionKeyMissingError
			: {
					where: { [K in TPartitionKey]: InferSchema<TSchema>[K] } & {
						id: string;
					};
					data: UpdateInput<TSchema>;
				},
	) {
		return this.updateOps.update(args);
	}

	upsert(args: { data: CreateInput<TSchema> }) {
		return this.createOps.upsert(args);
	}

	delete(
		args: TPartitionKey extends never
			? PartitionKeyMissingError
			: {
					where: { [K in TPartitionKey]: InferSchema<TSchema>[K] } & {
						id: string;
					};
				},
	) {
		return this.deleteOps.delete(args);
	}
}
