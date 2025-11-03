/**
 * Comprehensive Integration Test Suite for CosmosQL
 *
 * Run with: npx tsx integration-tests.ts
 *
 * This replaces Jest-based integration tests which have environment issues.
 * All operations are tested against a real Azure Cosmos DB instance.
 */

import { CosmosClient as AzureCosmosClient } from "@azure/cosmos";
import { config } from "dotenv";
import { createClient } from "./src";
import { container, field } from "./src/schema";

// Load environment variables
config();

const connectionString = process.env.COSMOS_CONNECTION_STRING;
if (!connectionString) {
	console.error("❌ COSMOS_CONNECTION_STRING environment variable is required");
	process.exit(1);
}

// Test configuration
const databaseName = "cosmosql-test";
const testContainerName = "testItems"; // This is the object key used in withContainers()

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

// Test results tracking
interface TestResult {
	name: string;
	passed: boolean;
	error?: string;
	duration?: number;
}

const results: TestResult[] = [];

function logTest(name: string, status: "RUNNING" | "PASS" | "FAIL", error?: string) {
	const symbols = {
		RUNNING: "⏳",
		PASS: "✅",
		FAIL: "❌",
	};

	const symbol = symbols[status];
	const message = error ? ` - ${error}` : "";
	console.log(`${symbol} ${name}${message}`);
}

async function test(name: string, fn: () => Promise<void>) {
	logTest(name, "RUNNING");
	const startTime = Date.now();

	try {
		await fn();
		const duration = Date.now() - startTime;
		results.push({ name, passed: true, duration });
		logTest(name, "PASS");
	} catch (error: any) {
		const duration = Date.now() - startTime;
		const errorMsg = error.message || String(error);
		results.push({ name, passed: false, error: errorMsg, duration });
		logTest(name, "FAIL", errorMsg);
	}
}

function assert(condition: boolean, message: string) {
	if (!condition) {
		throw new Error(`Assertion failed: ${message}`);
	}
}

function assertEqual<T>(actual: T, expected: T, message?: string) {
	if (actual !== expected) {
		throw new Error(
			message || `Expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`,
		);
	}
}

async function main() {
	console.log("\n🚀 CosmosQL Integration Test Suite\n");
	console.log("=".repeat(60));
	console.log(`Database: ${databaseName}`);
	console.log(`Container: ${testContainerName}`);
	console.log(`${"=".repeat(60)}\n`);

	let azureClient: AzureCosmosClient;
	let cosmosqlDb: Awaited<ReturnType<ReturnType<typeof createClient>["withContainers"]>>;

	// ========================================
	// SETUP
	// ========================================
	console.log("\n📋 SETUP\n");

	await test("Initialize Azure SDK client", async () => {
		const parts = connectionString!.split(";");
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
	});

	await test("Ensure test database exists", async () => {
		try {
			await azureClient.database(databaseName).read();
		} catch (error: any) {
			if (error.code === 404) {
				await azureClient.databases.create({ id: databaseName });
			} else {
				throw error;
			}
		}
	});

	await test("Clean up old test container if exists", async () => {
		try {
			await azureClient.database(databaseName).container(testContainerName).delete();
			// Wait a bit for deletion to propagate
			await new Promise((resolve) => setTimeout(resolve, 1000));
		} catch (error: any) {
			// Ignore if doesn't exist
			if (error.code !== 404) {
				throw error;
			}
		}
	});

	await test("Initialize CosmosQL client with auto-create mode", async () => {
		const baseClient = createClient({
			connectionString: connectionString!,
			database: databaseName,
			mode: "auto-create",
		});

		cosmosqlDb = (await baseClient.withContainers({
			testItems: testSchema,
		})) as any;

		assert(cosmosqlDb !== null, "CosmosQL client should be initialized");
	});

	// ========================================
	// DATABASE OPERATIONS
	// ========================================
	console.log("\n📊 DATABASE OPERATIONS\n");

	await test("CosmosQL: Check database exists", async () => {
		const client = (cosmosqlDb.testItems as any).findOps.client;
		const exists = await client.databaseExists();
		assert(exists === true, "Database should exist");
	});

	await test("Azure SDK: Verify database exists", async () => {
		const { resource } = await azureClient.database(databaseName).read();
		assert(resource?.id === databaseName, "Database ID should match");
	});

	// ========================================
	// CONTAINER OPERATIONS
	// ========================================
	console.log("\n📦 CONTAINER OPERATIONS\n");

	await test("CosmosQL: List containers", async () => {
		const client = (cosmosqlDb.testItems as any).findOps.client;
		const containers = await client.listContainers();
		assert(Array.isArray(containers), "Should return array of containers");
		assert(
			containers.some((c) => c.id === testContainerName),
			"Should include test container",
		);
	});

	await test("Azure SDK: List containers", async () => {
		const { resources } = await azureClient.database(databaseName).containers.readAll().fetchAll();
		assert(Array.isArray(resources), "Should return array of containers");
		assert(
			resources.some((c) => c.id === testContainerName),
			"Should include test container",
		);
	});

	await test("CosmosQL: Check container exists", async () => {
		const client = (cosmosqlDb.testItems as any).findOps.client;
		const exists = await client.containerExists(testContainerName);
		assert(exists === true, "Container should exist");
	});

	await test("CosmosQL: Get container details", async () => {
		const client = (cosmosqlDb.testItems as any).findOps.client;
		const container = await client.getContainer(testContainerName);
		assert(container !== null, "Container should be returned");
		assert(container!.id === testContainerName, "Container ID should match");
		assert(container!.partitionKey !== undefined, "Should have partition key info");
	});

	// ========================================
	// CREATE OPERATIONS
	// ========================================
	console.log("\n➕ CREATE OPERATIONS\n");

	const testItem1 = {
		id: "test-item-1",
		partitionKey: "partition-1",
		name: "Test Item 1",
		value: 42,
		tags: ["test", "integration"],
		metadata: {
			created: new Date().toISOString(),
		},
		isActive: true,
	};

	const testItem2 = {
		id: "test-item-2",
		partitionKey: "partition-1",
		name: "Test Item 2",
		value: 100,
		isActive: false,
	};

	const testItem3 = {
		id: "test-item-3",
		partitionKey: "partition-2",
		name: "Test Item 3",
		value: 75,
		isActive: true,
	};

	await test("CosmosQL: Create item with all fields", async () => {
		const result = await cosmosqlDb.testItems.create({
			data: testItem1,
		});

		assert(result !== null, "Should return created item");
		assertEqual(result.id, testItem1.id);
		assertEqual(result.name, testItem1.name);
		assertEqual(result.value, testItem1.value);
		assert(Array.isArray(result.tags), "Tags should be an array");
	});

	await test("CosmosQL: Create item with minimal fields", async () => {
		const result = await cosmosqlDb.testItems.create({
			data: testItem2,
		});

		assert(result !== null, "Should return created item");
		assertEqual(result.id, testItem2.id);
		assertEqual(result.value, testItem2.value);
	});

	await test("CosmosQL: Create item in different partition", async () => {
		const result = await cosmosqlDb.testItems.create({
			data: testItem3,
		});

		assert(result !== null, "Should return created item");
		assertEqual(result.partitionKey, "partition-2");
	});

	await test("Azure SDK: Verify item was created", async () => {
		const { resource } = await azureClient
			.database(databaseName)
			.container(testContainerName)
			.item(testItem1.id, testItem1.partitionKey)
			.read();

		assert(resource !== undefined, "Item should exist");
		assertEqual(resource!.id, testItem1.id);
	});

	// ========================================
	// READ OPERATIONS
	// ========================================
	console.log("\n📖 READ OPERATIONS\n");

	await test("CosmosQL: Find unique item", async () => {
		const result = await cosmosqlDb.testItems.findUnique({
			where: {
				id: testItem1.id,
				partitionKey: testItem1.partitionKey,
			},
		});

		assert(result !== null, "Should find the item");
		assertEqual(result!.id, testItem1.id);
		assertEqual(result!.name, testItem1.name);
	});

	await test("CosmosQL: Find unique returns null for non-existent", async () => {
		const result = await cosmosqlDb.testItems.findUnique({
			where: {
				id: "non-existent",
				partitionKey: "partition-1",
			},
		});

		assert(result === null, "Should return null for non-existent item");
	});

	await test("CosmosQL: Find many in partition", async () => {
		const results = await cosmosqlDb.testItems.findMany({
			partitionKey: "partition-1",
		});

		assert(Array.isArray(results), "Should return array");
		assert(results.length >= 2, "Should have at least 2 items");
		assert(
			results.every((r) => r.partitionKey === "partition-1"),
			"All items should be in partition-1",
		);
	});

	await test("CosmosQL: Find many with where filter", async () => {
		const results = await cosmosqlDb.testItems.findMany({
			partitionKey: "partition-1",
			where: {
				isActive: true,
			},
		});

		assert(Array.isArray(results), "Should return array");
		assert(
			results.every((r) => r.isActive === true),
			"All items should be active",
		);
	});

	await test("CosmosQL: Find many with value comparison", async () => {
		const results = await cosmosqlDb.testItems.findMany({
			partitionKey: "partition-1",
			where: {
				value: { gte: 50 },
			},
		});

		assert(Array.isArray(results), "Should return array");
		assert(
			results.length > 0 && results.every((r) => (r.value as number) >= 50),
			"All items should have value >= 50",
		);
	});

	await test("CosmosQL: Find many with orderBy", async () => {
		const results = await cosmosqlDb.testItems.findMany({
			partitionKey: "partition-1",
			orderBy: {
				value: "desc",
			},
		});

		assert(results.length >= 2, "Should have items");
		assert(
			(results[0].value as number) >= (results[1].value as number),
			"Should be ordered by value descending",
		);
	});

	await test("CosmosQL: Find many with limit", async () => {
		const results = await cosmosqlDb.testItems.findMany({
			partitionKey: "partition-1",
			take: 1,
		});

		assertEqual(results.length, 1, "Should return exactly 1 item");
	});

	await test("CosmosQL: Find many with select", async () => {
		const results = await cosmosqlDb.testItems.findMany({
			partitionKey: "partition-1",
			select: {
				id: true,
				name: true,
			},
		});

		assert(results.length > 0, "Should have results");
		assert(results[0].id !== undefined, "Should have id");
		assert(results[0].name !== undefined, "Should have name");
		// Note: Cosmos DB always returns _rid, _self, etc., so we can't test that value is undefined
	});

	// ========================================
	// UPDATE OPERATIONS
	// ========================================
	console.log("\n✏️  UPDATE OPERATIONS\n");

	await test("CosmosQL: Update item", async () => {
		const result = await cosmosqlDb.testItems.update({
			where: {
				id: testItem1.id,
				partitionKey: testItem1.partitionKey,
			},
			data: {
				value: 999,
				"metadata.updated": new Date().toISOString(),
			},
		});

		assert(result !== null, "Should return updated item");
		assertEqual(result!.value, 999);
		assert(result!.metadata?.updated !== undefined, "Should have updated timestamp");
	});

	await test("Azure SDK: Verify update", async () => {
		const { resource } = await azureClient
			.database(databaseName)
			.container(testContainerName)
			.item(testItem1.id, testItem1.partitionKey)
			.read();

		assertEqual(resource!.value, 999, "Value should be updated");
	});

	await test("CosmosQL: Upsert creates new item", async () => {
		const newItem = {
			id: "upsert-new",
			partitionKey: "partition-1",
			name: "Upserted Item",
			value: 500,
		};

		const result = await cosmosqlDb.testItems.upsert({
			data: newItem,
		});

		assert(result !== null, "Should return upserted item");
		assertEqual(result.id, newItem.id);
	});

	await test("CosmosQL: Upsert updates existing item", async () => {
		const result = await cosmosqlDb.testItems.upsert({
			data: {
				id: "upsert-new",
				partitionKey: "partition-1",
				name: "Updated Upsert",
				value: 600,
			},
		});

		assert(result !== null, "Should return updated item");
		assertEqual(result.value, 600);
		assertEqual(result.name, "Updated Upsert");
	});

	// ========================================
	// DELETE OPERATIONS
	// ========================================
	console.log("\n🗑️  DELETE OPERATIONS\n");

	await test("CosmosQL: Delete item", async () => {
		await cosmosqlDb.testItems.delete({
			where: {
				id: testItem2.id,
				partitionKey: testItem2.partitionKey,
			},
		});

		// Verify it's deleted - give it a moment for consistency
		await new Promise((resolve) => setTimeout(resolve, 500));

		const result = await cosmosqlDb.testItems.findUnique({
			where: {
				id: testItem2.id,
				partitionKey: testItem2.partitionKey,
			},
		});

		assert(result === null, "Item should be deleted");
	});

	// ========================================
	// QUERY OPERATIONS
	// ========================================
	console.log("\n🔍 QUERY OPERATIONS\n");

	await test("CosmosQL: Complex query with multiple conditions", async () => {
		const results = await cosmosqlDb.testItems.findMany({
			partitionKey: "partition-1",
			where: {
				value: { gte: 50, lte: 1000 },
				isActive: true,
			},
		});

		assert(Array.isArray(results), "Should return array");
		assert(
			results.length > 0 &&
				results.every(
					(r) => (r.value as number) >= 50 && (r.value as number) <= 1000 && r.isActive,
				),
			"All items should match conditions",
		);
	});

	await test("CosmosQL: Query with string contains", async () => {
		const results = await cosmosqlDb.testItems.findMany({
			partitionKey: "partition-1",
			where: {
				name: { contains: "Test" },
			},
		});

		assert(results.length > 0, "Should find items");
		assert(
			results.every((r) => (r.name as string).includes("Test")),
			"All names should contain 'Test'",
		);
	});

	await test("CosmosQL: Cross-partition query", async () => {
		const results = await cosmosqlDb.testItems.findMany({
			where: {
				isActive: true,
			},
			enableCrossPartitionQuery: true,
		});

		assert(Array.isArray(results), "Should return array");
		assert(results.length >= 2, "Should find items across partitions");
	});

	// ========================================
	// COMPARISON WITH AZURE SDK
	// ========================================
	console.log("\n⚖️  AZURE SDK COMPARISON\n");

	await test("CosmosQL vs Azure SDK: Same item count", async () => {
		const cosmosqlResults = await cosmosqlDb.testItems.findMany({
			partitionKey: "partition-1",
		});

		const { resources: azureResults } = await azureClient
			.database(databaseName)
			.container(testContainerName)
			.items.query({
				query: "SELECT * FROM c WHERE c.partitionKey = @pk",
				parameters: [{ name: "@pk", value: "partition-1" }],
			})
			.fetchAll();

		assertEqual(cosmosqlResults.length, azureResults.length, "Should return same number of items");
	});

	await test("CosmosQL vs Azure SDK: Same data", async () => {
		const cosmosqlResult = await cosmosqlDb.testItems.findUnique({
			where: {
				id: testItem1.id,
				partitionKey: testItem1.partitionKey,
			},
		});

		const { resource: azureResult } = await azureClient
			.database(databaseName)
			.container(testContainerName)
			.item(testItem1.id, testItem1.partitionKey)
			.read();

		assertEqual(cosmosqlResult!.id, azureResult!.id);
		assertEqual(cosmosqlResult!.name, azureResult!.name);
		assertEqual(cosmosqlResult!.value, azureResult!.value);
	});

	// ========================================
	// CLEANUP
	// ========================================
	console.log("\n🧹 CLEANUP\n");

	await test("Delete all test items", async () => {
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

		// Verify all deleted
		const remaining = await cosmosqlDb.testItems.findMany({
			enableCrossPartitionQuery: true,
		});

		assertEqual(remaining.length, 0, "All items should be deleted");
	});

	await test("Delete test container", async () => {
		await azureClient.database(databaseName).container(testContainerName).delete();
	});

	// ========================================
	// SUMMARY
	// ========================================
	console.log(`\n${"=".repeat(60)}`);
	console.log("📊 TEST SUMMARY");
	console.log(`${"=".repeat(60)}\n`);

	const passed = results.filter((r) => r.passed).length;
	const failed = results.filter((r) => r.passed === false).length;
	const total = results.length;
	const passRate = ((passed / total) * 100).toFixed(1);

	console.log(`Total Tests: ${total}`);
	console.log(`✅ Passed: ${passed}`);
	console.log(`❌ Failed: ${failed}`);
	console.log(`📈 Pass Rate: ${passRate}%`);

	const totalDuration = results.reduce((sum, r) => sum + (r.duration || 0), 0);
	console.log(`⏱️  Total Duration: ${totalDuration}ms`);

	if (failed > 0) {
		console.log("\n❌ FAILED TESTS:\n");
		results
			.filter((r) => !r.passed)
			.forEach((r) => {
				console.log(`  • ${r.name}`);
				console.log(`    ${r.error}`);
			});
	}

	console.log(`\n${"=".repeat(60)}\n`);

	// Exit with appropriate code
	process.exit(failed > 0 ? 1 : 0);
}

// Run the tests
main().catch((error) => {
	console.error("\n💥 Fatal Error:", error.message);
	console.error(error.stack);
	process.exit(1);
});
