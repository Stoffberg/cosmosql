/**
 * Query Operations Integration Test Suite for CosmosQL
 *
 * Run with: bun test tests/integration/query-operations.test.ts
 *
 * Tests query and find operations.
 */

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { CosmosClient as AzureCosmosClient } from "@azure/cosmos";
import { config } from "dotenv";
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

// Load environment variables
config();

const connectionString = process.env.COSMOS_CONNECTION_STRING;
const databaseName = "cosmosql-test";
const testContainerName = "testItems-query"; // Unique name for this test file

// Test schema
const testSchema = container(testContainerName, {
	id: field.string(),
	partitionKey: field.string(),
	name: field.string(),
	value: field.number(),
	tags: field.array(field.string()).optional(),
	isActive: field.boolean().optional(),
}).partitionKey("partitionKey");

// Test data
const queryTestItems = [
	{
		id: "query-test-item-1",
		partitionKey: "partition-1",
		name: "Query Test Item 1",
		value: 10,
		tags: ["test", "query"],
		isActive: true,
	},
	{
		id: "query-test-item-2",
		partitionKey: "partition-1",
		name: "Query Test Item 2",
		value: 25,
		isActive: false,
	},
	{
		id: "query-test-item-3",
		partitionKey: "partition-2",
		name: "Another Query Test",
		value: 75,
		isActive: true,
	},
];

describe("CosmosQL Query Operations Integration Tests", () => {
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

		// Create test data
		for (const item of queryTestItems) {
			await withRateLimitRetry(() =>
				cosmosqlDb.testItems.create({
					data: item,
				}),
			);
			await delay(300);
		}
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

	describe("Find Operations", () => {
		test("CosmosQL: Find many with where filter", async () => {
			const results = await withRateLimitRetry(() =>
				cosmosqlDb.testItems.findMany({
					partitionKey: "partition-1",
					where: {
						isActive: true,
					},
				}),
			);

			expect(Array.isArray(results)).toBe(true);
			expect(results.every((r) => r.isActive === true)).toBe(true);
		});

		test("CosmosQL: Find many with value comparison", async () => {
			await delay(200);
			const results = await withRateLimitRetry(() =>
				cosmosqlDb.testItems.findMany({
					partitionKey: "partition-1",
					where: {
						value: { gte: 20 },
					},
				}),
			);

			expect(Array.isArray(results)).toBe(true);
			expect(results.length > 0 && results.every((r) => (r.value as number) >= 20)).toBe(true);
		});

		test("CosmosQL: Find many with orderBy", async () => {
			await delay(200);
			const results = await withRateLimitRetry(() =>
				cosmosqlDb.testItems.findMany({
					partitionKey: "partition-1",
					orderBy: {
						value: "desc",
					},
				}),
			);

			expect(results.length).toBeGreaterThanOrEqual(2);
			expect((results[0].value as number) >= (results[1].value as number)).toBe(true);
		});

		test("CosmosQL: Find many with limit", async () => {
			await delay(200);
			const results = await withRateLimitRetry(() =>
				cosmosqlDb.testItems.findMany({
					partitionKey: "partition-1",
					take: 1,
				}),
			);

			expect(results.length).toBe(1);
		});

		test("CosmosQL: Find many with select", async () => {
			await delay(200);
			const results = await withRateLimitRetry(() =>
				cosmosqlDb.testItems.findMany({
					partitionKey: "partition-1",
					select: {
						id: true,
						name: true,
					},
				}),
			);

			expect(results.length).toBeGreaterThan(0);
			expect(results[0].id).toBeDefined();
			expect(results[0].name).toBeDefined();
		});
	});

	describe("Query Operations", () => {
		test("CosmosQL: Complex query with multiple conditions", async () => {
			const results = await withRateLimitRetry(() =>
				cosmosqlDb.testItems.findMany({
					partitionKey: "partition-1",
					where: {
						value: { gte: 5, lte: 50 },
						isActive: true,
					},
				}),
			);

			expect(Array.isArray(results)).toBe(true);
			expect(
				results.length > 0 &&
					results.every((r) => (r.value as number) >= 5 && (r.value as number) <= 50 && r.isActive),
			).toBe(true);
		});

		test("CosmosQL: Query with string contains", async () => {
			await delay(300);
			const results = await withRateLimitRetry(() =>
				cosmosqlDb.testItems.findMany({
					partitionKey: "partition-1",
					where: {
						name: { contains: "Test" },
					},
				}),
			);

			expect(results.length).toBeGreaterThan(0);
			expect(results.every((r) => (r.name as string).includes("Test"))).toBe(true);
		});

		test("CosmosQL: Cross-partition query", async () => {
			await delay(300);
			const results = await withRateLimitRetry(() =>
				cosmosqlDb.testItems.findMany({
					where: {
						isActive: true,
					},
					enableCrossPartitionQuery: true,
				}),
			);

			expect(Array.isArray(results)).toBe(true);
			expect(results.length).toBeGreaterThanOrEqual(2);
			expect(results.every((r) => r.isActive === true)).toBe(true);
		});
	});
});
