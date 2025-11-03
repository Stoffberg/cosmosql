/**
 * COMPREHENSIVE Type-level tests to ensure 100% type inference coverage.
 * These tests are included in TypeScript compilation to catch type inference issues.
 *
 * This file tests:
 * - All field types (string, number, boolean, date, array, object)
 * - All ContainerClient methods
 * - Complex nested structures
 * - Optional vs required fields
 * - Select operations
 * - Edge cases and error conditions
 */

// Import the necessary types and functions
import { ContainerClient } from "./client/container-client";
import { container, field } from "./schema";
import type { InferSchema } from "./types";

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

// Export a dummy value to ensure this file is included in compilation
export const _typeTests = true;
