import { CosmosError } from "../errors/cosmos-error";

/**
 * Split an array into chunks of specified size
 */
export function chunkArray<T>(array: T[], size: number): T[][] {
	const chunks: T[][] = [];
	for (let i = 0; i < array.length; i += size) {
		chunks.push(array.slice(i, i + size));
	}
	return chunks;
}

/**
 * Process batches with concurrency control
 */
export async function processBatchesWithConcurrency<T>(
	batches: T[][],
	maxConcurrency: number,
	processor: (batch: T[], index: number) => Promise<void>,
): Promise<void> {
	for (let i = 0; i < batches.length; i += maxConcurrency) {
		const batch = batches.slice(i, i + maxConcurrency);
		const batchResults = batch.map((items, idx) => processor(items, i + idx));
		await Promise.all(batchResults);
	}
}

/**
 * Retry an operation with exponential backoff
 */
export async function retryOperation<T>(
	operation: () => Promise<T>,
	maxRetries: number,
	delayMs = 1000,
): Promise<T> {
	let lastError: Error | undefined;

	for (let attempt = 0; attempt <= maxRetries; attempt++) {
		try {
			return await operation();
		} catch (error) {
			lastError = error as Error;

			if (!isRetriableError(error) || attempt === maxRetries) {
				throw error;
			}

			// Exponential backoff with jitter
			const backoffDelay = delayMs * 2 ** attempt;
			const jitter = Math.random() * 0.3 * backoffDelay; // 0-30% jitter
			await sleep(backoffDelay + jitter);
		}
	}

	throw lastError!;
}

/**
 * Check if an error is retriable (Cosmos DB specific)
 */
export function isRetriableError(error: any): boolean {
	// Cosmos DB retriable status codes
	const retriableCodes = [429, 449, 500, 503];

	if (error instanceof CosmosError) {
		return retriableCodes.includes(error.statusCode);
	}

	// Check for status code on generic errors
	if (error?.statusCode && typeof error.statusCode === "number") {
		return retriableCodes.includes(error.statusCode);
	}

	return false;
}

/**
 * Sleep utility
 */
export function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Get partition key value from a document based on schema
 */
export function getPartitionKeyValue(doc: any, partitionKeyPath: string): any {
	// Remove leading slash if present
	const path = partitionKeyPath.startsWith("/") ? partitionKeyPath.slice(1) : partitionKeyPath;

	// Split by dots or slashes for nested paths
	const parts = path.split(/[./]/);

	let value = doc;
	for (const part of parts) {
		if (value === null || value === undefined) {
			return undefined;
		}
		value = value[part];
	}

	return value;
}
