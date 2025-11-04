import type { CosmosClient } from "../client/cosmos-client";
import { CosmosError } from "../errors/cosmos-error";
import { QueryBuilder } from "../query/query-builder";
import type { ContainerSchema } from "../schema/container";
import type { InferSchema } from "../types";
import type {
	BulkError,
	BulkProgressStats,
	BulkUpdateOptions,
	BulkUpdateResult,
} from "../types/bulk-operations";
import {
	chunkArray,
	getPartitionKeyValue,
	isRetriableError,
	processBatchesWithConcurrency,
	retryOperation,
} from "./batch-processor";

/**
 * Handles bulk update operations for a Cosmos DB container.
 *
 * Provides efficient batch processing with concurrency control, retry logic,
 * progress tracking, and detailed error reporting.
 *
 * @internal This class is used internally by ContainerClient
 */
export class BulkUpdateOperations<
	TSchema extends Record<string, any>,
	TPartitionKey extends keyof InferSchema<TSchema>,
> {
	constructor(
		private client: CosmosClient,
		private schema: ContainerSchema<any, TSchema, TPartitionKey>,
	) {}

	/**
	 * Updates multiple documents matching the where clause.
	 *
	 * Efficiently processes documents in batches with configurable concurrency.
	 * Supports both static updates and dynamic updates via function.
	 * Provides progress callbacks and detailed error tracking.
	 *
	 * @param options - Bulk update options
	 * @param options.where - Filter to select documents to update
	 * @param options.data - Static update data or function to compute updates per document
	 * @param options.partitionKey - Partition key to scope the operation
	 * @param options.enableCrossPartitionQuery - Allow cross-partition updates
	 * @param options.batchSize - Number of documents to process per batch (default: 50)
	 * @param options.maxConcurrency - Maximum concurrent batches (default: 5)
	 * @param options.continueOnError - Continue processing on errors (default: false)
	 * @param options.maxRetries - Maximum retry attempts per document (default: 3)
	 * @param options.onProgress - Callback for progress updates
	 * @param options.onError - Callback for individual errors
	 * @returns Result object with success status, counts, errors, and performance metrics
	 * @throws {Error} If neither partitionKey nor enableCrossPartitionQuery is provided
	 * @throws {CosmosError} If the operation fails and continueOnError is false
	 */
	async updateMany(options: BulkUpdateOptions<InferSchema<TSchema>>): Promise<BulkUpdateResult> {
		const {
			where,
			data,
			partitionKey,
			enableCrossPartitionQuery,
			batchSize = 50,
			maxConcurrency = 5,
			continueOnError = false,
			maxRetries = 3,
			onProgress,
			onError,
		} = options;

		// Validation
		if (!partitionKey && !enableCrossPartitionQuery) {
			throw new Error(
				"Either partitionKey or enableCrossPartitionQuery must be specified for bulk operations",
			);
		}

		// Track results
		const result: BulkUpdateResult = {
			success: true,
			updated: 0,
			failed: 0,
			skipped: 0,
			errors: [],
			performance: {
				ruConsumed: 0,
				durationMs: 0,
				avgRuPerDocument: 0,
				documentsPerSecond: 0,
			},
		};

		const startTime = Date.now();

		try {
			// Step 1: Query documents matching where clause
			const builder = new QueryBuilder<InferSchema<TSchema>>();
			builder.where(where);
			const { query, parameters } = builder.build();

			const path = `/dbs/${this.client.getDatabase()}/colls/${this.schema.name}/docs`;

			const queryResult = await this.client.request(
				"POST",
				path,
				{ query, parameters },
				partitionKey,
				enableCrossPartitionQuery,
			);

			const documents = queryResult.Documents || [];
			const total = documents.length;

			if (total === 0) {
				result.performance.durationMs = Date.now() - startTime;
				return result;
			}

			// Step 2: Process in batches with concurrency control
			const batches = chunkArray(documents, batchSize);
			const updateFn = typeof data === "function" ? data : () => data;

			// Get partition key path
			const partitionKeyPath = this.schema.partitionKeyField
				? String(this.schema.partitionKeyField)
				: "";

			await processBatchesWithConcurrency(batches, maxConcurrency, async (batch, batchIndex) => {
				await Promise.allSettled(
					batch.map(async (doc: any) => {
						try {
							// Apply update
							const updates = updateFn(doc);
							const mergedDoc = { ...doc, ...updates };

							// Get partition key value for this document
							const docPartitionKey = getPartitionKeyValue(doc, partitionKeyPath);

							// Execute update with retry
							const docPath = `/dbs/${this.client.getDatabase()}/colls/${this.schema.name}/docs/${doc.id}`;

							await retryOperation(async () => {
								const response = await this.client.request(
									"PUT",
									docPath,
									mergedDoc,
									docPartitionKey,
								);

								// Track RU consumption from response headers
								result.performance.ruConsumed += this.extractRUCharge(response);
							}, maxRetries);

							result.updated++;
						} catch (error) {
							result.failed++;

							const bulkError: BulkError = {
								documentId: doc.id,
								partitionKey: getPartitionKeyValue(doc, partitionKeyPath) || "unknown",
								error: error instanceof Error ? error.message : String(error),
								code: error instanceof CosmosError ? error.code : undefined,
								statusCode: error instanceof CosmosError ? error.statusCode : undefined,
								retriable: isRetriableError(error),
								attemptNumber: maxRetries,
							};

							result.errors.push(bulkError);

							if (onError) {
								onError(bulkError);
							}

							if (!continueOnError) {
								throw error;
							}
						}
					}),
				);

				// Report progress
				if (onProgress) {
					const processed = Math.min((batchIndex + 1) * batchSize, total);
					const progressStats: BulkProgressStats = {
						total,
						processed,
						updated: result.updated,
						failed: result.failed,
						skipped: result.skipped,
						percentage: Math.round((processed / total) * 100),
						ruConsumed: result.performance.ruConsumed,
						durationMs: Date.now() - startTime,
						avgRuPerDocument:
							result.updated > 0 ? result.performance.ruConsumed / result.updated : 0,
						documentsPerSecond:
							result.updated > 0 ? result.updated / ((Date.now() - startTime) / 1000) : 0,
						currentBatch: batchIndex + 1,
						totalBatches: batches.length,
					};
					onProgress(progressStats);
				}
			});

			// Finalize performance stats
			result.performance.durationMs = Date.now() - startTime;
			result.performance.avgRuPerDocument =
				result.updated > 0 ? result.performance.ruConsumed / result.updated : 0;
			result.performance.documentsPerSecond =
				result.updated > 0 ? result.updated / (result.performance.durationMs / 1000) : 0;

			result.success = result.failed === 0;

			return result;
		} catch (error) {
			result.performance.durationMs = Date.now() - startTime;
			result.success = false;
			throw error;
		}
	}

	/**
	 * Extracts Request Unit (RU) charge from a Cosmos DB response.
	 *
	 * Checks multiple possible locations where RU charge might be stored
	 * depending on SDK version and response format.
	 *
	 * @param response - The Cosmos DB response object
	 * @returns The RU charge, or 0 if not found
	 * @internal
	 */
	private extractRUCharge(response: any): number {
		// Cosmos DB returns RU charge in the response
		// The format varies depending on the SDK version
		if (response && typeof response === "object") {
			// Check common locations for RU charge
			if (response["x-ms-request-charge"]) {
				return Number.parseFloat(response["x-ms-request-charge"]);
			}
			if (response.requestCharge) {
				return Number.parseFloat(response.requestCharge);
			}
			if (response.headers?.["x-ms-request-charge"]) {
				return Number.parseFloat(response.headers["x-ms-request-charge"]);
			}
		}
		// Default to 0 if we can't find RU charge
		return 0;
	}
}
