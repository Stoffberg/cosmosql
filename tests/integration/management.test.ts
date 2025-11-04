import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { container, createClient, field } from "../../src";

const TEST_DB = `management-test-${Date.now()}`;

// Define test schemas
const registeredContainer = container("registered", {
	id: field.string(),
	email: field.string(),
	name: field.string(),
}).partitionKey("email");

const anotherContainer = container("another", {
	id: field.string(),
	value: field.string(),
}).partitionKey("value");

describe("Management Integration Tests", () => {
	let db: any;

	beforeAll(async () => {
		if (!process.env.COSMOS_CONNECTION_STRING) {
			throw new Error("COSMOS_CONNECTION_STRING environment variable is required");
		}

		db = await createClient({
			connectionString: process.env.COSMOS_CONNECTION_STRING,
			database: TEST_DB,
			mode: "auto-create",
		}).withContainers({
			registeredContainer,
			anotherContainer,
		});

		// Seed some data
		await db.registeredContainer.create({
			data: { id: "test-1", email: "test@example.com", name: "Test" },
		});

		await db.anotherContainer.create({
			data: { id: "test-2", value: "value1" },
		});

		// Wait for data to be available
		await new Promise((resolve) => setTimeout(resolve, 1000));
	}, 60000);

	afterAll(async () => {
		// Cleanup handled by existing tests
	}, 30000);

	test("should get database info", async () => {
		if (!process.env.COSMOS_CONNECTION_STRING) {
			return;
		}

		const info = await db.management.getDatabaseInfo();

		expect(info.id).toBe(TEST_DB);
		expect(info.containersCount).toBeGreaterThanOrEqual(2);
		expect(info.containers).toBeInstanceOf(Array);
		expect(info.storage).toHaveProperty("totalDocuments");
		expect(info.storage).toHaveProperty("totalSizeGB");
	}, 30000);

	test("should perform health check", async () => {
		if (!process.env.COSMOS_CONNECTION_STRING) {
			return;
		}

		const health = await db.management.healthCheck();

		expect(health.database).toBe(TEST_DB);
		expect(health.overallHealth).toMatch(/healthy|warning|critical/);
		expect(health.timestamp).toBeInstanceOf(Date);
		expect(health.containers).toBeInstanceOf(Array);
		expect(health.recommendations).toBeInstanceOf(Array);
		expect(health.costAnalysis).toHaveProperty("currentMonthlyEstimate");
	}, 30000);

	test("should compare schema with database", async () => {
		if (!process.env.COSMOS_CONNECTION_STRING) {
			return;
		}

		const diff = await db.management.diffSchema();

		expect(diff.database).toBe(TEST_DB);
		expect(diff.timestamp).toBeInstanceOf(Date);
		expect(diff.containers).toHaveProperty("registered");
		expect(diff.containers).toHaveProperty("actual");
		expect(diff.containers).toHaveProperty("orphaned");
		expect(diff.containers).toHaveProperty("missing");
		expect(diff.containers).toHaveProperty("modified");
		expect(typeof diff.requiresAction).toBe("boolean");
	}, 30000);
});

