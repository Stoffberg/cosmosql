import { AggregateOps } from "../operations/aggregate";
import { CreateOperations } from "../operations/create";
import { DeleteOperations } from "../operations/delete";
import {
	type FindManyArgs,
	type FindManyResult,
	FindOperations,
	type FindUniqueArgs,
} from "../operations/find";
import { UpdateOperations } from "../operations/update";
import type { ContainerSchema } from "../schema/container";
import type {
	AggregateOperations,
	AggregateOptions,
	AggregateResult,
	CountOptions,
	CreateInput,
	ExtractAggregateOps,
	GroupByOptions,
	GroupByResult,
	InferSchema,
	KeysOfType,
	PartitionKeyMissingError,
	SelectInput,
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
	private aggregateOps: AggregateOps<TSchema, TPartitionKey>;

	constructor(client: CosmosClient, schema: ContainerSchema<any, TSchema, TPartitionKey>) {
		this.findOps = new FindOperations(client, schema);
		this.createOps = new CreateOperations(client, schema);
		this.updateOps = new UpdateOperations(client, schema);
		this.deleteOps = new DeleteOperations(client, schema);
		this.aggregateOps = new AggregateOps(client, schema);
	}

	findUnique<S extends SelectInput<InferSchema<TSchema>> | undefined = undefined>(
		args: TPartitionKey extends never
			? PartitionKeyMissingError
			: FindUniqueArgs<InferSchema<TSchema>, TPartitionKey, NonNullable<S>>,
	) {
		return this.findOps.findUnique(args);
	}

	findMany<
		S extends SelectInput<InferSchema<TSchema>> | undefined = undefined,
		A extends AggregateOperations<InferSchema<TSchema>> | undefined = undefined,
	>(
		args?: FindManyArgs<InferSchema<TSchema>, NonNullable<S>, TPartitionKey, A>,
	): Promise<FindManyResult<InferSchema<TSchema>, S, A>> {
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

	// Aggregation methods
	async count(options: CountOptions<InferSchema<TSchema>>): Promise<number> {
		return this.aggregateOps.count(options);
	}

	async aggregate<Opts extends AggregateOptions<InferSchema<TSchema>>>(
		options: Opts,
	): Promise<
		AggregateResult<InferSchema<TSchema>, ExtractAggregateOps<InferSchema<TSchema>, Opts>>
	> {
		return this.aggregateOps.aggregate(options) as any;
	}

	// Overload for readonly array
	async groupBy<
		K extends readonly (keyof InferSchema<TSchema>)[],
		Opts extends GroupByOptions<InferSchema<TSchema>, K>,
	>(
		options: Opts & { by: K },
	): Promise<
		GroupByResult<InferSchema<TSchema>, K, ExtractAggregateOps<InferSchema<TSchema>, Opts>>
	>;

	// Overload for single key
	async groupBy<
		K extends keyof InferSchema<TSchema>,
		Opts extends GroupByOptions<InferSchema<TSchema>, K>,
	>(
		options: Opts & { by: K },
	): Promise<
		GroupByResult<InferSchema<TSchema>, K, ExtractAggregateOps<InferSchema<TSchema>, Opts>>
	>;

	// Implementation
	async groupBy(options: any): Promise<any> {
		return this.aggregateOps.groupBy(options);
	}

	async sum(
		field: KeysOfType<InferSchema<TSchema>, number>,
		options: CountOptions<InferSchema<TSchema>>,
	): Promise<number | null> {
		return this.aggregateOps.sum(field, options);
	}

	async avg(
		field: KeysOfType<InferSchema<TSchema>, number>,
		options: CountOptions<InferSchema<TSchema>>,
	): Promise<number | null> {
		return this.aggregateOps.avg(field, options);
	}

	async min<K extends keyof InferSchema<TSchema>>(
		field: K,
		options: CountOptions<InferSchema<TSchema>>,
	): Promise<InferSchema<TSchema>[K] | null> {
		return this.aggregateOps.min(field, options);
	}

	async max<K extends keyof InferSchema<TSchema>>(
		field: K,
		options: CountOptions<InferSchema<TSchema>>,
	): Promise<InferSchema<TSchema>[K] | null> {
		return this.aggregateOps.max(field, options);
	}
}
