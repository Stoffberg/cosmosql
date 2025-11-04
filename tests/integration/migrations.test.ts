import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { container, createClient, defineMigration, field } from "../../src";

const TEST_DB = `migrations-test-${Date.now()}`;

// Define test schema
const testData = container("migration-test-data", {
	id: field.string(),
	email: field.string(),
	name: field.string(),
	version: field.number().optional(),
	newField: field.string().optional(),
}).partitionKey("email");

// Define test migrations
const migration1 = defineMigration({
	version: 1,
	name: "add-version-field",
	description: "Add version field to all documents",

	async up({ db, logger }) {
		logger.info("Adding version field...");
		const result = await db.testData.updateMany({
			where: {},
			data: { version: 1 },
			enableCrossPartitionQuery: true,
		});
		logger.info(`Updated ${result.updated} documents`);
	},

	async down({ db }) {
		await db.testData.updateMany({
			where: {},
			data: { version: undefined },
			enableCrossPartitionQuery: true,
		});
	},
});

const migration2 = defineMigration({
	version: 2,
	name: "add-new-field",
	description: "Add newField to all documents",

	async up({ db }) {
		await db.testData.updateMany({
			where: {},
			data: { newField: "default" },
			enableCrossPartitionQuery: true,
		});
	},

	async down({ db }) {
		await db.testData.updateMany({
			where: {},
			data: { newField: undefined },
			enableCrossPartitionQuery: true,
		});
	},
});

const migration3 = defineMigration({
	version: 3,
	name: "update-version",
	description: "Update version to 2",

	async up({ db }) {
		await db.testData.updateMany({
			where: { version: 1 },
			data: { version: 2 },
			enableCrossPartitionQuery: true,
		});
	},

	async down({ db }) {
		await db.testData.updateMany({
			where: { version: 2 },
			data: { version: 1 },
			enableCrossPartitionQuery: true,
		});
	},
});

describe("Migrations Integration Tests", () => {
	let db: any;

	beforeAll(async () => {
		if (!process.env.COSMOS_CONNECTION_STRING) {
			throw new Error("COSMOS_CONNECTION_STRING environment variable is required");
		}

		db = await createClient({
			connectionString: process.env.COSMOS_CONNECTION_STRING,
			database: TEST_DB,
			mode: "auto-create",
			migrations: [migration1, migration2, migration3],
		}).withContainers({
			testData,
		});

		// Seed test data
		const testDocs = [
			{ id: "doc-1", email: "test1@example.com", name: "Test 1" },
			{ id: "doc-2", email: "test2@example.com", name: "Test 2" },
			{ id: "doc-3", email: "test3@example.com", name: "Test 3" },
		];

		for (const doc of testDocs) {
			await db.testData.create({ data: doc });
		}
	}, 60000);

	afterAll(async () => {
		// Cleanup handled by existing tests
	}, 30000);

	describe("Migration Status", () => {
		test("should show initial status with no migrations applied", async () => {
			if (!db.migrations) {
				throw new Error("Migrations not available");
			}

			const status = await db.migrations.status();

			expect(status.current).toBeNull();
			expect(status.applied).toHaveLength(0);
			expect(status.pending).toHaveLength(3);
			expect(status.canRollback).toBe(false);
		});

		test("should list pending migrations", async () => {
			if (!db.migrations) throw new Error("Migrations not available");

			const status = await db.migrations.status();
			const pending = status.pending;

			expect(pending).toHaveLength(3);
			expect(pending[0].version).toBe(1);
			expect(pending[0].name).toBe("add-version-field");
			expect(pending[1].version).toBe(2);
			expect(pending[2].version).toBe(3);
		});
	});

	describe("Migration Planning", () => {
		test("should create a plan for pending migrations", async () => {
			if (!db.migrations) throw new Error("Migrations not available");

			const plan = await db.migrations.plan({ dryRun: true });

			expect(plan.migrationsToApply).toHaveLength(3);
			expect(plan.totalEstimatedRU).toBeGreaterThan(0);
			expect(plan.totalEstimatedDuration).toBeDefined();
			expect(Array.isArray(plan.warnings)).toBe(true);
		});

		test("should plan to specific version", async () => {
			if (!db.migrations) throw new Error("Migrations not available");

			const plan = await db.migrations.plan({ target: 2, dryRun: true });

			expect(plan.migrationsToApply).toHaveLength(2);
			expect(plan.migrationsToApply.map(m => m.version)).toEqual([1, 2]);
		});
	});

	describe("Applying Migrations", () => {
		test("should require confirmation or dryRun", async () => {
			if (!db.migrations) throw new Error("Migrations not available");

			await expect(
				db.migrations.apply({ confirm: false, dryRun: false }),
			).rejects.toThrow("Must set confirm: true or dryRun: true");
		});

		test("should perform dry run without applying", async () => {
			if (!db.migrations) throw new Error("Migrations not available");

			const result = await db.migrations.apply({ dryRun: true });

			expect(result.success).toBe(true);

			// Verify nothing was actually applied
			const status = await db.migrations.status();
			expect(status.current).toBeNull();
		});

		test("should apply migrations with confirmation", async () => {
			if (!db.migrations) throw new Error("Migrations not available");

			const progressUpdates: any[] = [];

			const result = await db.migrations.apply({
				confirm: true,
				target: "latest",
				onProgress: (p) => {
					progressUpdates.push(p);
				},
			});

			expect(result.success).toBe(true);
			expect(result.applied).toHaveLength(3);
			expect(result.performance.totalRuConsumed).toBeGreaterThan(0);
			expect(result.performance.totalDurationMs).toBeGreaterThan(0);
			expect(progressUpdates.length).toBeGreaterThan(0);

			// Verify migrations were applied
			const status = await db.migrations.status();
			expect(status.current).not.toBeNull();
			expect(status.current?.version).toBe(3);
			expect(status.applied).toHaveLength(3);
			expect(status.pending).toHaveLength(0);
		});

		test("should verify migration effects", async () => {
			// Check that migration 1 added version field
			const docs = await db.testData.findMany({
				enableCrossPartitionQuery: true,
			});

			expect(docs.every((d: any) => d.version === 2)).toBe(true);
			expect(docs.every((d: any) => d.newField === "default")).toBe(true);
		});

		test("should handle already applied migrations", async () => {
			if (!db.migrations) throw new Error("Migrations not available");

			const result = await db.migrations.apply({ confirm: true });

			expect(result.success).toBe(true);
			expect(result.applied).toHaveLength(0); // No new migrations to apply
		});
	});

	describe("Rolling Back", () => {
		test("should require confirmation", async () => {
			if (!db.migrations) throw new Error("Migrations not available");

			await expect(
				db.migrations.rollback({ to: 0, confirm: false }),
			).rejects.toThrow("Must set confirm: true");
		});

		test("should rollback to specific version", async () => {
			if (!db.migrations) throw new Error("Migrations not available");

			const result = await db.migrations.rollback({
				to: 1,
				confirm: true,
			});

			expect(result.success).toBe(true);
			expect(result.applied).toHaveLength(2); // Rolled back 2 migrations

			// Verify rollback
			const status = await db.migrations.status();
			expect(status.current?.version).toBe(1);
			expect(status.applied).toHaveLength(1);
			expect(status.pending).toHaveLength(2);
		});

		test("should verify rollback effects", async () => {
			// Check that rolled back migrations were undone
			const docs = await db.testData.findMany({
				enableCrossPartitionQuery: true,
			});

			// After rollback to v1, version should be 1 and newField should be undefined
			expect(docs.every((d: any) => d.version === 1)).toBe(true);
			expect(docs.every((d: any) => d.newField === undefined)).toBe(true);
		});

		test("should not allow rolling back beyond current version", async () => {
			if (!db.migrations) throw new Error("Migrations not available");

			await expect(
				db.migrations.rollback({ to: 5, confirm: true }),
			).rejects.toThrow("Cannot rollback to version");
		});
	});

	describe("Migration Tracking", () => {
		test("should track migration metadata", async () => {
			if (!db.migrations) throw new Error("Migrations not available");

			const status = await db.migrations.status();

			expect(status.applied.length).toBeGreaterThan(0);

			const applied = status.applied[0];
			expect(applied).toHaveProperty("version");
			expect(applied).toHaveProperty("name");
			expect(applied).toHaveProperty("appliedAt");
			expect(applied).toHaveProperty("ruConsumed");
			expect(applied).toHaveProperty("durationMs");
			expect(applied).toHaveProperty("checksum");
		});

		test("should enable rollback when down() exists", async () => {
			if (!db.migrations) throw new Error("Migrations not available");

			const status = await db.migrations.status();
			expect(status.canRollback).toBe(true);
		});
	});
});

