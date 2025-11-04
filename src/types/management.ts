export interface DatabaseInfo {
	id: string;
	_self: string;
	_rid: string;
	_ts: number;
	created: Date;
	lastModified: Date;

	// Storage statistics
	storage: {
		totalSizeGB: number;
		documentsSizeGB: number;
		indexSizeGB: number;
		totalDocuments: number;
	};

	// Throughput info
	throughput?: {
		type: "manual" | "autoscale" | "serverless";
		currentRU?: number;
		maxRU?: number; // for autoscale
		minRU?: number; // for autoscale
	};

	// Metadata
	region: string;
	containersCount: number;

	// Cost estimation
	estimatedMonthlyCost?: {
		ruCost: number; // Based on provisioned RU
		storageCost: number; // Based on GB stored
		totalUSD: number;
		breakdown: {
			type: string;
			value: number;
			unit: string;
		}[];
	};
}

export interface DetailedDatabaseInfo extends DatabaseInfo {
	containers: ContainerInfo[];
}

export interface ContainerInfo {
	id: string;
	_self: string;
	_rid: string;
	_ts: number;
	created: Date;
	lastModified: Date;

	// Partition configuration
	partitionKey: {
		paths: string[];
		kind: "Hash" | "MultiHash" | "Range";
		version: number;
	};

	// Statistics
	statistics: {
		documentCount: number;
		sizeKB: number;
		indexSizeKB: number;
		avgDocumentSizeKB: number;
	};

	// Throughput
	throughput?: {
		type: "manual" | "autoscale" | "shared" | "serverless";
		currentRU?: number;
		maxRU?: number;
		minRU?: number;
	};

	// Indexing policy
	indexingPolicy: {
		automatic: boolean;
		indexingMode: "consistent" | "lazy" | "none";
		includedPaths: number;
		excludedPaths: number;
		compositeIndexes: number;
		spatialIndexes: number;
	};

	// TTL
	defaultTtl?: number;

	// Schema validation (if registered in CosmosQL)
	schema?: {
		registered: boolean;
		fieldCount: number;
		partitionKeyField: string;
	};
}

export interface ContainerHealthCheck {
	container: string;
	healthy: boolean;
	issues: Array<{
		severity: "error" | "warning" | "info";
		type: "missing_index" | "high_ru" | "large_documents" | "partition_hotspot" | "orphaned";
		message: string;
		recommendation?: string;
	}>;
	statistics: {
		documentCount: number;
		avgDocumentSizeKB: number;
		largestDocumentKB: number;
		ruConsumption: {
			avg: number;
			p95: number;
			p99: number;
		};
	};
}

export interface DatabaseHealthReport {
	database: string;
	overallHealth: "healthy" | "warning" | "critical";
	timestamp: Date;
	containers: ContainerHealthCheck[];
	recommendations: string[];
	costAnalysis: {
		currentMonthlyEstimate: number;
		potentialSavings: Array<{
			type: string;
			savingsUSD: number;
			action: string;
		}>;
	};
}

export interface DeleteDatabaseOptions {
	confirm: boolean; // Must be true to proceed
	backup?: {
		enabled: boolean;
		destination?: string; // Connection string to backup location
	};
}

export interface DeleteDatabaseResult {
	deleted: boolean;
	databaseName: string;
	containersRemoved: number;
	backup?: {
		location: string;
		sizeGB: number;
		durationMs: number;
	};
}

export interface DeleteContainersOptions {
	confirm: boolean;
	backup?: {
		enabled: boolean;
		destination?: string;
	};
}

export interface DeleteContainersResult {
	deleted: string[];
	failed: Array<{
		container: string;
		error: string;
	}>;
	backup?: {
		location: string;
		containers: string[];
		sizeGB: number;
	};
}

export interface PruneContainersOptions {
	confirm: boolean;
	dryRun?: boolean; // Just show what would be deleted
	exclude?: string[]; // Container names to keep even if orphaned
	backup?: {
		enabled: boolean;
		destination?: string;
	};
}

export interface PruneContainersResult {
	pruned: string[];
	kept: string[]; // Excluded containers
	failed: Array<{
		container: string;
		error: string;
	}>;
	estimatedSavings?: {
		storageGB: number;
		monthlyRU: number;
		monthlyUSD: number;
	};
}

export interface CopyDatabaseOptions {
	source: string; // Source database name
	destination: string; // Target database name
	containers?: string[]; // Specific containers (default: all)

	// Performance
	batchSize?: number; // Documents per batch
	maxConcurrency?: number; // Parallel container copies

	// Transformation
	transform?: {
		containers?: Record<string, (doc: any) => any>; // Per-container transforms
		global?: (doc: any) => any; // Apply to all docs
	};

	// Safety
	overwrite?: boolean; // Overwrite if destination exists
	skipExisting?: boolean; // Skip docs that already exist

	// Observability
	onProgress?: (progress: CopyProgress) => void;
}

export interface CopyProgress {
	container: string;
	documentsTotal: number;
	documentsCopied: number;
	documentsFailed: number;
	percentage: number;
	ruConsumed: number;
	durationMs: number;
}

export interface CopyDatabaseResult {
	success: boolean;
	containersCopied: number;
	documentsCopied: number;
	documentsFailed: number;
	performance: {
		ruConsumed: number;
		durationMs: number;
		documentsPerSecond: number;
	};
	errors: Array<{
		container: string;
		documentId?: string;
		error: string;
	}>;
}

export interface ContainerDiff {
	container: string;
	differences: {
		partitionKey?: {
			registered: string;
			actual: string;
		};
		throughput?: {
			registered?: number;
			actual?: number;
		};
		indexing?: {
			differences: string[];
		};
		fields?: {
			inSchemaOnly: string[]; // Fields in schema but missing in some docs
			inDataOnly: string[]; // Fields in data but not in schema
			typeMismatches: Array<{
				field: string;
				expectedType: string;
				actualTypes: string[]; // Could be multiple types
				percentage: number; // % of docs with mismatch
			}>;
		};
	};
}

export interface SchemaDiff {
	database: string;
	timestamp: Date;
	containers: {
		registered: string[]; // In schema
		actual: string[]; // In database
		orphaned: string[]; // In DB but not schema
		missing: string[]; // In schema but not DB
		modified: ContainerDiff[];
	};
	requiresAction: boolean;
}

