import { AggregateOps } from "../operations/aggregate";
import { BulkDeleteOperations } from "../operations/bulk-delete";
import { BulkUpdateOperations } from "../operations/bulk-update";
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
import type {
	BulkDeleteOptions,
	BulkDeleteResult,
	BulkUpdateOptions,
	BulkUpdateResult,
} from "../types/bulk-operations";
import type { CosmosClient } from "./cosmos-client";

/**
 * Container client for type-safe CRUD operations on Azure Cosmos DB containers.
 *
 * This class provides a complete API for interacting with Cosmos DB containers including:
 * - CRUD operations (create, read, update, delete)
 * - Query operations (find, filter, sort, paginate)
 * - Aggregations (count, sum, avg, min, max, groupBy)
 * - Bulk operations (updateMany, deleteMany)
 *
 * @template TSchema - The schema definition for documents in this container
 * @template TPartitionKey - The partition key field name from the schema
 *
 * @example
 * ```typescript
 * const users = defineContainer('users', {
 *   email: field.string(),
 *   name: field.string(),
 *   age: field.number()
 * }, 'email');
 *
 * const db = new CosmosClient({ connectionString, database: 'mydb' });
 * const container = db.container(users);
 * ```
 */
export class ContainerClient<
	TSchema extends Record<string, any>,
	TPartitionKey extends keyof InferSchema<TSchema>,
> {
	private findOps: FindOperations<TSchema, TPartitionKey>;
	private createOps: CreateOperations<TSchema, TPartitionKey>;
	private updateOps: UpdateOperations<TSchema, TPartitionKey>;
	private deleteOps: DeleteOperations<TSchema, TPartitionKey>;
	private aggregateOps: AggregateOps<TSchema, TPartitionKey>;
	private bulkUpdateOps: BulkUpdateOperations<TSchema, TPartitionKey>;
	private bulkDeleteOps: BulkDeleteOperations<TSchema, TPartitionKey>;

	/**
	 * Creates a new ContainerClient instance.
	 *
	 * @param client - The CosmosClient instance to use for requests
	 * @param schema - The container schema definition
	 *
	 * @internal This constructor is typically called by CosmosClient.container()
	 */
	constructor(client: CosmosClient, schema: ContainerSchema<any, TSchema, TPartitionKey>) {
		this.findOps = new FindOperations(client, schema);
		this.createOps = new CreateOperations(client, schema);
		this.updateOps = new UpdateOperations(client, schema);
		this.deleteOps = new DeleteOperations(client, schema);
		this.aggregateOps = new AggregateOps(client, schema);
		this.bulkUpdateOps = new BulkUpdateOperations(client, schema);
		this.bulkDeleteOps = new BulkDeleteOperations(client, schema);
	}

	/**
	 * Finds a single document by its ID and partition key.
	 *
	 * This is the most efficient way to retrieve a document as it uses direct document access.
	 * Both the document ID and partition key value are required.
	 *
	 * @template S - Optional select projection to return only specific fields
	 * @param args - Query arguments including where clause and optional select
	 * @param args.where - Must include both 'id' and the partition key field
	 * @param args.select - Optional object specifying which fields to return
	 * @returns The document if found, or null if not found
	 *
	 * @example
	 * ```typescript
	 * // Find user by ID and partition key
	 * const user = await db.users.findUnique({
	 *   where: { id: '123', email: 'user@example.com' }
	 * });
	 *
	 * // With field selection
	 * const user = await db.users.findUnique({
	 *   where: { id: '123', email: 'user@example.com' },
	 *   select: { name: true, age: true }
	 * });
	 * ```
	 */
	findUnique<S extends SelectInput<InferSchema<TSchema>> | undefined = undefined>(
		args: TPartitionKey extends never
			? PartitionKeyMissingError
			: FindUniqueArgs<InferSchema<TSchema>, TPartitionKey, NonNullable<S>>,
	) {
		return this.findOps.findUnique(args);
	}

	/**
	 * Queries multiple documents with filtering, sorting, pagination, and optional aggregations.
	 *
	 * Supports a rich query API with type-safe filters, projections, and aggregations.
	 * Requires either a partitionKey or enableCrossPartitionQuery: true.
	 *
	 * @template S - Optional select projection to return only specific fields
	 * @template A - Optional aggregation operations to perform
	 * @param args - Query arguments
	 * @param args.where - Filter conditions (supports operators like eq, gt, lt, contains, etc.)
	 * @param args.select - Field projection to return only specific fields
	 * @param args.orderBy - Sort order (field: 'asc' | 'desc')
	 * @param args.take - Limit number of results
	 * @param args.skip - Skip number of results (for pagination)
	 * @param args.partitionKey - Partition key value to scope the query
	 * @param args.enableCrossPartitionQuery - Allow cross-partition queries (can be expensive)
	 * @param args.aggregate - Aggregation operations to perform alongside the query
	 * @returns Array of documents (or object with data + aggregations if aggregate is specified)
	 *
	 * @example
	 * ```typescript
	 * // Basic query
	 * const users = await db.users.findMany({
	 *   where: { age: { gte: 18 } },
	 *   partitionKey: 'active-users'
	 * });
	 *
	 * // With sorting and pagination
	 * const users = await db.users.findMany({
	 *   where: { status: 'active' },
	 *   orderBy: { createdAt: 'desc' },
	 *   take: 20,
	 *   skip: 40,
	 *   enableCrossPartitionQuery: true
	 * });
	 *
	 * // With field selection
	 * const users = await db.users.findMany({
	 *   select: { name: true, email: true },
	 *   partitionKey: 'tenant-123'
	 * });
	 *
	 * // With aggregations
	 * const result = await db.users.findMany({
	 *   where: { age: { gte: 18 } },
	 *   aggregate: {
	 *     _count: true,
	 *     _avg: { age: true },
	 *     _max: { lastLogin: true }
	 *   },
	 *   enableCrossPartitionQuery: true
	 * });
	 * // result = { data: [...], _count: 150, _avg: { age: 32.5 }, _max: { lastLogin: '...' } }
	 * ```
	 */
	findMany<
		S extends SelectInput<InferSchema<TSchema>> | undefined = undefined,
		A extends AggregateOperations<InferSchema<TSchema>> | undefined = undefined,
	>(
		args?: FindManyArgs<InferSchema<TSchema>, NonNullable<S>, TPartitionKey, A>,
	): Promise<FindManyResult<InferSchema<TSchema>, S, A>> {
		return this.findOps.findMany(args);
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
	 *
	 * @example
	 * ```typescript
	 * // Simple raw query
	 * const users = await db.users.query({
	 *   sql: 'SELECT * FROM c WHERE c.age > @minAge',
	 *   parameters: [{ name: '@minAge', value: 18 }],
	 *   partitionKey: 'active-users'
	 * });
	 *
	 * // Complex aggregation
	 * const stats = await db.orders.query<{ total: number, avgAmount: number }>({
	 *   sql: 'SELECT COUNT(1) as total, AVG(c.amount) as avgAmount FROM c',
	 *   partitionKey: 'store-123'
	 * });
	 * ```
	 */
	query<TResult = InferSchema<TSchema>>(args: {
		sql: string;
		parameters?: Array<{ name: string; value: unknown }>;
		partitionKey?: InferSchema<TSchema>[TPartitionKey];
	}) {
		return this.findOps.query<TResult>(args);
	}

	/**
	 * Creates a new document in the container.
	 *
	 * The document ID will be auto-generated if not provided.
	 * Schema defaults will be applied to missing fields.
	 *
	 * @param args - Creation arguments
	 * @param args.data - The document data to create (must include partition key field)
	 * @returns The created document with generated ID and metadata
	 *
	 * @example
	 * ```typescript
	 * const user = await db.users.create({
	 *   data: {
	 *     email: 'user@example.com',
	 *     name: 'John Doe',
	 *     age: 30
	 *   }
	 * });
	 * ```
	 */
	create(args: { data: CreateInput<TSchema> }) {
		return this.createOps.create(args);
	}

	/**
	 * Creates multiple documents in a single batch operation.
	 *
	 * All documents must share the same partition key for batch operations.
	 * This is more efficient than calling create() multiple times.
	 *
	 * @param args - Batch creation arguments
	 * @param args.data - Array of documents to create
	 * @param args.partitionKey - The partition key value shared by all documents
	 * @returns Result of the batch operation
	 *
	 * @example
	 * ```typescript
	 * await db.users.createMany({
	 *   data: [
	 *     { email: 'user1@example.com', name: 'User 1' },
	 *     { email: 'user2@example.com', name: 'User 2' },
	 *     { email: 'user3@example.com', name: 'User 3' }
	 *   ],
	 *   partitionKey: 'tenant-123'
	 * });
	 * ```
	 */
	createMany(args: {
		data: Array<CreateInput<TSchema>>;
		partitionKey: InferSchema<TSchema>[TPartitionKey];
	}) {
		return this.createOps.createMany(args);
	}

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
	 *
	 * @example
	 * ```typescript
	 * // Update specific fields
	 * const updated = await db.users.update({
	 *   where: { id: '123', email: 'user@example.com' },
	 *   data: { age: 31, lastLogin: new Date() }
	 * });
	 *
	 * // Update nested fields
	 * await db.users.update({
	 *   where: { id: '123', email: 'user@example.com' },
	 *   data: { 'metadata.updated': new Date() }
	 * });
	 * ```
	 */
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

	/**
	 * Creates a document or updates it if it already exists (based on ID).
	 *
	 * Uses Cosmos DB's upsert functionality to perform an efficient
	 * create-or-replace operation without needing to check existence first.
	 *
	 * @param args - Upsert arguments
	 * @param args.data - Complete document data (must include ID if updating)
	 * @returns The created or updated document
	 *
	 * @example
	 * ```typescript
	 * // Will create new document or replace existing one with same ID
	 * const user = await db.users.upsert({
	 *   data: {
	 *     id: '123',
	 *     email: 'user@example.com',
	 *     name: 'John Doe',
	 *     age: 30
	 *   }
	 * });
	 * ```
	 */
	upsert(args: { data: CreateInput<TSchema> }) {
		return this.createOps.upsert(args);
	}

	/**
	 * Deletes a document by ID and partition key.
	 *
	 * This operation is permanent and cannot be undone.
	 * Both the document ID and partition key value are required.
	 *
	 * @param args - Delete arguments
	 * @param args.where - Must include both 'id' and the partition key field
	 * @returns Void on success
	 *
	 * @example
	 * ```typescript
	 * await db.users.delete({
	 *   where: { id: '123', email: 'user@example.com' }
	 * });
	 * ```
	 */
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

	/**
	 * Counts the number of documents matching the filter criteria.
	 *
	 * Requires either a partitionKey or enableCrossPartitionQuery: true.
	 * Efficient operation that doesn't load document contents.
	 *
	 * @param options - Count options
	 * @param options.where - Optional filter conditions
	 * @param options.partitionKey - Partition key value to scope the count
	 * @param options.enableCrossPartitionQuery - Allow cross-partition counting
	 * @returns The count of matching documents
	 *
	 * @example
	 * ```typescript
	 * // Count all users
	 * const total = await db.users.count({
	 *   partitionKey: 'active-users'
	 * });
	 *
	 * // Count with filter
	 * const adults = await db.users.count({
	 *   where: { age: { gte: 18 } },
	 *   enableCrossPartitionQuery: true
	 * });
	 * ```
	 */
	async count(options: CountOptions<InferSchema<TSchema>>): Promise<number> {
		return this.aggregateOps.count(options);
	}

	/**
	 * Performs multiple aggregation operations in a single query.
	 *
	 * Supports count, sum, avg, min, and max operations across numeric and comparable fields.
	 * More efficient than running separate aggregation queries.
	 *
	 * @template Opts - The aggregation options type
	 * @param options - Aggregation options
	 * @param options.where - Optional filter conditions
	 * @param options.partitionKey - Partition key value to scope the aggregation
	 * @param options.enableCrossPartitionQuery - Allow cross-partition aggregation
	 * @param options._count - Include document count
	 * @param options._sum - Sum numeric fields
	 * @param options._avg - Average numeric fields
	 * @param options._min - Find minimum values
	 * @param options._max - Find maximum values
	 * @returns Object containing the requested aggregation results
	 *
	 * @example
	 * ```typescript
	 * const stats = await db.orders.aggregate({
	 *   where: { status: 'completed' },
	 *   _count: true,
	 *   _sum: { amount: true },
	 *   _avg: { amount: true },
	 *   _min: { createdAt: true },
	 *   _max: { createdAt: true },
	 *   partitionKey: 'store-123'
	 * });
	 * // stats = {
	 * //   _count: 1500,
	 * //   _sum: { amount: 125000 },
	 * //   _avg: { amount: 83.33 },
	 * //   _min: { createdAt: '2024-01-01T00:00:00Z' },
	 * //   _max: { createdAt: '2024-12-31T23:59:59Z' }
	 * // }
	 * ```
	 */
	async aggregate<Opts extends AggregateOptions<InferSchema<TSchema>>>(
		options: Opts,
	): Promise<
		AggregateResult<InferSchema<TSchema>, ExtractAggregateOps<InferSchema<TSchema>, Opts>>
	> {
		return this.aggregateOps.aggregate(options) as any;
	}

	/**
	 * Groups documents by one or more fields and performs aggregations on each group.
	 *
	 * Similar to SQL's GROUP BY clause. Each group can have aggregations like count, sum, avg, etc.
	 * Useful for analytics and reporting queries.
	 *
	 * @template K - The field(s) to group by
	 * @template Opts - The group by options type
	 * @param options - Group by options
	 * @param options.by - Field name(s) to group by
	 * @param options.where - Optional filter conditions
	 * @param options.partitionKey - Partition key value to scope the grouping
	 * @param options.enableCrossPartitionQuery - Allow cross-partition grouping
	 * @param options._count - Include count per group
	 * @param options._sum - Sum numeric fields per group
	 * @param options._avg - Average numeric fields per group
	 * @param options._min - Find minimum values per group
	 * @param options._max - Find maximum values per group
	 * @returns Array of groups with aggregated values
	 *
	 * @example
	 * ```typescript
	 * // Group by single field
	 * const byStatus = await db.orders.groupBy({
	 *   by: 'status',
	 *   _count: true,
	 *   _sum: { amount: true },
	 *   enableCrossPartitionQuery: true
	 * });
	 * // [
	 * //   { status: 'pending', _count: 50, _sum: { amount: 5000 } },
	 * //   { status: 'completed', _count: 150, _sum: { amount: 15000 } }
	 * // ]
	 *
	 * // Group by multiple fields
	 * const byStatusAndRegion = await db.orders.groupBy({
	 *   by: ['status', 'region'] as const,
	 *   _count: true,
	 *   _avg: { amount: true },
	 *   enableCrossPartitionQuery: true
	 * });
	 * ```
	 */
	async groupBy<
		K extends readonly (keyof InferSchema<TSchema>)[],
		Opts extends GroupByOptions<InferSchema<TSchema>, K>,
	>(
		options: Opts & { by: K },
	): Promise<
		GroupByResult<InferSchema<TSchema>, K, ExtractAggregateOps<InferSchema<TSchema>, Opts>>
	>;

	async groupBy<
		K extends keyof InferSchema<TSchema>,
		Opts extends GroupByOptions<InferSchema<TSchema>, K>,
	>(
		options: Opts & { by: K },
	): Promise<
		GroupByResult<InferSchema<TSchema>, K, ExtractAggregateOps<InferSchema<TSchema>, Opts>>
	>;

	async groupBy(options: any): Promise<any> {
		return this.aggregateOps.groupBy(options);
	}

	/**
	 * Calculates the sum of a numeric field across matching documents.
	 *
	 * Convenience method for summing a single field. For multiple aggregations,
	 * use the aggregate() method instead.
	 *
	 * @param field - The numeric field to sum
	 * @param options - Query options
	 * @param options.where - Optional filter conditions
	 * @param options.partitionKey - Partition key value to scope the sum
	 * @param options.enableCrossPartitionQuery - Allow cross-partition sum
	 * @returns The sum, or null if no matching documents
	 *
	 * @example
	 * ```typescript
	 * const totalRevenue = await db.orders.sum('amount', {
	 *   where: { status: 'completed' },
	 *   partitionKey: 'store-123'
	 * });
	 * ```
	 */
	async sum(
		field: KeysOfType<InferSchema<TSchema>, number>,
		options: CountOptions<InferSchema<TSchema>>,
	): Promise<number | null> {
		return this.aggregateOps.sum(field, options);
	}

	/**
	 * Calculates the average of a numeric field across matching documents.
	 *
	 * Convenience method for averaging a single field. For multiple aggregations,
	 * use the aggregate() method instead.
	 *
	 * @param field - The numeric field to average
	 * @param options - Query options
	 * @param options.where - Optional filter conditions
	 * @param options.partitionKey - Partition key value to scope the average
	 * @param options.enableCrossPartitionQuery - Allow cross-partition average
	 * @returns The average, or null if no matching documents
	 *
	 * @example
	 * ```typescript
	 * const avgAge = await db.users.avg('age', {
	 *   where: { status: 'active' },
	 *   enableCrossPartitionQuery: true
	 * });
	 * ```
	 */
	async avg(
		field: KeysOfType<InferSchema<TSchema>, number>,
		options: CountOptions<InferSchema<TSchema>>,
	): Promise<number | null> {
		return this.aggregateOps.avg(field, options);
	}

	/**
	 * Finds the minimum value of a field across matching documents.
	 *
	 * Works with numeric, string, and date fields. For multiple aggregations,
	 * use the aggregate() method instead.
	 *
	 * @template K - The field type
	 * @param field - The field to find minimum value for
	 * @param options - Query options
	 * @param options.where - Optional filter conditions
	 * @param options.partitionKey - Partition key value to scope the query
	 * @param options.enableCrossPartitionQuery - Allow cross-partition query
	 * @returns The minimum value, or null if no matching documents
	 *
	 * @example
	 * ```typescript
	 * const earliestOrder = await db.orders.min('createdAt', {
	 *   partitionKey: 'store-123'
	 * });
	 *
	 * const lowestPrice = await db.products.min('price', {
	 *   where: { category: 'electronics' },
	 *   enableCrossPartitionQuery: true
	 * });
	 * ```
	 */
	async min<K extends keyof InferSchema<TSchema>>(
		field: K,
		options: CountOptions<InferSchema<TSchema>>,
	): Promise<InferSchema<TSchema>[K] | null> {
		return this.aggregateOps.min(field, options);
	}

	/**
	 * Finds the maximum value of a field across matching documents.
	 *
	 * Works with numeric, string, and date fields. For multiple aggregations,
	 * use the aggregate() method instead.
	 *
	 * @template K - The field type
	 * @param field - The field to find maximum value for
	 * @param options - Query options
	 * @param options.where - Optional filter conditions
	 * @param options.partitionKey - Partition key value to scope the query
	 * @param options.enableCrossPartitionQuery - Allow cross-partition query
	 * @returns The maximum value, or null if no matching documents
	 *
	 * @example
	 * ```typescript
	 * const latestOrder = await db.orders.max('createdAt', {
	 *   partitionKey: 'store-123'
	 * });
	 *
	 * const highestPrice = await db.products.max('price', {
	 *   where: { category: 'electronics' },
	 *   enableCrossPartitionQuery: true
	 * });
	 * ```
	 */
	async max<K extends keyof InferSchema<TSchema>>(
		field: K,
		options: CountOptions<InferSchema<TSchema>>,
	): Promise<InferSchema<TSchema>[K] | null> {
		return this.aggregateOps.max(field, options);
	}

	/**
	 * Update multiple documents matching the where clause
	 *
	 * @example
	 * // Static update
	 * await db.users.updateMany({
	 *   where: { isActive: false },
	 *   data: { status: 'archived' },
	 *   partitionKey: 'user@email.com'
	 * });
	 *
	 * @example
	 * // Dynamic update with function
	 * await db.users.updateMany({
	 *   where: { email: { contains: '@old.com' } },
	 *   data: (doc) => ({
	 *     email: doc.email.replace('@old.com', '@new.com'),
	 *     migratedAt: new Date()
	 *   }),
	 *   enableCrossPartitionQuery: true,
	 *   onProgress: (stats) => {
	 *     console.log(`${stats.percentage}% - ${stats.ruConsumed} RU`);
	 *   }
	 * });
	 */
	async updateMany(options: BulkUpdateOptions<InferSchema<TSchema>>): Promise<BulkUpdateResult> {
		return this.bulkUpdateOps.updateMany(options);
	}

	/**
	 * Delete multiple documents matching the where clause
	 *
	 * @example
	 * await db.users.deleteMany({
	 *   where: { createdAt: { lt: oneYearAgo } },
	 *   confirm: true, // Safety: must explicitly confirm
	 *   partitionKey: 'user@email.com',
	 *   onProgress: (stats) => {
	 *     console.log(`Deleted ${stats.updated}/${stats.total}`);
	 *   }
	 * });
	 */
	async deleteMany(options: BulkDeleteOptions<InferSchema<TSchema>>): Promise<BulkDeleteResult> {
		return this.bulkDeleteOps.deleteMany(options);
	}
}
