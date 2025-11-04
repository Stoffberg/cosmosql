/**
 * Basic CRUD Integration Test Suite for CosmosQL
 *
 * Run with: bun test tests/integration/basic-crud.test.ts
 *
 * Tests basic create, read, update, delete operations.
 */

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { CosmosClient as AzureCosmosClient } from "@azure/cosmos";
import { createClient } from "../../src";
import { container, field } from "../../src/schema";

// Helper function to add delays between operations to avoid rate limiting
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Helper function to retry operations on rate limit errors
const withRateLimitRetry = async <T>(
	operation: () => Promise<T>,
	maxRetries = 5,
	baseDelay = 2000,
): Promise<T> => {
	for (let attempt = 0; attempt < maxRetries; attempt++) {
		try {
			return await operation();
		} catch (error: any) {
			if (error.statusCode === 429 && attempt < maxRetries - 1) {
				const delayMs = baseDelay * 2 ** attempt;
				console.log(
					`Rate limited, retrying in ${delayMs}ms (attempt ${attempt + 1}/${maxRetries})`,
				);
				await delay(delayMs);
				continue;
			}
			throw error;
		}
	}
	throw new Error("Max retries exceeded");
};

const connectionString = process.env.COSMOS_CONNECTION_STRING;
const databaseName = "cosmosql-test";
const testContainerName = "testItems-crud"; // Unique name for this test file

// Test schema
const testSchema = container(testContainerName, {
	id: field.string(),
	partitionKey: field.string(),
	name: field.string(),
	value: field.number(),
	tags: field.array(field.string()).optional(),
	metadata: field
		.object({
			created: field.string(),
			updated: field.string().optional(),
		})
		.optional(),
	isActive: field.boolean().optional(),
}).partitionKey("partitionKey");

// Test data
const testItem1 = {
	id: "crud-test-item-1",
	partitionKey: "partition-1",
	name: "CRUD Test Item 1",
	value: 42,
	tags: ["test", "crud"],
	metadata: {
		created: new Date().toISOString(),
	},
	isActive: true,
};

const testItem2 = {
	id: "crud-test-item-2",
	partitionKey: "partition-1",
	name: "CRUD Test Item 2",
	value: 100,
	isActive: false,
};

describe("CosmosQL Basic CRUD Integration Tests", () => {
	let azureClient: AzureCosmosClient;
	let cosmosqlDb: Awaited<ReturnType<ReturnType<typeof createClient>["withContainers"]>>;

	beforeAll(async () => {
		if (!connectionString) {
			throw new Error("❌ COSMOS_CONNECTION_STRING environment variable is required");
		}

		// Initialize Azure SDK client
		const parts = connectionString.split(";");
		const config: any = {};
		for (const part of parts) {
			const equalIndex = part.indexOf("=");
			if (equalIndex > 0) {
				const key = part.substring(0, equalIndex).trim();
				const value = part.substring(equalIndex + 1).trim();
				if (key && value) {
					config[key] = value;
				}
			}
		}

		azureClient = new AzureCosmosClient({
			endpoint: config.AccountEndpoint,
			key: config.AccountKey,
		});

		// Verify it works
		await azureClient.getDatabaseAccount();

		// Ensure test database exists
		try {
			await azureClient.database(databaseName).read();
		} catch (error: any) {
			if (error.code === 404) {
				await azureClient.databases.create({ id: databaseName });
			} else {
				throw error;
			}
		}

		// Clean up old test container if exists
		try {
			await azureClient.database(databaseName).container(testContainerName).delete();
			await delay(2000);
		} catch (error: any) {
			if (error.code !== 404) {
				throw error;
			}
		}

		// Initialize CosmosQL client with auto-create mode
		const baseClient = createClient({
			connectionString: connectionString,
			database: databaseName,
			mode: "auto-create",
		});

		cosmosqlDb = (await baseClient.withContainers({
			testItems: testSchema,
		})) as any;

		expect(cosmosqlDb).not.toBeNull();
		await delay(1000);
	});

	afterAll(async () => {
		// Cleanup: Delete all test items
		try {
			const allItems = await cosmosqlDb.testItems.findMany({
				enableCrossPartitionQuery: true,
			});

			for (const item of allItems) {
				await cosmosqlDb.testItems.delete({
					where: {
						id: item.id as string,
						partitionKey: item.partitionKey,
					},
				});
			}
		} catch (_error) {
			// Ignore cleanup errors
		}

		// Delete test container
		try {
			await azureClient.database(databaseName).container(testContainerName).delete();
		} catch (_error) {
			// Ignore cleanup errors
		}
	});

	describe("Create Operations", () => {
		test("CosmosQL: Create item with all fields", async () => {
			const result = await withRateLimitRetry(() =>
				cosmosqlDb.testItems.create({
					data: testItem1,
				}),
			);

			expect(result).not.toBeNull();
			expect(result.id).toBe(testItem1.id);
			expect(result.name).toBe(testItem1.name);
			expect(result.value).toBe(testItem1.value);
			expect(Array.isArray(result.tags)).toBe(true);
		});

		test("CosmosQL: Create item with minimal fields", async () => {
			await delay(300);
			const result = await withRateLimitRetry(() =>
				cosmosqlDb.testItems.create({
					data: testItem2,
				}),
			);

			expect(result).not.toBeNull();
			expect(result.id).toBe(testItem2.id);
			expect(result.value).toBe(testItem2.value);
		});
	});

	describe("Read Operations", () => {
		test("CosmosQL: Find unique item", async () => {
			const result = await withRateLimitRetry(() =>
				cosmosqlDb.testItems.findUnique({
					where: {
						id: testItem1.id,
						partitionKey: testItem1.partitionKey,
					},
				}),
			);

			expect(result).not.toBeNull();
			expect(result!.id).toBe(testItem1.id);
			expect(result!.name).toBe(testItem1.name);
		});

		test("CosmosQL: Find unique returns null for non-existent", async () => {
			await delay(200);
			const result = await withRateLimitRetry(() =>
				cosmosqlDb.testItems.findUnique({
					where: {
						id: "non-existent",
						partitionKey: "partition-1",
					},
				}),
			);

			expect(result).toBeNull();
		});

		test("CosmosQL: Find many in partition", async () => {
			await delay(200);
			const results = await withRateLimitRetry(() =>
				cosmosqlDb.testItems.findMany({
					partitionKey: "partition-1",
				}),
			);

			expect(Array.isArray(results)).toBe(true);
			expect(results.length).toBeGreaterThanOrEqual(2);
			expect(results.every((r) => r.partitionKey === "partition-1")).toBe(true);
		});
	});

	describe("Update Operations", () => {
		test("CosmosQL: Update item", async () => {
			const result = await withRateLimitRetry(() =>
				cosmosqlDb.testItems.update({
					where: {
						id: testItem1.id,
						partitionKey: testItem1.partitionKey,
					},
					data: {
						value: 999,
						"metadata.updated": new Date().toISOString(),
					},
				}),
			);

			expect(result).not.toBeNull();
			expect(result!.value).toBe(999);
			expect(result!.metadata?.updated).toBeDefined();
		});

		test("CosmosQL: Upsert creates new item", async () => {
			await delay(300);
			const newItem = {
				id: "upsert-crud-new",
				partitionKey: "partition-1",
				name: "Upserted CRUD Item",
				value: 500,
			};

			const result = await withRateLimitRetry(() =>
				cosmosqlDb.testItems.upsert({
					data: newItem,
				}),
			);

			expect(result).not.toBeNull();
			expect(result.id).toBe(newItem.id);
		});

		test("CosmosQL: Upsert updates existing item", async () => {
			await delay(300);
			const result = await withRateLimitRetry(() =>
				cosmosqlDb.testItems.upsert({
					data: {
						id: "upsert-crud-new",
						partitionKey: "partition-1",
						name: "Updated Upsert CRUD",
						value: 600,
					},
				}),
			);

			expect(result).not.toBeNull();
			expect(result.value).toBe(600);
			expect(result.name).toBe("Updated Upsert CRUD");
		});
	});

	describe("Delete Operations", () => {
		test("CosmosQL: Delete item", async () => {
			await withRateLimitRetry(() =>
				cosmosqlDb.testItems.delete({
					where: {
						id: testItem2.id,
						partitionKey: testItem2.partitionKey,
					},
				}),
			);

			await delay(1000);

			const result = await withRateLimitRetry(() =>
				cosmosqlDb.testItems.findUnique({
					where: {
						id: testItem2.id,
						partitionKey: testItem2.partitionKey,
					},
				}),
			);

			expect(result).toBeNull();
		});
	});
});
