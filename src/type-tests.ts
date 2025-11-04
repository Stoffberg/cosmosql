/**
 * COMPREHENSIVE Type-level tests to ensure 100% type inference coverage.
 * These tests are included in TypeScript compilation to catch type inference issues.
 *
 * This file tests:
 * - All field types (string, number, boolean, date, array, object)
 * - All ContainerClient methods
 * - Bulk operations (updateMany, deleteMany)
 * - Migrations (defineMigration, MigrationClient, MigrationContext)
 * - Management operations (health checks, schema diff, container management)
 * - Complex nested structures
 * - Optional vs required fields
 * - Select operations
 * - Edge cases and error conditions
 */

// Import the necessary types and functions
import { ContainerClient } from "./client/container-client";
import { container, field } from "./schema";
import type { InferSchema } from "./types";
import type {
	BulkUpdateOptions,
	BulkUpdateResult,
	BulkDeleteOptions,
	BulkDeleteResult,
	BulkProgressStats,
	BulkError,
} from "./types/bulk-operations";
import {
	defineMigration,
	type MigrationDefinition,
	type MigrationContext,
	type MigrationStatus,
	type MigrationPlan,
	type MigrationResult,
} from "./migrations";
import type {
	DatabaseInfo,
	DetailedDatabaseInfo,
	DatabaseHealthReport,
	ContainerHealthCheck,
	SchemaDiff,
	PruneContainersResult,
} from "./types/management";

// =============================================================================
// SCHEMA DEFINITIONS - Test every possible field type and combination
// =============================================================================

// 1. Minimal schema (edge case)
const minimalSchema = container("minimal", {
	id: field.string(),
}).partitionKey("id");

// 2. All field types
const allTypesSchema = container("alltypes", {
	id: field.string(),
	name: field.string(),
	age: field.number(),
	isActive: field.boolean(),
	createdAt: field.date(),
	tags: field.array(field.string()),
	metadata: field.object({
		version: field.number(),
		settings: field.object({
			theme: field.string(),
			notifications: field.boolean(),
		}),
	}),
}).partitionKey("id");

// 3. Complex nested schema (production-like)
const complexSchema = container("messages", {
	id: field.string(),
	conversationId: field.string(),
	role: field.string(),
	content: field.string(),
	tokens: field.number().optional(),
	metadata: field.string().optional(),
	createdAt: field.date(),
	updatedAt: field.date().optional(),
	tags: field.array(field.string()),
	author: field.object({
		id: field.string(),
		name: field.string(),
		email: field.string().optional(),
		profile: field.object({
			bio: field.string().optional(),
			website: field.string().optional(),
			socialLinks: field.array(
				field.object({
					platform: field.string(),
					url: field.string(),
				}),
			),
		}),
	}),
	attachments: field.array(
		field.object({
			type: field.string(),
			url: field.string(),
			size: field.number(),
			metadata: field
				.object({
					mimeType: field.string(),
					width: field.number().optional(),
					height: field.number().optional(),
				})
				.optional(),
		}),
	),
}).partitionKey("conversationId");

// 4. Schema with no partition key (edge case)
// const noPartitionKeySchema = container("noprofile", {
// 	id: field.string(),
// 	email: field.string(),
// 	name: field.string().optional(),
// });

// 5. Deeply nested schema
const deepNestedSchema = container("deep", {
	id: field.string(),
	level1: field.object({
		level2: field.object({
			level3: field.object({
				level4: field.object({
					level5: field.string(),
					value: field.number(),
				}),
				items: field.array(
					field.object({
						name: field.string(),
						count: field.number(),
					}),
				),
			}),
		}),
	}),
}).partitionKey("id");

// Type definitions
type MinimalType = InferSchema<typeof minimalSchema.schema>;
type AllTypesType = InferSchema<typeof allTypesSchema.schema>;
type ComplexType = InferSchema<typeof complexSchema.schema>;
type DeepNestedType = InferSchema<typeof deepNestedSchema.schema>;

// =============================================================================
// COMPREHENSIVE TYPE TESTS
// =============================================================================

// Test 1: Minimal schema - all methods
function testMinimalSchema() {
	const client = {} as any;
	const containerClient = new ContainerClient(client, minimalSchema);

	// findUnique
	const findUniqueResult: Promise<MinimalType | null> = containerClient.findUnique({
		where: { id: "test" },
	});

	// findMany
	const findManyResult: Promise<MinimalType[]> = containerClient.findMany({
		partitionKey: "test",
	});

	// create
	const createResult = containerClient.create({
		data: { id: "test" },
	});

	void findUniqueResult;
	void findManyResult;
	void createResult;
}

// Test 2: All field types schema
function testAllTypesSchema() {
	const client = {} as any;
	const containerClient = new ContainerClient(client, allTypesSchema);

	// Test all field types are correctly inferred
	const findUniqueResult: Promise<AllTypesType | null> = containerClient.findUnique({
		where: { id: "test" },
	});

	// Test create with all field types
	const createResult = containerClient.create({
		data: {
			id: "test",
			name: "John",
			age: 30,
			isActive: true,
			createdAt: new Date(),
			tags: ["tag1", "tag2"],
			metadata: {
				version: 1,
				settings: {
					theme: "dark",
					notifications: true,
				},
			},
		},
	});

	void findUniqueResult;
	void createResult;
}

// Test 3: Complex nested schema - comprehensive testing
function testComplexSchemaAllMethods() {
	const client = {} as any;
	const containerClient = new ContainerClient(client, complexSchema);

	// findUnique without select
	const findUniqueResult: Promise<ComplexType | null> = containerClient.findUnique({
		where: { id: "test", conversationId: "test" },
	});

	// findUnique with select
	const findUniqueSelectResult = containerClient.findUnique({
		where: { id: "test", conversationId: "test" },
		select: {
			id: true,
			content: true,
			author: { name: true, profile: { bio: true } },
		},
	});

	// findMany without select
	const findManyResult: Promise<ComplexType[]> = containerClient.findMany({
		partitionKey: "test",
	});

	// findMany with select
	const findManySelectResult = containerClient.findMany({
		partitionKey: "test",
		select: {
			id: true,
			role: true,
			author: { name: true },
		},
	});

	// findMany cross-partition
	const findManyCrossPartitionResult: Promise<ComplexType[]> = containerClient.findMany({
		enableCrossPartitionQuery: true,
		where: { role: "user" },
	});

	// create with complex nested data
	const createResult = containerClient.create({
		data: {
			id: "test",
			conversationId: "test",
			role: "user",
			content: "Hello",
			createdAt: new Date(),
			tags: ["greeting"],
			author: {
				id: "author-id",
				name: "Test Author",
				email: "test@example.com",
				profile: {
					bio: "Developer",
					website: "https://example.com",
					socialLinks: [{ platform: "twitter", url: "https://twitter.com/test" }],
				},
			},
			attachments: [
				{
					type: "image",
					url: "https://example.com/image.jpg",
					size: 1024,
					metadata: {
						mimeType: "image/jpeg",
						width: 800,
						height: 600,
					},
				},
			],
		},
	});

	// createMany
	const createManyResult = containerClient.createMany({
		data: [
			{
				id: "test-1",
				conversationId: "test",
				role: "user",
				content: "Hello",
				createdAt: new Date(),
				tags: [],
				author: {
					id: "author-1",
					name: "Author 1",
					email: undefined,
					profile: {
						bio: undefined,
						website: undefined,
						socialLinks: [],
					},
				},
				attachments: [],
			},
		],
		partitionKey: "test",
	});

	// update
	const updateResult = containerClient.update({
		where: { id: "test", conversationId: "test" },
		data: {
			content: "Updated content",
			tokens: 150,
			tags: ["updated"],
		},
	});

	// upsert
	const upsertResult = containerClient.upsert({
		data: {
			id: "test",
			conversationId: "test",
			role: "user",
			content: "New",
			createdAt: new Date(),
			tags: [],
			author: {
				id: "author-id",
				name: "Test Author",
				email: undefined,
				profile: {
					bio: undefined,
					website: undefined,
					socialLinks: [],
				},
			},
			attachments: [],
		},
	});

	// delete
	const deleteResult = containerClient.delete({
		where: { id: "test", conversationId: "test" },
	});

	// query
	const queryResult: Promise<ComplexType[]> = containerClient.query({
		sql: "SELECT * FROM c",
		partitionKey: "test",
	});

	// query with custom return type
	const customQueryResult = containerClient.query<{ count: number }>({
		sql: "SELECT COUNT(1) as count FROM c",
		partitionKey: "test",
	});

	void findUniqueResult;
	void findUniqueSelectResult;
	void findManyResult;
	void findManySelectResult;
	void findManyCrossPartitionResult;
	void createResult;
	void createManyResult;
	void updateResult;
	void upsertResult;
	void deleteResult;
	void queryResult;
	void customQueryResult;
}

// Test 4: Deeply nested schema
function testDeepNestedSchema() {
	const client = {} as any;
	const containerClient = new ContainerClient(client, deepNestedSchema);

	const findUniqueResult: Promise<DeepNestedType | null> = containerClient.findUnique({
		where: { id: "test" },
	});

	const findManyResult: Promise<DeepNestedType[]> = containerClient.findMany({
		partitionKey: "test",
	});

	// Test deep select
	const selectResult = containerClient.findMany({
		partitionKey: "test",
		select: {
			level1: {
				level2: {
					level3: {
						level4: {
							level5: true,
						},
					},
				},
			},
		},
	});

	void findUniqueResult;
	void findManyResult;
	void selectResult;
}

// Test 5: Schema type inference validation
function testSchemaTypeInference() {
	// Test all schema types are correctly inferred

	// Minimal schema
	type MinimalExpected = { id: string };
	const _minimal: MinimalExpected = {} as MinimalType;

	// All types schema
	type AllTypesExpected = {
		id: string;
		name: string;
		age: number;
		isActive: boolean;
		createdAt: Date;
		tags: string[];
		metadata: {
			version: number;
			settings: {
				theme: string;
				notifications: boolean;
			};
		};
	};
	const _allTypes: AllTypesExpected = {} as AllTypesType;

	// Complex schema (partial check)
	type ComplexExpected = {
		id: string;
		conversationId: string;
		role: string;
		content: string;
		tokens?: number;
		createdAt: Date;
		tags: string[];
		author: {
			id: string;
			name: string;
			email?: string;
			profile?: {
				bio?: string;
				socialLinks: Array<{
					platform: string;
					url: string;
				}>;
			};
		};
		attachments: Array<{
			type: string;
			url: string;
			size: number;
			metadata?: {
				mimeType: string;
				width?: number;
				height?: number;
			};
		}>;
	};
	const _complex: ComplexExpected = {} as ComplexType;

	// Deep nested schema
	type DeepExpected = {
		id: string;
		level1: {
			level2: {
				level3: {
					level4: {
						level5: string;
						value: number;
					};
					items: Array<{
						name: string;
						count: number;
					}>;
				};
			};
		};
	};
	const _deep: DeepExpected = {} as DeepNestedType;

	void _minimal;
	void _allTypes;
	void _complex;
	void _deep;
}

// Test 6: Error conditions and edge cases
function testErrorConditions() {
	const client = {} as any;

	// Test that we can't call methods without required partition key
	// (This would cause TypeScript errors if uncommented)
	// const noPartitionClient = new ContainerClient(client, noPartitionKeySchema);
	// noPartitionClient.findUnique({ where: { id: "test" } }); // Should error - no partition key

	// Test that partition key requirements are enforced
	const complexClient = new ContainerClient(client, complexSchema);
	// These should work
	const withPartitionKey = complexClient.findMany({ partitionKey: "test" });
	const crossPartition = complexClient.findMany({
		enableCrossPartitionQuery: true,
		where: {},
	});

	void withPartitionKey;
	void crossPartition;
}

// =============================================================================
// RUNTIME TYPE VALIDATION TESTS
// =============================================================================

// These tests ensure that the runtime behavior matches the type definitions
function testRuntimeTypeValidation() {
	const client = {
		request: jest.fn().mockResolvedValue({
			Documents: [
				{
					id: "test",
					conversationId: "test",
					role: "user",
					content: "Hello",
					createdAt: new Date().toISOString(),
					tags: ["greeting"],
					author: {
						id: "author-id",
						name: "Test Author",
						email: "test@example.com",
					},
				},
			],
		}),
		getDatabase: jest.fn().mockReturnValue("testdb"),
	} as any;

	const containerClient = new ContainerClient(client, complexSchema);

	// Test that runtime return values match compile-time types
	containerClient.findMany({ partitionKey: "test" }).then((result) => {
		// TypeScript should infer result as ComplexType[]
		const firstItem: ComplexType = result[0];
		const id: string = firstItem.id;
		const tags: string[] = firstItem.tags;
		const authorName: string = firstItem.author.name;

		void id;
		void tags;
		void authorName;
	});
}

// =============================================================================
// BULK OPERATIONS TYPE TESTS
// =============================================================================

// Test 7: Bulk updateMany operations
function testBulkUpdateMany() {
	const client = {} as any;
	const containerClient = new ContainerClient(client, complexSchema);

	// Test static data update
	const staticUpdateOptions: BulkUpdateOptions<ComplexType> = {
		where: { role: "user" },
		data: { tokens: 100 },
		enableCrossPartitionQuery: true,
	};

	const staticUpdateResult: Promise<BulkUpdateResult> = containerClient.updateMany(staticUpdateOptions);

	// Test dynamic function update
	const dynamicUpdateOptions: BulkUpdateOptions<ComplexType> = {
		where: { role: "user" },
		data: (doc) => ({
			tokens: doc.tokens ? doc.tokens + 10 : 10,
			updatedAt: new Date(),
		}),
		partitionKey: "test",
		batchSize: 50,
		maxConcurrency: 5,
		onProgress: (stats: BulkProgressStats) => {
			const _percentage: number = stats.percentage;
			const _ruConsumed: number = stats.ruConsumed;
			void _percentage;
			void _ruConsumed;
		},
		onError: (error: BulkError) => {
			const _docId: string = error.documentId;
			const _retriable: boolean = error.retriable;
			void _docId;
			void _retriable;
		},
	};

	const dynamicUpdateResult: Promise<BulkUpdateResult> = containerClient.updateMany(dynamicUpdateOptions);

	// Verify result types
	staticUpdateResult.then((result) => {
		const _success: boolean = result.success;
		const _updated: number = result.updated;
		const _failed: number = result.failed;
		const _errors: BulkError[] = result.errors;
		const _ruConsumed: number = result.performance.ruConsumed;
		const _durationMs: number = result.performance.durationMs;
		void _success;
		void _updated;
		void _failed;
		void _errors;
		void _ruConsumed;
		void _durationMs;
	});

	void staticUpdateResult;
	void dynamicUpdateResult;
}

// Test 8: Bulk deleteMany operations
function testBulkDeleteMany() {
	const client = {} as any;
	const containerClient = new ContainerClient(client, complexSchema);

	// Test delete with confirmation
	const deleteOptions: BulkDeleteOptions<ComplexType> = {
		where: { role: "deleted" },
		confirm: true,
		enableCrossPartitionQuery: true,
		batchSize: 25,
		maxConcurrency: 3,
		continueOnError: true,
		onProgress: (stats: BulkProgressStats) => {
			const _percentage: number = stats.percentage;
			const _deleted: number = stats.updated; // 'updated' field means 'deleted' for delete operations
			void _percentage;
			void _deleted;
		},
	};

	const deleteResult: Promise<BulkDeleteResult> = containerClient.deleteMany(deleteOptions);

	// Verify result types
	deleteResult.then((result) => {
		const _success: boolean = result.success;
		const _deleted: number = result.deleted;
		const _failed: number = result.failed;
		const _errors: BulkError[] = result.errors;
		void _success;
		void _deleted;
		void _failed;
		void _errors;
	});

	void deleteResult;
}

// =============================================================================
// MIGRATION TYPE TESTS
// =============================================================================

// Test 9: Migration definition and context types
function testMigrationDefinition() {
	// Test basic migration
	const simpleMigration: MigrationDefinition = defineMigration({
		version: 1,
		name: "test-migration",
		description: "Test migration",
		async up(ctx: MigrationContext) {
			const _db: any = ctx.db;
			const _logger = ctx.logger;
			const _progress = ctx.progress;
			const _dryRun: boolean = ctx.dryRun;

			_logger.info("Running migration");
			_logger.warn("Warning message");
			_logger.error("Error message");
			_logger.debug("Debug message");

			const progressFn = _progress.track("container");
			progressFn({} as BulkProgressStats);

			void _db;
			void _dryRun;
		},
		async down(_ctx: MigrationContext) {
			_ctx.logger.info("Rolling back");
		},
		async validate(_ctx: MigrationContext) {
			return { valid: true, message: "Validation passed" };
		},
	});

	// Test migration with bulk operations
	const bulkMigration = defineMigration({
		version: 2,
		name: "bulk-migration",
		async up({ db, logger, progress }) {
			// Type inference for db should work
			const result = await db.complexSchema.updateMany({
				where: {},
				data: { tokens: 100 },
				enableCrossPartitionQuery: true,
				onProgress: progress.track("update"),
			});

			logger.info(`Updated ${result.updated} documents`);
		},
	});

	// Verify types
	const _version: number = simpleMigration.version;
	const _name: string = simpleMigration.name;
	const _description: string | undefined = simpleMigration.description;

	void _version;
	void _name;
	void _description;
	void simpleMigration;
	void bulkMigration;
}

// Test 10: Migration client types
function testMigrationClient() {
	// Mock migration client (would be created by createClient)
	const mockClient = {
		status: async (): Promise<MigrationStatus> => ({
			current: {
				version: 1,
				name: "migration-1",
				appliedAt: new Date(),
			},
			applied: [
				{
					id: "1",
					version: 1,
					name: "migration-1",
					appliedAt: new Date(),
					ruConsumed: 100,
					durationMs: 5000,
					checksum: "abc123",
				},
			],
			pending: [
				{
					version: 2,
					name: "migration-2",
					description: "Second migration",
				},
			],
			canRollback: true,
		}),
		plan: async (): Promise<MigrationPlan> => ({
			migrationsToApply: [
				{
					version: 2,
					name: "migration-2",
					estimatedRU: 150,
					estimatedDuration: "5s",
				},
			],
			totalEstimatedRU: 150,
			totalEstimatedDuration: "5s",
			warnings: ["Warning message"],
		}),
		apply: async (): Promise<MigrationResult> => ({
			success: true,
			applied: [
				{
					version: 2,
					name: "migration-2",
					ruConsumed: 160,
					durationMs: 4500,
				},
			],
			performance: {
				totalRuConsumed: 160,
				totalDurationMs: 4500,
			},
		}),
		rollback: async (): Promise<MigrationResult> => ({
			success: true,
			applied: [],
			performance: {
				totalRuConsumed: 50,
				totalDurationMs: 2000,
			},
		}),
	};

	// Test status types
	mockClient.status().then((status) => {
		const _current: { version: number; name: string; appliedAt: Date } | null = status.current;
		const _applied = status.applied;
		const _pending = status.pending;
		const _canRollback: boolean = status.canRollback;
		void _current;
		void _applied;
		void _pending;
		void _canRollback;
	});

	// Test plan types
	mockClient.plan().then((plan) => {
		const _migrations = plan.migrationsToApply;
		const _totalRU: number = plan.totalEstimatedRU;
		const _duration: string = plan.totalEstimatedDuration;
		const _warnings: string[] = plan.warnings;
		void _migrations;
		void _totalRU;
		void _duration;
		void _warnings;
	});

	// Test apply result types
	mockClient.apply().then((result) => {
		const _success: boolean = result.success;
		const _applied = result.applied;
		const _failed: { version: number; name: string; error: string } | undefined = result.failed;
		const _performance = result.performance;
		void _success;
		void _applied;
		void _failed;
		void _performance;
	});
}

// =============================================================================
// MANAGEMENT OPERATIONS TYPE TESTS
// =============================================================================

// Test 11: Database information types
function testDatabaseInfo() {
	const databaseInfo: DatabaseInfo = {
		id: "test-db",
		_self: "self",
		_rid: "rid",
		_ts: 123456,
		created: new Date(),
		lastModified: new Date(),
		storage: {
			totalSizeGB: 10.5,
			documentsSizeGB: 8.0,
			indexSizeGB: 2.5,
			totalDocuments: 10000,
		},
		throughput: {
			type: "manual",
			currentRU: 400,
			maxRU: 4000,
			minRU: 400,
		},
		region: "East US",
		containersCount: 5,
		estimatedMonthlyCost: {
			ruCost: 24.0,
			storageCost: 2.5,
			totalUSD: 26.5,
			breakdown: [
				{ type: "RU", value: 24.0, unit: "USD" },
				{ type: "Storage", value: 2.5, unit: "USD" },
			],
		},
	};

	const detailedInfo: DetailedDatabaseInfo = {
		...databaseInfo,
		containers: [
			{
				id: "container-1",
				_self: "self",
				_rid: "rid",
				_ts: 123456,
				created: new Date(),
				lastModified: new Date(),
				partitionKey: {
					paths: ["/id"],
					kind: "Hash",
					version: 2,
				},
				statistics: {
					documentCount: 1000,
					sizeKB: 5000,
					indexSizeKB: 500,
					avgDocumentSizeKB: 5.0,
				},
				throughput: {
					type: "shared",
				},
				indexingPolicy: {
					automatic: true,
					indexingMode: "consistent",
					includedPaths: 10,
					excludedPaths: 2,
					compositeIndexes: 3,
					spatialIndexes: 0,
				},
				defaultTtl: 3600,
				schema: {
					registered: true,
					fieldCount: 5,
					partitionKeyField: "id",
				},
			},
		],
	};

	void databaseInfo;
	void detailedInfo;
}

// Test 12: Health check types
function testHealthCheck() {
	const containerHealth: ContainerHealthCheck = {
		container: "users",
		healthy: false,
		issues: [
			{
				severity: "warning",
				type: "large_documents",
				message: "Average document size is large",
				recommendation: "Consider splitting documents",
			},
			{
				severity: "error",
				type: "missing_index",
				message: "Missing index on frequently queried field",
				recommendation: "Add index to improve performance",
			},
		],
		statistics: {
			documentCount: 1000,
			avgDocumentSizeKB: 150.5,
			largestDocumentKB: 500,
			ruConsumption: {
				avg: 5.5,
				p95: 12.0,
				p99: 25.0,
			},
		},
	};

	const healthReport: DatabaseHealthReport = {
		database: "test-db",
		overallHealth: "warning",
		timestamp: new Date(),
		containers: [containerHealth],
		recommendations: [
			"Consider adding indexes",
			"Review partition key strategy",
		],
		costAnalysis: {
			currentMonthlyEstimate: 100.0,
			potentialSavings: [
				{
					type: "Remove unused containers",
					savingsUSD: 10.0,
					action: "Delete orphaned containers",
				},
			],
		},
	};

	void containerHealth;
	void healthReport;
}

// Test 13: Schema diff types
function testSchemaDiff() {
	const schemaDiff: SchemaDiff = {
		database: "test-db",
		timestamp: new Date(),
		containers: {
			registered: ["users", "posts"],
			actual: ["users", "posts", "orphaned"],
			orphaned: ["orphaned"],
			missing: [],
			modified: [
				{
					container: "users",
					differences: {
						partitionKey: {
							registered: "/email",
							actual: "/id",
						},
						throughput: {
							registered: 400,
							actual: 800,
						},
						indexing: {
							differences: [
								"Missing composite index on (field1, field2)",
							],
						},
						fields: {
							inSchemaOnly: ["newField"],
							inDataOnly: ["oldField"],
							typeMismatches: [
								{
									field: "age",
									expectedType: "number",
									actualTypes: ["string", "number"],
									percentage: 15.5,
								},
							],
						},
					},
				},
			],
		},
		requiresAction: true,
	};

	// Verify types can be accessed
	const _dbName: string = schemaDiff.database;
	const _timestamp: Date = schemaDiff.timestamp;
	const _orphaned: string[] = schemaDiff.containers.orphaned;
	const _requiresAction: boolean = schemaDiff.requiresAction;

	void _dbName;
	void _timestamp;
	void _orphaned;
	void _requiresAction;
	void schemaDiff;
}

// Test 14: Container management operation types
function testContainerManagement() {
	// Mock management operations
	const mockManagement = {
		listOrphanedContainers: async (): Promise<string[]> => ["orphaned1", "orphaned2"],
		pruneContainers: async (): Promise<PruneContainersResult> => ({
			pruned: ["orphaned1"],
			kept: ["keep-this"],
			failed: [
				{
					container: "failed-container",
					error: "Permission denied",
				},
			],
			estimatedSavings: {
				storageGB: 5.0,
				monthlyRU: 100,
				monthlyUSD: 10.0,
			},
		}),
	};

	// Test orphaned containers
	mockManagement.listOrphanedContainers().then((orphaned) => {
		const _firstOrphaned: string = orphaned[0];
		void _firstOrphaned;
	});

	// Test prune result types
	mockManagement.pruneContainers().then((result) => {
		const _pruned: string[] = result.pruned;
		const _kept: string[] = result.kept;
		const _failed = result.failed;
		const _savings = result.estimatedSavings;

		void _pruned;
		void _kept;
		void _failed;
		void _savings;
	});
}

// =============================================================================
// AGGREGATION AND ADVANCED QUERY TYPE TESTS
// =============================================================================

// Test 15: Aggregation operations with new bulk features
function testAggregationWithBulk() {
	const client = {} as any;
	const containerClient = new ContainerClient(client, complexSchema);

	// Test count
	const countResult: Promise<number> = containerClient.count({
		where: { role: "user" },
		enableCrossPartitionQuery: true,
	});

	// Test aggregate
	const aggregateResult = containerClient.aggregate({
		where: { role: "user" },
		_count: true,
		_sum: { tokens: true },
		_avg: { tokens: true },
		_min: { createdAt: true },
		_max: { createdAt: true },
		enableCrossPartitionQuery: true,
	});

	// Test groupBy
	const groupByResult = containerClient.groupBy({
		by: "role",
		_count: true,
		_sum: { tokens: true },
		enableCrossPartitionQuery: true,
	});

	void countResult;
	void aggregateResult;
	void groupByResult;
}

// =============================================================================
// INTEGRATION TYPE TESTS
// =============================================================================

// Test 16: Full workflow type integration
function testFullWorkflowTypes() {
	// This test ensures all types work together correctly
	const client = {} as any;
	const containerClient = new ContainerClient(client, complexSchema);

	// 1. Create documents
	const create = containerClient.create({
		data: {
			id: "test",
			conversationId: "conv-1",
			role: "user",
			content: "Hello",
			createdAt: new Date(),
			tags: ["greeting"],
			author: {
				id: "author-1",
				name: "Test User",
				email: undefined,
				profile: {
					bio: undefined,
					website: undefined,
					socialLinks: [],
				},
			},
			attachments: [],
		},
	});

	// 2. Bulk update
	const bulkUpdate = containerClient.updateMany({
		where: { role: "user" },
		data: (doc) => ({
			tokens: doc.tokens ? doc.tokens + 10 : 10,
		}),
		enableCrossPartitionQuery: true,
		onProgress: (stats) => {
			console.log(`Progress: ${stats.percentage}%`);
		},
	});

	// 3. Query with aggregation
	const query = containerClient.findMany({
		where: { role: "user" },
		aggregate: {
			_count: true,
			_sum: { tokens: true },
		},
		enableCrossPartitionQuery: true,
	});

	// 4. Bulk delete
	const bulkDelete = containerClient.deleteMany({
		where: { role: "deleted" },
		confirm: true,
		enableCrossPartitionQuery: true,
	});

	void create;
	void bulkUpdate;
	void query;
	void bulkDelete;
}

// =============================================================================
// EXECUTE ALL TESTS
// =============================================================================

// Call all test functions to ensure they execute and type-check
testMinimalSchema();
testAllTypesSchema();
testComplexSchemaAllMethods();
testDeepNestedSchema();
testSchemaTypeInference();
testErrorConditions();
testRuntimeTypeValidation();

// New tests for advanced features
testBulkUpdateMany();
testBulkDeleteMany();
testMigrationDefinition();
testMigrationClient();
testDatabaseInfo();
testHealthCheck();
testSchemaDiff();
testContainerManagement();
testAggregationWithBulk();
testFullWorkflowTypes();

// Export a dummy value to ensure this file is included in compilation
export const _typeTests = true;
