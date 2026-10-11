import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { container, createClient, defineMigration, field } from "../../src";

const TEST_DB = `migrations-test-${Date.now()}`;

// Define test schema
const testContainer = container("migration-test", {
	id: field.string(),
	email: field.string(),
	name: field.string(),
	status: field.string().optional(),
	version: field.number().optional(),
}).partitionKey("email");

// Define test migrations
const migration1 = defineMigration({
	version: 1,
	name: "add-status-field",
	description: "Add status field to all documents",
	async up({ db }) {
		await db.testContainer.updateMany({
			where: {},
			data: { status: "active" },
			enableCrossPartitionQuery: true,
		});
	},
	async down({ db }) {
		await db.testContainer.updateMany({
			where: {},
			data: { status: undefined },
			enableCrossPartitionQuery: true,
		});
	},
});

const migration2 = defineMigration({
	version: 2,
	name: "add-version-field",
	description: "Add version field to all documents",
	async up({ db }) {
		await db.testContainer.updateMany({
			where: {},
			data: { version: 1 },
			enableCrossPartitionQuery: true,
		});
	},
});

describe("Migrations Integration Tests", () => {
	let db: any;

	beforeAll(async () => {
		if (!process.env.COSMOS_CONNECTION_STRING) {
			throw new Error("COSMOS_CONNECTION_STRING environment variable is required for integration tests");
		}

		db = await createClient({
			connectionString: process.env.COSMOS_CONNECTION_STRING,
			database: TEST_DB,
			mode: "auto-create",
			migrations: [migration1, migration2],
		}).withContainers({
			testContainer,
		});

		// Seed test data
		await db.testContainer.create({
			data: {
				id: "test-1",
				email: "test@example.com",
				name: "Test User",
			},
		});

		// Wait a bit for data to be available
		await new Promise((resolve) => setTimeout(resolve, 1000));
	}, 60000);

	afterAll(async () => {
		// Cleanup not implemented yet
	}, 30000);

	test("should get migration status", async () => {
		if (!process.env.COSMOS_CONNECTION_STRING) {
			return;
		}

		const status = await db.migrations.status();

		expect(status).toHaveProperty("current");
		expect(status).toHaveProperty("applied");
		expect(status).toHaveProperty("pending");
		expect(status).toHaveProperty("canRollback");
		expect(Array.isArray(status.applied)).toBe(true);
		expect(Array.isArray(status.pending)).toBe(true);
	}, 30000);

	test("should create migration plan", async () => {
		if (!process.env.COSMOS_CONNECTION_STRING) {
			return;
		}

		const plan = await db.migrations.plan();

		expect(plan).toHaveProperty("migrationsToApply");
		expect(plan).toHaveProperty("totalEstimatedRU");
		expect(plan).toHaveProperty("totalEstimatedDuration");
		expect(plan).toHaveProperty("warnings");
		expect(Array.isArray(plan.migrationsToApply)).toBe(true);
	}, 30000);
});

