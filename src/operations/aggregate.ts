import type { CosmosClient } from "../client/cosmos-client";
import { AggregateQueryBuilder } from "../query/aggregate-builder";
import { AggregateResultParser } from "../query/aggregate-parser";
import type { ContainerSchema } from "../schema/container";
import type {
	AggregateOptions,
	AggregateResult,
	CountOptions,
	ExtractAggregateOps,
	GroupByOptions,
	GroupByResult,
	InferSchema,
	KeysOfType,
} from "../types";

/**
 * Handles aggregation operations for a Cosmos DB container.
 * 
 * Provides count, sum, avg, min, max, and groupBy operations with
 * type-safe query building and result parsing.
 * 
 * @internal This class is used internally by ContainerClient
 */
export class AggregateOps<
	TSchema extends Record<string, any>,
	TPartitionKey extends keyof InferSchema<TSchema>,
> {
	private queryBuilder: AggregateQueryBuilder<InferSchema<TSchema>>;
	private resultParser: AggregateResultParser;

	constructor(
		private client: CosmosClient,
		private schema: ContainerSchema<any, TSchema, TPartitionKey>,
	) {
		this.queryBuilder = new AggregateQueryBuilder<InferSchema<TSchema>>();
		this.resultParser = new AggregateResultParser();
	}

	/**
	 * Counts the number of documents matching the filter criteria.
	 * 
	 * Requires either a partitionKey or enableCrossPartitionQuery: true.
	 * Efficient operation that doesn't load document contents.
	 * 
	 * @param options - Count options including where clause and partition key
	 * @returns The count of matching documents
	 * @throws {Error} If neither partitionKey nor enableCrossPartitionQuery is provided
	 * @throws {CosmosError} If the query fails
	 */
	async count(options: CountOptions<InferSchema<TSchema>>): Promise<number> {
		// Validate partition key requirement
		this.validatePartitionKey(options);

		// Build query
		const { sql, parameters } = this.queryBuilder.buildCount(options);

		// Execute via existing query method
		const result = await this.executeQuery<number>({
			sql,
			parameters,
			partitionKey: options.partitionKey,
			enableCrossPartitionQuery: options.enableCrossPartitionQuery,
		});

		// CosmosDB returns array with single value for SELECT VALUE
		return result[0] ?? 0;
	}

	/**
	 * Performs multiple aggregation operations in a single query.
	 * 
	 * Supports count, sum, avg, min, and max operations across numeric and comparable fields.
	 * More efficient than running separate aggregation queries.
	 * 
	 * @template Opts - The aggregation options type
	 * @param options - Aggregation options including operations to perform
	 * @returns Object containing the requested aggregation results
	 * @throws {Error} If no aggregation operations are specified
	 * @throws {Error} If neither partitionKey nor enableCrossPartitionQuery is provided
	 * @throws {CosmosError} If the query fails
	 */
	async aggregate<Opts extends AggregateOptions<InferSchema<TSchema>>>(
		options: Opts,
	): Promise<
		AggregateResult<InferSchema<TSchema>, ExtractAggregateOps<InferSchema<TSchema>, Opts>>
	> {
		// Validate partition key requirement
		this.validatePartitionKey(options);

		// Validate at least one aggregation is specified
		if (!options._count && !options._sum && !options._avg && !options._min && !options._max) {
			throw new Error(
				"At least one aggregation operation (_count, _sum, _avg, _min, _max) must be specified",
			);
		}

		// Build query
		const { sql, parameters } = this.queryBuilder.buildAggregate(options);

		// Execute query
		const rawResults = await this.executeQuery({
			sql,
			parameters,
			partitionKey: options.partitionKey,
			enableCrossPartitionQuery: options.enableCrossPartitionQuery,
		});

		// Parse result (aggregate returns single row)
		const rawResult = rawResults[0] ?? {};
		return this.resultParser.parseAggregateResult(rawResult, options) as any;
	}

	/**
	 * Groups documents by one or more fields and performs aggregations on each group.
	 * 
	 * Similar to SQL's GROUP BY clause. Each group can have aggregations like count, sum, avg, etc.
	 * Useful for analytics and reporting queries.
	 * 
	 * @template By - The field(s) to group by
	 * @template Opts - The group by options type
	 * @param options - Group by options including grouping fields and aggregations
	 * @returns Array of groups with aggregated values
	 * @throws {Error} If neither partitionKey nor enableCrossPartitionQuery is provided
	 * @throws {CosmosError} If the query fails
	 */
	async groupBy<
		By extends keyof InferSchema<TSchema> | readonly (keyof InferSchema<TSchema>)[],
		Opts extends GroupByOptions<InferSchema<TSchema>, By>,
	>(
		options: Opts,
	): Promise<
		GroupByResult<InferSchema<TSchema>, By, ExtractAggregateOps<InferSchema<TSchema>, Opts>>
	> {
		// Validate partition key requirement
		this.validatePartitionKey(options);

		// Build query
		const { sql, parameters } = this.queryBuilder.buildGroupBy(options);

		// Execute query
		const rawResults = await this.executeQuery({
			sql,
			parameters,
			partitionKey: options.partitionKey,
			enableCrossPartitionQuery: options.enableCrossPartitionQuery,
		});

		// Parse results
		return this.resultParser.parseGroupByResults(rawResults, options) as any;
	}

	/**
	 * Calculates the sum of a numeric field across matching documents.
	 * 
	 * Convenience method for summing a single field. For multiple aggregations,
	 * use the aggregate() method instead.
	 * 
	 * @param field - The numeric field to sum
	 * @param options - Query options including where clause and partition key
	 * @returns The sum, or null if no matching documents
	 * @throws {Error} If neither partitionKey nor enableCrossPartitionQuery is provided
	 * @throws {CosmosError} If the query fails
	 */
	async sum(
		field: KeysOfType<InferSchema<TSchema>, number>,
		options: CountOptions<InferSchema<TSchema>>,
	): Promise<number | null> {
		const result = await this.aggregate({
			...options,
			_sum: { [field]: true } as any,
		});

		return result._sum?.[field] ?? null;
	}

	/**
	 * Calculates the average of a numeric field across matching documents.
	 * 
	 * Convenience method for averaging a single field. For multiple aggregations,
	 * use the aggregate() method instead.
	 * 
	 * @param field - The numeric field to average
	 * @param options - Query options including where clause and partition key
	 * @returns The average, or null if no matching documents
	 * @throws {Error} If neither partitionKey nor enableCrossPartitionQuery is provided
	 * @throws {CosmosError} If the query fails
	 */
	async avg(
		field: KeysOfType<InferSchema<TSchema>, number>,
		options: CountOptions<InferSchema<TSchema>>,
	): Promise<number | null> {
		const result = await this.aggregate({
			...options,
			_avg: { [field]: true } as any,
		});

		return result._avg?.[field] ?? null;
	}

	/**
	 * Finds the minimum value of a field across matching documents.
	 * 
	 * Works with numeric, string, and date fields. For multiple aggregations,
	 * use the aggregate() method instead.
	 * 
	 * @template K - The field type
	 * @param field - The field to find minimum value for
	 * @param options - Query options including where clause and partition key
	 * @returns The minimum value, or null if no matching documents
	 * @throws {Error} If neither partitionKey nor enableCrossPartitionQuery is provided
	 * @throws {CosmosError} If the query fails
	 */
	async min<K extends keyof InferSchema<TSchema>>(
		field: K,
		options: CountOptions<InferSchema<TSchema>>,
	): Promise<InferSchema<TSchema>[K] | null> {
		const result = await this.aggregate({
			...options,
			_min: { [field]: true } as any,
		});

		return (result._min?.[field] as InferSchema<TSchema>[K] | null) ?? null;
	}

	/**
	 * Finds the maximum value of a field across matching documents.
	 * 
	 * Works with numeric, string, and date fields. For multiple aggregations,
	 * use the aggregate() method instead.
	 * 
	 * @template K - The field type
	 * @param field - The field to find maximum value for
	 * @param options - Query options including where clause and partition key
	 * @returns The maximum value, or null if no matching documents
	 * @throws {Error} If neither partitionKey nor enableCrossPartitionQuery is provided
	 * @throws {CosmosError} If the query fails
	 */
	async max<K extends keyof InferSchema<TSchema>>(
		field: K,
		options: CountOptions<InferSchema<TSchema>>,
	): Promise<InferSchema<TSchema>[K] | null> {
		const result = await this.aggregate({
			...options,
			_max: { [field]: true } as any,
		});

		return (result._max?.[field] as InferSchema<TSchema>[K] | null) ?? null;
	}

	/**
	 * Validates that either a partition key or cross-partition query flag is provided.
	 * 
	 * @param options - Options containing partition key configuration
	 * @throws {Error} If neither partition key nor cross-partition query is enabled
	 * @internal
	 */
	private validatePartitionKey(options: {
		partitionKey?: any;
		enableCrossPartitionQuery?: boolean;
	}) {
		if (!options.partitionKey && !options.enableCrossPartitionQuery) {
			throw new Error(
				"PARTITION KEY REQUIRED\n\n" +
					"Aggregation operations require a partition key to avoid expensive cross-partition queries.\n\n" +
					"💡 Fix: Add partitionKey or set enableCrossPartitionQuery: true\n" +
					"📖 Learn more: https://cosmosql.dev/docs/partition-keys",
			);
		}
	}

	/**
	 * Executes a query and returns the results.
	 * 
	 * @template R - The result type
	 * @param options - Query execution options
	 * @returns Array of query results
	 * @throws {CosmosError} If the query fails
	 * @internal
	 */
	private async executeQuery<R = any>(options: {
		sql: string;
		parameters: Array<{ name: string; value: any }>;
		partitionKey?: string | string[];
		enableCrossPartitionQuery?: boolean;
	}): Promise<R[]> {
		const path = `/dbs/${this.client.getDatabase()}/colls/${this.schema.name}/docs`;

		try {
			const result = await this.client.request(
				"POST",
				path,
				{
					query: options.sql,
					parameters: options.parameters,
				},
				options.partitionKey,
				options.enableCrossPartitionQuery,
			);

			// SELECT VALUE returns array directly, SELECT returns { Documents: [...] }
			if (Array.isArray(result)) {
				return result;
			}
			return result.Documents || [];
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
}
