/**
 * Aggregation Integration Test Suite for CosmosQL
 *
 * Run with: bun test tests/integration/aggregate.test.ts
 *
 * Tests count, aggregate, groupBy, and convenience methods with real CosmosDB.
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
const testContainerName = "testItems-aggregate"; // Unique name for this test file

if (!connectionString) {
	console.warn("COSMOS_CONNECTION_STRING not set, skipping integration tests");
}

// Test schema
const testSchema = container(testContainerName, {
	id: field.string(),
	partitionKey: field.string(),
	name: field.string(),
	category: field.string(),
	amount: field.number(),
	value: field.number().optional(),
	status: field.string(),
	createdAt: field.date(),
	isActive: field.boolean().optional(),
}).partitionKey("partitionKey");

// Test data
const testItems = [
	{
		id: "agg-test-1",
		partitionKey: "partition-1",
		name: "Item 1",
		category: "electronics",
		amount: 100,
		value: 1000,
		status: "active",
		createdAt: new Date("2024-01-01"),
		isActive: true,
	},
	{
		id: "agg-test-2",
		partitionKey: "partition-1",
		name: "Item 2",
		category: "electronics",
		amount: 200,
		value: 2000,
		status: "active",
		createdAt: new Date("2024-01-02"),
		isActive: true,
	},
	{
		id: "agg-test-3",
		partitionKey: "partition-1",
		name: "Item 3",
		category: "books",
		amount: 50,
		value: 500,
		status: "active",
		createdAt: new Date("2024-01-03"),
		isActive: false,
	},
	{
		id: "agg-test-4",
		partitionKey: "partition-2",
		name: "Item 4",
		category: "electronics",
		amount: 150,
		value: 1500,
		status: "inactive",
		createdAt: new Date("2024-01-04"),
		isActive: true,
	},
	{
		id: "agg-test-5",
		partitionKey: "partition-2",
		name: "Item 5",
		category: "books",
		amount: 75,
		value: undefined,
		status: "active",
		createdAt: new Date("2024-01-05"),
		isActive: true,
	},
];

describe("Aggregation Integration Tests", () => {
	let client: ReturnType<typeof createClient>;
	let cosmosqlDb: Awaited<
		ReturnType<typeof client.withContainers<{ testItems_aggregate: typeof testSchema }>>
	>;
	let containerClient: typeof cosmosqlDb.testItems_aggregate;
	let azureClient: AzureCosmosClient;

	beforeAll(async () => {
		if (!connectionString) {
			return;
		}

		client = createClient({
			connectionString: connectionString,
			database: databaseName,
			mode: "auto-create",
		});
		cosmosqlDb = await client.withContainers({ testItems_aggregate: testSchema });
		containerClient = cosmosqlDb.testItems_aggregate;
		azureClient = new AzureCosmosClient(connectionString);

		// Clean up any existing test data from previous runs
		const database = azureClient.database(databaseName);
		const container = database.container(testContainerName);

		let deletedCount = 0;
		try {
			// Delete only test items (those starting with 'agg-test-')
			const query = "SELECT c.id, c.partitionKey FROM c WHERE STARTSWITH(c.id, 'agg-test-')";
			const { resources } = await container.items.query(query).fetchAll();
			for (const item of resources) {
				await withRateLimitRetry(() => container.item(item.id, item.partitionKey).delete());
				deletedCount++;
				await delay(100);
			}
		} catch (error: any) {
			// Container might not exist, that's ok
			if (error.code !== 404 && error.status !== 404) {
				console.warn("Cleanup warning:", error.message);
			}
		}

		// Wait a bit for cleanup to complete if we deleted items
		if (deletedCount > 0) {
			console.log(`Deleted ${deletedCount} existing test items, waiting for cleanup...`);
			await delay(500);
		}

		// Create test data
		for (const item of testItems) {
			await withRateLimitRetry(() => containerClient.create({ data: item }));
			await delay(100);
		}

		// Wait for data to be available
		await delay(1000);
	});

	afterAll(async () => {
		if (!connectionString) {
			return;
		}

		// Clean up test data
		const database = azureClient.database(databaseName);
		const container = database.container(testContainerName);

		try {
			const query = "SELECT c.id, c.partitionKey FROM c WHERE STARTSWITH(c.id, 'agg-test-')";
			const { resources } = await container.items.query(query).fetchAll();
			for (const item of resources) {
				await withRateLimitRetry(() => container.item(item.id, item.partitionKey).delete());
				await delay(100);
			}
			console.log(`Cleaned up ${resources.length} test items`);
		} catch (error: any) {
			// Log cleanup errors but don't fail the test
			console.warn("Cleanup error:", error.message);
		}
	});

	test("count returns correct number", async () => {
		if (!connectionString) {
			return;
		}

		const count = await withRateLimitRetry(() =>
			containerClient.count({
				partitionKey: "partition-1",
			}),
		);

		expect(count).toBe(3);
	});

	test("count with WHERE clause", async () => {
		if (!connectionString) {
			return;
		}

		const count = await withRateLimitRetry(() =>
			containerClient.count({
				partitionKey: "partition-1",
				where: { status: "active" },
			}),
		);

		expect(count).toBe(2);
	});

	test("count with cross-partition query", async () => {
		if (!connectionString) {
			return;
		}

		const count = await withRateLimitRetry(() =>
			containerClient.count({
				enableCrossPartitionQuery: true,
			}),
		);

		expect(count).toBe(5);
	});

	test("aggregate with _count", async () => {
		if (!connectionString) {
			return;
		}

		const result = (await withRateLimitRetry(() =>
			containerClient.aggregate({
				partitionKey: "partition-1",
				_count: true,
			}),
		)) as any;

		expect(result._count).toBe(3);
	});

	test("aggregate with multiple operations", async () => {
		if (!connectionString) {
			return;
		}

		const result = (await withRateLimitRetry(() =>
			containerClient.aggregate({
				partitionKey: "partition-1",
				_count: true,
				_sum: { amount: true, value: true },
				_avg: { amount: true },
				_min: { amount: true },
				_max: { amount: true },
			}),
		)) as any;

		expect(result._count).toBe(3);
		expect(result._sum).toEqual({ amount: 350, value: 3500 });
		expect(result._avg).toEqual({ amount: 116.66666666666667 });
		expect(result._min).toEqual({ amount: 50 });
		expect(result._max).toEqual({ amount: 200 });
	});

	test("aggregate with WHERE clause", async () => {
		if (!connectionString) {
			return;
		}

		const result = (await withRateLimitRetry(() =>
			containerClient.aggregate({
				partitionKey: "partition-1",
				where: { status: "active" },
				_count: true,
				_sum: { amount: true },
			}),
		)) as any;

		expect(result._count).toBe(2);
		expect(result._sum).toEqual({ amount: 300 });
	});

	test("groupBy with single field", async () => {
		if (!connectionString) {
			return;
		}

		const result = (await withRateLimitRetry(() =>
			containerClient.groupBy({
				by: "category",
				enableCrossPartitionQuery: true,
				_count: true,
				_sum: { amount: true },
			}),
		)) as any;

		expect(result.length).toBeGreaterThan(0);
		const electronics = result.find((r) => r.category === "electronics");
		const books = result.find((r) => r.category === "books");

		expect(electronics).toBeDefined();
		expect(books).toBeDefined();
		expect(electronics?._count).toBeGreaterThan(0);
		expect(books?._count).toBeGreaterThan(0);
	});

	test("groupBy with multiple fields", async () => {
		if (!connectionString) {
			return;
		}

		const result = await withRateLimitRetry(() =>
			containerClient.groupBy({
				by: ["partitionKey", "category"] as const,
				enableCrossPartitionQuery: true,
				_count: true,
				_sum: { amount: true },
			}),
		);

		expect(result.length).toBe(4); // 4 unique combinations of partitionKey + category

		// Test partition-1 + electronics group
		const partition1Electronics = result.find(
			(r) => r.partitionKey === "partition-1" && r.category === "electronics",
		);
		expect(partition1Electronics).toBeDefined();
		expect(partition1Electronics?._count).toBe(2);
		expect(partition1Electronics?._sum?.amount).toBe(300);

		// Test partition-1 + books group
		const partition1Books = result.find(
			(r) => r.partitionKey === "partition-1" && r.category === "books",
		);
		expect(partition1Books).toBeDefined();
		expect(partition1Books?._count).toBe(1);
		expect(partition1Books?._sum?.amount).toBe(50);

		// Test partition-2 + electronics group
		const partition2Electronics = result.find(
			(r) => r.partitionKey === "partition-2" && r.category === "electronics",
		);
		expect(partition2Electronics).toBeDefined();
		expect(partition2Electronics?._count).toBe(1);
		expect(partition2Electronics?._sum?.amount).toBe(150);

		// Test partition-2 + books group
		const partition2Books = result.find(
			(r) => r.partitionKey === "partition-2" && r.category === "books",
		);
		expect(partition2Books).toBeDefined();
		expect(partition2Books?._count).toBe(1);
		expect(partition2Books?._sum?.amount).toBe(75);
	});

	test("groupBy with ORDER BY", async () => {
		if (!connectionString) {
			return;
		}

		const result = (await withRateLimitRetry(() =>
			containerClient.groupBy({
				by: "category",
				enableCrossPartitionQuery: true,
				_count: true,
				orderBy: { _count: "desc" },
			}),
		)) as any;

		expect(result.length).toBeGreaterThan(0);
		// First item should have highest count
		expect(result[0]._count).toBeGreaterThanOrEqual(result[result.length - 1]._count);
	});

	test("groupBy with WHERE clause", async () => {
		if (!connectionString) {
			return;
		}

		const result = (await withRateLimitRetry(() =>
			containerClient.groupBy({
				by: "category",
				enableCrossPartitionQuery: true,
				where: { status: "active" },
				_count: true,
			}),
		)) as any;

		expect(result.length).toBeGreaterThan(0);
	});

	test("sum convenience method", async () => {
		if (!connectionString) {
			return;
		}

		const sum = await withRateLimitRetry(() =>
			containerClient.sum("amount" as never, {
				partitionKey: "partition-1",
			}),
		);

		expect(sum).toBe(350);
	});

	test("avg convenience method", async () => {
		if (!connectionString) {
			return;
		}

		const avg = await withRateLimitRetry(() =>
			containerClient.avg("amount" as never, {
				partitionKey: "partition-1",
			}),
		);

		expect(avg).toBeCloseTo(116.67, 1);
	});

	test("min convenience method", async () => {
		if (!connectionString) {
			return;
		}

		const min = await withRateLimitRetry(() =>
			containerClient.min("amount", {
				partitionKey: "partition-1",
			}),
		);

		expect(min).toBe(50);
	});

	test("max convenience method", async () => {
		if (!connectionString) {
			return;
		}

		const max = await withRateLimitRetry(() =>
			containerClient.max("amount", {
				partitionKey: "partition-1",
			}),
		);

		expect(max).toBe(200);
	});

	test("handles null values in aggregations", async () => {
		if (!connectionString) {
			return;
		}

		const result = (await withRateLimitRetry(() =>
			containerClient.aggregate({
				partitionKey: "partition-2",
				_sum: { value: true },
			}),
		)) as any;

		// Should handle null values (SUM ignores nulls)
		expect(result._sum).toBeDefined();
	});

	test("aggregate with _count select", async () => {
		if (!connectionString) {
			return;
		}

		const result = (await withRateLimitRetry(() =>
			containerClient.aggregate({
				partitionKey: "partition-1",
				_count: {
					select: {
						amount: true,
						value: true,
					},
				},
			}),
		)) as any;

		expect(result._count).toBeDefined();
		expect(typeof result._count.amount).toBe("number");
		expect(typeof result._count.value).toBe("number");
	});

	test("groupBy with pagination", async () => {
		if (!connectionString) {
			return;
		}

		const result = (await withRateLimitRetry(() =>
			containerClient.groupBy({
				by: "category",
				enableCrossPartitionQuery: true,
				_count: true,
				take: 1,
			}),
		)) as any;

		expect(result.length).toBeLessThanOrEqual(1);
	});

	test("throws error when partition key missing", async () => {
		if (!connectionString) {
			return;
		}

		await expect(
			containerClient.count({
				partitionKey: undefined as any,
			}),
		).rejects.toThrow("PARTITION KEY REQUIRED");
	});
});
