import { describe, expect, test, beforeEach, mock } from "bun:test";
import { defineMigration } from "../../src/migrations";
import { MigrationPlanner } from "../../src/migrations/planner";
import { MigrationTracker } from "../../src/migrations/storage";
import { MigrationRunner } from "../../src/migrations/runner";
import { MigrationClient } from "../../src/migrations/client";
import type { MigrationDefinition } from "../../src/migrations/types";

describe("defineMigration", () => {
	test("should validate migration version", () => {
		expect(() =>
			defineMigration({
				version: 0,
				name: "test-migration",
				up: async () => {},
			}),
		).toThrow("Migration version must be a positive integer");

		expect(() =>
			defineMigration({
				version: 1.5,
				name: "test-migration",
				up: async () => {},
			}),
		).toThrow("Migration version must be a positive integer");
	});

	test("should validate migration name", () => {
		expect(() =>
			defineMigration({
				version: 1,
				name: "",
				up: async () => {},
			}),
		).toThrow("Migration name must be lowercase alphanumeric with hyphens");

		expect(() =>
			defineMigration({
				version: 1,
				name: "Invalid Name",
				up: async () => {},
			}),
		).toThrow("Migration name must be lowercase alphanumeric with hyphens");

		expect(() =>
			defineMigration({
				version: 1,
				name: "invalid_name",
				up: async () => {},
			}),
		).toThrow("Migration name must be lowercase alphanumeric with hyphens");
	});

	test("should require up function", () => {
		expect(() =>
			defineMigration({
				version: 1,
				name: "test-migration",
			} as any),
		).toThrow("Migration must have an up() function");
	});

	test("should accept valid migration", () => {
		const migration = defineMigration({
			version: 1,
			name: "test-migration",
			description: "Test migration",
			up: async () => {},
			down: async () => {},
		});

		expect(migration.version).toBe(1);
		expect(migration.name).toBe("test-migration");
	});
});

describe("MigrationPlanner", () => {
	let planner: MigrationPlanner;

	beforeEach(() => {
		planner = new MigrationPlanner();
	});

	test("should create plan for empty migrations", async () => {
		const plan = await planner.createPlan([]);

		expect(plan.migrationsToApply).toEqual([]);
		expect(plan.totalEstimatedRU).toBe(0);
		expect(plan.warnings).toEqual([]);
	});

	test("should create plan for single migration", async () => {
		const migration: MigrationDefinition = {
			version: 1,
			name: "test-migration",
			up: async () => {},
		};

		const plan = await planner.createPlan([migration]);

		expect(plan.migrationsToApply).toHaveLength(1);
		expect(plan.migrationsToApply[0].version).toBe(1);
		expect(plan.totalEstimatedRU).toBeGreaterThan(0);
	});

	test("should warn about many migrations", async () => {
		const migrations: MigrationDefinition[] = Array.from({ length: 10 }, (_, i) => ({
			version: i + 1,
			name: `migration-${i + 1}`,
			up: async () => {},
		}));

		const plan = await planner.createPlan(migrations);

		expect(plan.warnings.some((w) => w.includes("migrations will be applied"))).toBe(true);
	});

	test("should warn about missing down functions", async () => {
		const migrations: MigrationDefinition[] = [
			{
				version: 1,
				name: "migration-1",
				up: async () => {},
				down: async () => {},
			},
			{
				version: 2,
				name: "migration-2",
				up: async () => {},
				// No down function
			},
		];

		const plan = await planner.createPlan(migrations);

		expect(plan.warnings.some((w) => w.includes("do not have down() methods"))).toBe(true);
	});
});

describe("MigrationClient", () => {
	function createMockClient() {
		return {
			getDatabase: () => "test-db",
			request: mock(() => Promise.resolve({ Documents: [] })),
			containerExists: mock(() => Promise.resolve(false)),
			createContainer: mock(() => Promise.resolve()),
		} as any;
	}

	test("should validate sequential versions", () => {
		const migrations: MigrationDefinition[] = [
			{
				version: 1,
				name: "migration-1",
				up: async () => {},
			},
			{
				version: 3, // Gap!
				name: "migration-3",
				up: async () => {},
			},
		];

		expect(() => new MigrationClient(createMockClient(), migrations)).toThrow(
			"Migrations must be sequential",
		);
	});

	test("should accept sequential migrations", () => {
		const migrations: MigrationDefinition[] = [
			{
				version: 1,
				name: "migration-1",
				up: async () => {},
			},
			{
				version: 2,
				name: "migration-2",
				up: async () => {},
			},
		];

		const client = new MigrationClient(createMockClient(), migrations);
		expect(client).toBeDefined();
	});

	test("should get status with no applied migrations", async () => {
		const mockClient = createMockClient();
		const migrations: MigrationDefinition[] = [
			{
				version: 1,
				name: "migration-1",
				up: async () => {},
			},
		];

		const client = new MigrationClient(mockClient, migrations);
		const status = await client.status();

		expect(status.current).toBeNull();
		expect(status.pending).toHaveLength(1);
		expect(status.canRollback).toBe(false);
	});

	test("should require confirmation for apply", async () => {
		const mockClient = createMockClient();
		const migrations: MigrationDefinition[] = [
			{
				version: 1,
				name: "migration-1",
				up: async () => {},
			},
		];

		const client = new MigrationClient(mockClient, migrations);

		await expect(client.apply({ confirm: false })).rejects.toThrow(
			"Must set confirm: true or dryRun: true",
		);
	});

	test("should require confirmation for rollback", async () => {
		const mockClient = createMockClient();
		const migrations: MigrationDefinition[] = [
			{
				version: 1,
				name: "migration-1",
				up: async () => {},
				down: async () => {},
			},
		];

		const client = new MigrationClient(mockClient, migrations);

		await expect(client.rollback({ to: 0, confirm: false })).rejects.toThrow(
			"Must set confirm: true to rollback",
		);
	});
});

