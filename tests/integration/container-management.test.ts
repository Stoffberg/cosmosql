/**
 * Container Management Integration Test Suite for CosmosQL
 *
 * Run with: bun test tests/integration/container-management.test.ts
 *
 * Tests container and database management operations.
 */

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { CosmosClient as AzureCosmosClient } from "@azure/cosmos";
import { createClient } from "../../src";
import { CosmosClient } from "../../src/client/cosmos-client";
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
const testContainerName = "testItems-mgmt"; // Unique name for this test file

// Test schema (not used in this test file)
const _testSchema = container(testContainerName, {
	id: field.string(),
	partitionKey: field.string(),
}).partitionKey("partitionKey");

describe("CosmosQL Container Management Integration Tests", () => {
	let azureClient: AzureCosmosClient;
	let _cosmosqlClient: ReturnType<typeof createClient>;
	let cosmosClient: any; // Direct CosmosClient instance

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

		// Initialize CosmosQL client
		_cosmosqlClient = createClient({
			connectionString: connectionString,
			database: databaseName,
			mode: "auto-create",
		});

		// Create direct CosmosClient instance for management operations
		cosmosClient = new CosmosClient({
			endpoint: config.AccountEndpoint,
			key: config.AccountKey,
			database: databaseName,
		});
	});

	afterAll(async () => {
		// Cleanup: Delete test container if it exists
		try {
			await azureClient.database(databaseName).container(testContainerName).delete();
		} catch (_error) {
			// Ignore cleanup errors
		}
	});

	describe("Database Operations", () => {
		test("CosmosQL: Check database exists", async () => {
			const exists = await withRateLimitRetry(() => cosmosClient.databaseExists());
			expect(exists).toBe(true);
		});
	});

	describe("Container Operations", () => {
		test("CosmosQL: List containers", async () => {
			const containers = await withRateLimitRetry(() => cosmosClient.listContainers());
			expect(Array.isArray(containers)).toBe(true);
			expect((containers as any[]).length).toBeGreaterThanOrEqual(0);
		});
	});

	describe("Container Auto-Creation", () => {
		test("Container auto-create mode works", async () => {
			const autoCreateContainerName = `auto-create-test-${Date.now()}`;

			// Clean up if exists
			try {
				await azureClient.database(databaseName).container(autoCreateContainerName).delete();
				await delay(2000);
			} catch (error: any) {
				if (error.code !== 404) throw error;
			}

			const autoCreateSchema = container(autoCreateContainerName, {
				id: field.string(),
				partitionKey: field.string(),
			}).partitionKey("partitionKey");

			const clientAutoCreate = createClient({
				connectionString: connectionString!,
				database: databaseName,
				mode: "auto-create",
			});

			const autoCreateDb = await clientAutoCreate.withContainers({
				[autoCreateContainerName]: autoCreateSchema,
			});

			// Test using CosmosQL API - container should be created and accessible
			const client = (autoCreateDb[autoCreateContainerName] as any).findOps.client;
			const exists = await withRateLimitRetry(() =>
				client.containerExists(autoCreateContainerName),
			);
			expect(exists).toBe(true);

			const containerInfo = await withRateLimitRetry(() =>
				client.getContainer(autoCreateContainerName),
			);
			expect(containerInfo).not.toBeNull();
			expect((containerInfo as any).id).toBe(autoCreateContainerName);

			// Cleanup
			try {
				await azureClient.database(databaseName).container(autoCreateContainerName).delete();
			} catch {
				// Ignore cleanup errors
			}
		});
	});

	describe("Container Modes", () => {
		test("Container verify mode throws when container missing", async () => {
			const verifyContainerName = `verify-test-${Date.now()}`;

			// Ensure it doesn't exist
			try {
				await azureClient.database(databaseName).container(verifyContainerName).delete();
				await delay(2000);
			} catch (error: any) {
				if (error.code !== 404) throw error;
			}

			const verifySchema = container(verifyContainerName, {
				id: field.string(),
				partitionKey: field.string(),
			}).partitionKey("partitionKey");

			const clientVerify = createClient({
				connectionString: connectionString!,
				database: databaseName,
				mode: "verify",
			});

			await expect(
				clientVerify.withContainers({
					[verifyContainerName]: verifySchema,
				}),
			).rejects.toThrow();
		});

		test("Container skip mode works without checks", async () => {
			const skipContainerName = `skip-test-${Date.now()}`;

			const skipSchema = container(skipContainerName, {
				id: field.string(),
				partitionKey: field.string(),
			}).partitionKey("partitionKey");

			const clientSkip = createClient({
				connectionString: connectionString!,
				database: databaseName,
				mode: "skip",
			});

			// Should not throw even if container doesn't exist
			const skipDb = await clientSkip.withContainers({
				[skipContainerName]: skipSchema,
			});

			expect(skipDb).not.toBeNull();
			expect(skipDb[skipContainerName]).toBeDefined();

			// Cleanup if container was created
			try {
				await azureClient.database(databaseName).container(skipContainerName).delete();
			} catch {
				// Ignore cleanup errors
			}
		});
	});
});
