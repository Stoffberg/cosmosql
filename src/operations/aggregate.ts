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
	 * COUNT
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
	 * AGGREGATE
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
	 * GROUP BY
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
	 * SUM (convenience method)
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
	 * AVG (convenience method)
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
	 * MIN (convenience method)
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
	 * MAX (convenience method)
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
	 * Validate partition key requirement (shared logic)
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
	 * Execute query via HTTP (reuses existing query infrastructure)
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
