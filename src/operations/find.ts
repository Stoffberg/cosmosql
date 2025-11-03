import type { CosmosClient } from "../client/cosmos-client";
import { AggregateQueryBuilder } from "../query/aggregate-builder";
import { AggregateResultParser } from "../query/aggregate-parser";
import { QueryBuilder } from "../query/query-builder";
import type { ContainerSchema } from "../schema/container";
import type {
	AggregateOperations,
	AggregateResult,
	InferSchema,
	OrderByInput,
	PartitionKeyMissingError,
	SelectInput,
	SelectResult,
	WhereInput,
} from "../types";

export interface FindUniqueArgs<
	T,
	PK extends keyof T,
	S extends SelectInput<T> | undefined = undefined,
> {
	where: { [K in PK]: T[K] } & Partial<T>;
	select?: S;
}

export interface FindManyArgs<
	T,
	S extends SelectInput<T> | undefined = undefined,
	PK extends keyof T = never,
	A extends AggregateOperations<T> | undefined = undefined,
> {
	where?: WhereInput<T>;
	select?: S;
	orderBy?: OrderByInput<T>;
	take?: number;
	skip?: number;
	partitionKey?: PK extends never ? never : T[PK];
	enableCrossPartitionQuery?: boolean;
	aggregate?: A;
}

// Result type for findMany with aggregations
export type FindManyResult<
	T,
	S extends SelectInput<T> | undefined,
	A extends AggregateOperations<T> | undefined,
> = A extends undefined
	? S extends undefined
		? T[]
		: SelectResult<T, NonNullable<S>>[]
	: {
			data: S extends undefined ? T[] : SelectResult<T, NonNullable<S>>[];
		} & AggregateResult<T, NonNullable<A>>;

export class FindOperations<
	TSchema extends Record<string, any>,
	TPartitionKey extends keyof InferSchema<TSchema>,
> {
	private aggregateBuilder: AggregateQueryBuilder<InferSchema<TSchema>>;
	private resultParser: AggregateResultParser;

	constructor(
		private client: CosmosClient,
		private schema: ContainerSchema<any, TSchema, TPartitionKey>,
	) {
		this.aggregateBuilder = new AggregateQueryBuilder<InferSchema<TSchema>>();
		this.resultParser = new AggregateResultParser();
	}

	async findUnique<S extends SelectInput<InferSchema<TSchema>> | undefined = undefined>(
		args: TPartitionKey extends never
			? PartitionKeyMissingError
			: FindUniqueArgs<InferSchema<TSchema>, TPartitionKey, NonNullable<S>>,
	): Promise<
		S extends undefined
			? InferSchema<TSchema> | null
			: SelectResult<InferSchema<TSchema>, NonNullable<S>> | null
	> {
		const { where, select } = args as any;

		if (!this.schema.partitionKeyField) {
			throw new Error("Container must have a partition key defined");
		}

		const partitionKeyValue = where[this.schema.partitionKeyField];
		const id = where.id;

		if (!id || !partitionKeyValue) {
			throw new Error("Both id and partition key are required for findUnique");
		}

		const path = `/dbs/${this.client.getDatabase()}/colls/${this.schema.name}/docs/${id}`;

		try {
			const result = await this.client.request("GET", path, undefined, partitionKeyValue);

			if (select) {
				return this.applySelect(result, select) as any;
			}

			return result as any;
		} catch (error: any) {
			if (error.statusCode === 404) {
				return null as any;
			}
			throw error;
		}
	}

	async findMany<
		S extends SelectInput<InferSchema<TSchema>> | undefined = undefined,
		A extends AggregateOperations<InferSchema<TSchema>> | undefined = undefined,
	>(
		args: FindManyArgs<InferSchema<TSchema>, NonNullable<S>, TPartitionKey, A> = {},
	): Promise<FindManyResult<InferSchema<TSchema>, S, A>> {
		const {
			where,
			select,
			orderBy,
			take,
			skip,
			partitionKey,
			enableCrossPartitionQuery,
			aggregate,
		} = args;

		if (!partitionKey && !enableCrossPartitionQuery) {
			throw new Error("Either partitionKey or enableCrossPartitionQuery must be provided");
		}

		// If no aggregation, use standard query path
		if (!aggregate) {
			const builder = new QueryBuilder<InferSchema<TSchema>>();

			if (select) {
				const fields = Object.keys(select);
				builder.select(fields);
			}

			if (where) {
				builder.where(where);
			}

			if (orderBy) {
				builder.orderBy(orderBy);
			}

			if (take) {
				builder.take(take);
			}

			if (skip) {
				builder.skip(skip);
			}

			const { query, parameters } = builder.build();
			const path = `/dbs/${this.client.getDatabase()}/colls/${this.schema.name}/docs`;

			try {
				const result = await this.client.request(
					"POST",
					path,
					{
						query,
						parameters,
					},
					partitionKey,
					enableCrossPartitionQuery,
				);

				return (result.Documents || []) as any;
			} catch (error: any) {
				// Provide better error message for cross-partition query errors
				if (
					error.code === "CROSS_PARTITION_QUERY_ERROR" ||
					error.message?.includes("cross partition")
				) {
					throw new Error(
						`Cross-partition query failed: ${error.message}. ` +
							"This often occurs with empty containers. Consider using a partition key instead, " +
							"or ensure the container has data before performing cross-partition queries.",
					);
				}
				throw error;
			}
		}

		// With aggregation, we need to execute both queries
		const path = `/dbs/${this.client.getDatabase()}/colls/${this.schema.name}/docs`;

		try {
			// Execute data query
			const builder = new QueryBuilder<InferSchema<TSchema>>();

			if (select) {
				const fields = Object.keys(select);
				builder.select(fields);
			}

			if (where) {
				builder.where(where);
			}

			if (orderBy) {
				builder.orderBy(orderBy);
			}

			if (take) {
				builder.take(take);
			}

			if (skip) {
				builder.skip(skip);
			}

			const { query, parameters } = builder.build();

			// Execute aggregate query
			const { sql: aggSql, parameters: aggParams } = this.aggregateBuilder.buildAggregate({
				where,
				...aggregate,
			});

			// Execute both queries in parallel
			const [dataResult, aggResult] = await Promise.all([
				this.client.request(
					"POST",
					path,
					{ query, parameters },
					partitionKey,
					enableCrossPartitionQuery,
				),
				this.client.request(
					"POST",
					path,
					{ query: aggSql, parameters: aggParams },
					partitionKey,
					enableCrossPartitionQuery,
				),
			]);

			const data = dataResult.Documents || [];
			const rawAggResult = (Array.isArray(aggResult) ? aggResult : aggResult.Documents)?.[0] ?? {};
			const aggregations = this.resultParser.parseAggregateResult(rawAggResult, aggregate);

			// Combine into result
			return {
				data,
				...aggregations,
			} as any;
		} catch (error: any) {
			// Provide better error message for cross-partition query errors
			if (
				error.code === "CROSS_PARTITION_QUERY_ERROR" ||
				error.message?.includes("cross partition")
			) {
				throw new Error(
					`Cross-partition query failed: ${error.message}. ` +
						"This often occurs with empty containers. Consider using a partition key instead, " +
						"or ensure the container has data before performing cross-partition queries.",
				);
			}
			throw error;
		}
	}

	async query<TResult = InferSchema<TSchema>>(args: {
		sql: string;
		parameters?: Array<{ name: string; value: unknown }>;
		partitionKey?: InferSchema<TSchema>[TPartitionKey];
	}): Promise<TResult[]> {
		const { sql, parameters = [], partitionKey } = args;

		const path = `/dbs/${this.client.getDatabase()}/colls/${this.schema.name}/docs`;

		const result = await this.client.request(
			"POST",
			path,
			{ query: sql, parameters },
			partitionKey,
		);

		return result.Documents || [];
	}

	private applySelect<T, S extends SelectInput<T>>(data: T, select: S): SelectResult<T, S> {
		const result: any = {};

		for (const [key, value] of Object.entries(select)) {
			if (value === true) {
				result[key] = (data as any)[key];
			} else if (typeof value === "object" && value !== null) {
				result[key] = this.applySelect((data as any)[key], value);
			}
		}

		return result as SelectResult<T, S>;
	}
}
