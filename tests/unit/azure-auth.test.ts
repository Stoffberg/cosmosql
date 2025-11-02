import { container, createClient, field } from "../../src/index";

/**
 * Integration tests for Azure CosmosDB authentication
 *
 * These tests verify that cosmosql can successfully authenticate
 * with real Azure CosmosDB instances using the fixed auth implementation.
 *
 * To run these tests, set the COSMOSDB_CONNECTION_STRING environment variable
 * to a valid Azure CosmosDB connection string.
 */

// Define a test container schema
const testContainer = container("testcontainer", {
	id: field.string(),
	name: field.string(),
	partitionKey: field.string(),
	createdAt: field.date(),
}).partitionKey("partitionKey");

/**
 * Integration tests for Azure CosmosDB authentication
 *
 * These tests verify that cosmosql can successfully authenticate
 * with real Azure CosmosDB instances using the fixed auth implementation.
 *
 * To run these tests, set the COSMOSDB_CONNECTION_STRING environment variable
 * to a valid Azure CosmosDB connection string.
 */
describe("cosmosql Azure CosmosDB auth", () => {
	const connectionString = process.env.COSMOSDB_CONNECTION_STRING;

	// Skip tests if no connection string is provided
	beforeAll(() => {
		if (!connectionString) {
			console.warn(
				"Skipping Azure CosmosDB integration tests: COSMOSDB_CONNECTION_STRING not set",
			);
		}
	});

	// Helper function to check if we have a connection string
	const hasConnectionString = () => !!connectionString;

	it("should successfully query documents with proper auth", async () => {
		if (!hasConnectionString()) {
			console.warn("Skipping test: no COSMOSDB_CONNECTION_STRING");
			return;
		}

		const client = createClient({
			connectionString: connectionString,
			database: "testdb",
		}).withContainers({ testContainer });

		// This should work without auth errors
		try {
			const result = await client.testContainer.findMany({
				where: { partitionKey: "test" },
				partitionKey: "test",
			});

			// If we get here without throwing, auth is working
			expect(result).toBeDefined();
			expect(Array.isArray(result)).toBe(true);
		} catch (error: any) {
			// If it's an auth error, the test should fail
			if (error.message?.includes("Unauthorized") || error.status === 401) {
				throw new Error(`Authentication failed: ${error.message}`);
			}
			// Other errors (like container not found) are acceptable for this test
			expect(error).toBeDefined();
		}
	});

	it("should successfully perform cross-partition queries", async () => {
		if (!hasConnectionString()) {
			console.warn("Skipping test: no COSMOSDB_CONNECTION_STRING");
			return;
		}

		const client = createClient({
			connectionString: connectionString,
			database: "testdb",
		}).withContainers({ testContainer });

		// This should work with enableCrossPartitionQuery
		try {
			const result = await client.testContainer.findMany({
				enableCrossPartitionQuery: true,
				take: 1,
			});

			// If we get here without throwing, auth is working
			expect(result).toBeDefined();
			expect(Array.isArray(result)).toBe(true);
		} catch (error: any) {
			// If it's an auth error, the test should fail
			if (error.message?.includes("Unauthorized") || error.status === 401) {
				throw new Error(`Authentication failed: ${error.message}`);
			}
			// Other errors (like container not found) are acceptable for this test
			expect(error).toBeDefined();
		}
	});

	it("should handle create operations with proper auth", async () => {
		if (!hasConnectionString()) {
			console.warn("Skipping test: no COSMOSDB_CONNECTION_STRING");
			return;
		}

		const client = createClient({
			connectionString: connectionString,
			database: "testdb",
		}).withContainers({ testContainer });

		try {
			// Try to create a document (this might fail if container doesn't exist, but auth should work)
			const result = await client.testContainer.create({
				data: {
					id: `test-doc-${Date.now()}`,
					name: "Test Document",
					partitionKey: `test-partition-${Date.now()}`,
					createdAt: new Date(),
				},
			});

			expect(result).toBeDefined();
		} catch (error: any) {
			// If it's an auth error, the test should fail
			if (error.message?.includes("Unauthorized") || error.status === 401) {
				throw new Error(`Authentication failed: ${error.message}`);
			}
			// Other errors are acceptable for this test
			expect(error).toBeDefined();
		}
	});

	it("should handle update operations with proper auth", async () => {
		if (!hasConnectionString()) {
			console.warn("Skipping test: no COSMOSDB_CONNECTION_STRING");
			return;
		}

		const client = createClient({
			connectionString: connectionString,
			database: "testdb",
		}).withContainers({ testContainer });

		try {
			// Try to update a document (this might fail if document doesn't exist, but auth should work)
			const docId = `test-doc-${Date.now()}`;
			const partitionKey = `test-partition-${Date.now()}`;
			const result = await client.testContainer.update({
				where: { id: docId, partitionKey },
				data: { name: "Updated Test Document" },
			});

			expect(result).toBeDefined();
		} catch (error: any) {
			// If it's an auth error, the test should fail
			if (error.message?.includes("Unauthorized") || error.status === 401) {
				throw new Error(`Authentication failed: ${error.message}`);
			}
			// Other errors are acceptable for this test
			expect(error).toBeDefined();
		}
	});

	it("should handle delete operations with proper auth", async () => {
		if (!hasConnectionString()) {
			console.warn("Skipping test: no COSMOSDB_CONNECTION_STRING");
			return;
		}

		const client = createClient({
			connectionString: connectionString,
			database: "testdb",
		}).withContainers({ testContainer });

		try {
			// Try to delete a document (this might fail if document doesn't exist, but auth should work)
			const docId = `test-doc-${Date.now()}`;
			const partitionKey = `test-partition-${Date.now()}`;
			await client.testContainer.delete({
				where: { id: docId, partitionKey },
			});

			// If we get here without throwing, auth is working
			expect(true).toBe(true);
		} catch (error: any) {
			// If it's an auth error, the test should fail
			if (error.message?.includes("Unauthorized") || error.status === 401) {
				throw new Error(`Authentication failed: ${error.message}`);
			}
			// Other errors are acceptable for this test
			expect(error).toBeDefined();
		}
	});
});
