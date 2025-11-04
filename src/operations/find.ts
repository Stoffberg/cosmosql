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

/**
 * Arguments for finding a unique document by ID and partition key.
 *
 * @template T - The document type
 * @template PK - The partition key field name
 * @template S - Optional select projection
 */
export interface FindUniqueArgs<
	T,
	PK extends keyof T,
	S extends SelectInput<T> | undefined = undefined,
> {
	/** Where clause must include both ID and partition key */
	where: { [K in PK]: T[K] } & Partial<T>;
	/** Optional field projection to return only specific fields */
	select?: S;
}

/**
 * Arguments for finding multiple documents with filtering, sorting, and pagination.
 *
 * @template T - The document type
 * @template S - Optional select projection
 * @template PK - The partition key field name
 * @template A - Optional aggregation operations
 */
export interface FindManyArgs<
	T,
	S extends SelectInput<T> | undefined = undefined,
	PK extends keyof T = never,
	A extends AggregateOperations<T> | undefined = undefined,
> {
	/** Filter conditions using type-safe operators */
	where?: WhereInput<T>;
	/** Field projection to return only specific fields */
	select?: S;
	/** Sort order specification */
	orderBy?: OrderByInput<T>;
	/** Limit number of results */
	take?: number;
	/** Skip number of results (for pagination) */
	skip?: number;
	/** Partition key value to scope the query */
	partitionKey?: PK extends never ? never : T[PK];
	/** Allow cross-partition queries (can be expensive) */
	enableCrossPartitionQuery?: boolean;
	/** Aggregation operations to perform alongside the query */
	aggregate?: A;
}

/**
 * Result type for findMany that includes both data and optional aggregations.
 *
 * @template T - The document type
 * @template S - Optional select projection
 * @template A - Optional aggregation operations
 */
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

/**
 * Handles document query and retrieval operations for a Cosmos DB container.
 *
 * @internal This class is used internally by ContainerClient
 */
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

	/**
	 * Finds a single document by its ID and partition key.
	 *
	 * This is the most efficient way to retrieve a document as it uses direct document access.
	 * Both the document ID and partition key value are required.
	 *
	 * @template S - Optional select projection
	 * @param args - Query arguments
	 * @returns The document if found, or null if not found
	 * @throws {Error} If partition key is missing
	 * @throws {CosmosError} If the query fails
	 */
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

	/**
	 * Queries multiple documents with filtering, sorting, pagination, and optional aggregations.
	 *
	 * Supports a rich query API with type-safe filters, projections, and aggregations.
	 * Requires either a partitionKey or enableCrossPartitionQuery: true.
	 *
	 * @template S - Optional select projection
	 * @template A - Optional aggregation operations
	 * @param args - Query arguments
	 * @returns Array of documents (or object with data + aggregations if aggregate is specified)
	 * @throws {Error} If neither partitionKey nor enableCrossPartitionQuery is provided
	 * @throws {CosmosError} If the query fails
	 */
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

	/**
	 * Executes a raw SQL query against the container.
	 *
	 * Use this for custom queries that aren't supported by the query builder.
	 * Supports parameterized queries to prevent injection attacks.
	 *
	 * @template TResult - The expected return type of the query results
	 * @param args - Query arguments
	 * @param args.sql - Raw SQL query string
	 * @param args.parameters - Query parameters (use @paramName in SQL)
	 * @param args.partitionKey - Optional partition key to scope the query
	 * @returns Array of query results
	 * @throws {CosmosError} If the query fails
	 */
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

	/**
	 * Applies field selection/projection to a document.
	 *
	 * @template T - The document type
	 * @template S - The select projection type
	 * @param data - The source document
	 * @param select - The field selection specification
	 * @returns A new object with only the selected fields
	 * @internal
	 */
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
