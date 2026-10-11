import type { WhereInput } from "./operators";

export interface BulkUpdateOptions<T> {
	where: WhereInput<T>;
	data: Partial<T> | ((doc: T) => Partial<T>);

	// Partition options (one required)
	partitionKey?: any;
	enableCrossPartitionQuery?: boolean;

	// Performance tuning
	batchSize?: number; // Default: 50
	maxConcurrency?: number; // Default: 5

	// Error handling
	continueOnError?: boolean; // Default: false
	maxRetries?: number; // Default: 3

	// Observability
	onProgress?: (stats: BulkProgressStats) => void;
	onError?: (error: BulkError) => void;
}

export interface BulkDeleteOptions<T> {
	where: WhereInput<T>;

	// Safety
	confirm?: boolean; // Default: false (must be true to execute)

	// Partition options
	partitionKey?: any;
	enableCrossPartitionQuery?: boolean;

	// Performance tuning
	batchSize?: number;
	maxConcurrency?: number;

	// Error handling
	continueOnError?: boolean;

	// Observability
	onProgress?: (stats: BulkProgressStats) => void;
}

export interface BulkProgressStats {
	// Progress
	total: number;
	processed: number;
	updated: number; // or deleted
	failed: number;
	skipped: number; // matched query but couldn't update
	percentage: number; // 0-100

	// Performance
	ruConsumed: number;
	durationMs: number;
	avgRuPerDocument: number;
	documentsPerSecond: number;

	// Current batch info
	currentBatch: number;
	totalBatches: number;
}

export interface BulkError {
	documentId: string;
	partitionKey: string;
	error: string;
	code?: string; // Cosmos error code
	statusCode?: number; // HTTP status
	retriable: boolean;
	attemptNumber: number;
}

export interface BulkUpdateResult {
	success: boolean;
	updated: number;
	failed: number;
	skipped: number;
	errors: BulkError[];
	performance: {
		ruConsumed: number;
		durationMs: number;
		avgRuPerDocument: number;
		documentsPerSecond: number;
	};
}

export interface BulkDeleteResult {
	success: boolean;
	deleted: number;
	failed: number;
	errors: BulkError[];
	performance: {
		ruConsumed: number;
		durationMs: number;
	};
}
