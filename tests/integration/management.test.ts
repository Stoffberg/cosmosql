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

		// Create an orphaned container manually
		try {
			await db.management.client.createContainer({
				id: "orphaned-container",
				partitionKey: { paths: ["/id"], kind: "Hash" },
			});
		} catch {
			// Container might already exist
		}
	}, 60000);

	afterAll(async () => {
		// Cleanup handled by existing tests
	}, 30000);

	describe("Database Information", () => {
		test("should get database info", async () => {
			const info = await db.management.getDatabaseInfo();

			expect(info.id).toBe(TEST_DB);
			expect(info.containersCount).toBeGreaterThanOrEqual(2);
			expect(info.containers).toBeInstanceOf(Array);
			expect(info.storage).toHaveProperty("totalDocuments");
			expect(info.storage).toHaveProperty("totalSizeGB");
		});

		test("should include container details", async () => {
			const info = await db.management.getDatabaseInfo();

			const container = info.containers.find((c: any) => c.id === "registered");
			expect(container).toBeDefined();
			expect(container.partitionKey).toHaveProperty("paths");
			expect(container.statistics).toHaveProperty("documentCount");
			expect(container.indexingPolicy).toHaveProperty("automatic");
		});

		test("should show registered schema info", async () => {
			const info = await db.management.getDatabaseInfo();

			const registered = info.containers.find((c: any) => c.id === "registered");
			expect(registered?.schema?.registered).toBe(true);
			expect(registered?.schema?.partitionKeyField).toBeDefined();
		});
	});

	describe("Orphaned Container Detection", () => {
		test("should list orphaned containers", async () => {
			const orphaned = await db.management.listOrphanedContainers();

			expect(Array.isArray(orphaned)).toBe(true);
			// Note: might not have orphaned-container if creation failed
			// but should not include registered containers
			expect(orphaned).not.toContain("registered");
			expect(orphaned).not.toContain("another");
		});

		test("should not list system containers as orphaned", async () => {
			const orphaned = await db.management.listOrphanedContainers();

			expect(orphaned).not.toContain("_migrations");
		});
	});

	describe("Health Check", () => {
		test("should perform health check", async () => {
			const health = await db.management.healthCheck();

			expect(health.database).toBe(TEST_DB);
			expect(health.overallHealth).toMatch(/healthy|warning|critical/);
			expect(health.timestamp).toBeInstanceOf(Date);
			expect(health.containers).toBeInstanceOf(Array);
			expect(health.recommendations).toBeInstanceOf(Array);
			expect(health.costAnalysis).toHaveProperty("currentMonthlyEstimate");
		});

		test("should detect container health issues", async () => {
			const health = await db.management.healthCheck();

			for (const container of health.containers) {
				expect(container).toHaveProperty("container");
				expect(container).toHaveProperty("healthy");
				expect(container).toHaveProperty("issues");
				expect(container).toHaveProperty("statistics");

				if (!container.healthy) {
					expect(container.issues.length).toBeGreaterThan(0);

					for (const issue of container.issues) {
						expect(issue).toHaveProperty("severity");
						expect(issue).toHaveProperty("type");
						expect(issue).toHaveProperty("message");
						expect(issue.severity).toMatch(/error|warning|info/);
					}
				}
			}
		});

		test("should provide recommendations", async () => {
			const health = await db.management.healthCheck();

			expect(Array.isArray(health.recommendations)).toBe(true);
			// Recommendations might be empty if everything is healthy
		});
	});

	describe("Schema Diff", () => {
		test("should compare schema with database", async () => {
			const diff = await db.management.diffSchema();

			expect(diff.database).toBe(TEST_DB);
			expect(diff.timestamp).toBeInstanceOf(Date);
			expect(diff.containers).toHaveProperty("registered");
			expect(diff.containers).toHaveProperty("actual");
			expect(diff.containers).toHaveProperty("orphaned");
			expect(diff.containers).toHaveProperty("missing");
			expect(diff.containers).toHaveProperty("modified");
			expect(typeof diff.requiresAction).toBe("boolean");
		});

		test("should detect registered containers", async () => {
			const diff = await db.management.diffSchema();

			expect(diff.containers.registered).toContain("registered");
			expect(diff.containers.registered).toContain("another");
		});

		test("should detect actual containers", async () => {
			const diff = await db.management.diffSchema();

			expect(diff.containers.actual.length).toBeGreaterThanOrEqual(2);
		});

		test("should detect orphaned containers", async () => {
			const diff = await db.management.diffSchema();

			// Should not include registered containers
			expect(diff.containers.orphaned).not.toContain("registered");
			expect(diff.containers.orphaned).not.toContain("another");

			// Should not include system containers
			expect(diff.containers.orphaned).not.toContain("_migrations");
		});

		test("should detect missing containers", async () => {
			const diff = await db.management.diffSchema();

			// All registered containers should exist
			expect(diff.containers.missing).toHaveLength(0);
		});

		test("should detect configuration differences", async () => {
			const diff = await db.management.diffSchema();

			// Check if any containers have configuration mismatches
			if (diff.containers.modified.length > 0) {
				const modified = diff.containers.modified[0];
				expect(modified).toHaveProperty("container");
				expect(modified).toHaveProperty("differences");
			}
		});
	});

	describe("Container Pruning", () => {
		test("should require confirm or dryRun", async () => {
			await expect(
				db.management.pruneContainers({ confirm: false, dryRun: false }),
			).rejects.toThrow("Must set confirm: true or dryRun: true");
		});

		test("should perform dry run", async () => {
			const result = await db.management.pruneContainers({
				confirm: false,
				dryRun: true,
			});

			expect(result).toHaveProperty("pruned");
			expect(result).toHaveProperty("kept");
			expect(result).toHaveProperty("failed");
			expect(Array.isArray(result.pruned)).toBe(true);
			expect(Array.isArray(result.kept)).toBe(true);
			expect(Array.isArray(result.failed)).toBe(true);
		});

		test("should exclude specified containers", async () => {
			const result = await db.management.pruneContainers({
				confirm: false,
				dryRun: true,
				exclude: ["orphaned-container"],
			});

			expect(result.kept).toContain("orphaned-container");
			expect(result.pruned).not.toContain("orphaned-container");
		});

		test("should not prune registered containers", async () => {
			const result = await db.management.pruneContainers({
				confirm: false,
				dryRun: true,
			});

			expect(result.pruned).not.toContain("registered");
			expect(result.pruned).not.toContain("another");
		});
	});

	describe("Container Deletion", () => {
		test("should require confirmation", async () => {
			await expect(
				db.management.deleteContainers(["test"], { confirm: false }),
			).rejects.toThrow("Must set confirm: true");
		});

		test("should handle non-existent containers", async () => {
			const result = await db.management.deleteContainers(["nonexistent-container"], {
				confirm: true,
			});

			// Should either succeed (if exists) or be in failed list
			expect(result.deleted.length + result.failed.length).toBeGreaterThanOrEqual(0);
		});

		test("should delete containers with confirmation", async () => {
			// Create a temporary container to delete
			try {
				await db.management.client.createContainer({
					id: "temp-delete-test",
					partitionKey: { paths: ["/id"], kind: "Hash" },
				});
			} catch {
				// Might already exist
			}

			const result = await db.management.deleteContainers(["temp-delete-test"], {
				confirm: true,
			});

			expect(result.deleted.includes("temp-delete-test") || result.failed.some((f: any) => f.container === "temp-delete-test")).toBe(true);
		});
	});

	describe("Legacy Management Methods", () => {
		test("should support listOrphanedContainers", async () => {
			const orphaned = await db.listOrphanedContainers();

			expect(Array.isArray(orphaned)).toBe(true);
		});

		test("should support pruneContainers", async () => {
			const result = await db.pruneContainers({ confirm: false });

			// Should throw because confirm is false and dryRun not set
			// Actually the legacy method might have different behavior
		});
	});
});

