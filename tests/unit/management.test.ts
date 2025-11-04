import { describe, expect, test, beforeEach, mock } from "bun:test";
import { ManagementOperations } from "../../src/operations/management";
import type { CosmosClient } from "../../src/client/cosmos-client";

function createMockClient() {
	return {
		getDatabase: () => "test-db",
		listContainers: mock(() =>
			Promise.resolve([{ id: "container1" }, { id: "container2" }, { id: "orphaned" }]),
		),
		getContainer: mock((name: string) =>
			Promise.resolve({
				id: name,
				_self: "self",
				_rid: "rid",
				_ts: Date.now() / 1000,
				partitionKey: {
					paths: ["/id"],
					kind: "Hash",
				},
				indexingPolicy: {
					automatic: true,
					includedPaths: [{ path: "/*" }],
					excludedPaths: [],
					compositeIndexes: [],
					spatialIndexes: [],
				},
			}),
		),
		request: mock(() => Promise.resolve({ Documents: [42] })),
		deleteContainer: mock(() => Promise.resolve()),
	} as unknown as CosmosClient;
}

describe("ManagementOperations", () => {
	let managementOps: ManagementOperations;
	let mockClient: CosmosClient;

	beforeEach(() => {
		mockClient = createMockClient();
		managementOps = new ManagementOperations(mockClient);
	});

	describe("registerContainer", () => {
		test("should register container schema", () => {
			const schema = {
				name: "users",
				schema: { id: {}, email: {} },
				partitionKeyField: "email",
			};

			managementOps.registerContainer("users", schema);

			// No error = success
			expect(true).toBe(true);
		});
	});

	describe("getDatabaseInfo", () => {
		test("should return database information", async () => {
			const info = await managementOps.getDatabaseInfo();

			expect(info.id).toBe("test-db");
			expect(info.containersCount).toBe(3);
			expect(info.containers).toHaveLength(3);
			expect(info.storage).toHaveProperty("totalSizeGB");
			expect(info.storage).toHaveProperty("totalDocuments");
		});

		test("should include container details", async () => {
			const info = await managementOps.getDatabaseInfo();

			const container = info.containers[0];
			expect(container).toHaveProperty("id");
			expect(container).toHaveProperty("partitionKey");
			expect(container).toHaveProperty("statistics");
			expect(container).toHaveProperty("indexingPolicy");
		});
	});

	describe("listOrphanedContainers", () => {
		test("should list containers not in schema", async () => {
			managementOps.registerContainer("container1", {} as any);
			managementOps.registerContainer("container2", {} as any);

			const orphaned = await managementOps.listOrphanedContainers();

			expect(orphaned).toContain("orphaned");
			expect(orphaned).not.toContain("container1");
			expect(orphaned).not.toContain("container2");
		});

		test("should exclude system containers", async () => {
			const mockClientWithMigrations = createMockClient();
			(mockClientWithMigrations.listContainers as any).mockResolvedValue([
				{ id: "_migrations" },
				{ id: "orphaned" },
			]);

			const ops = new ManagementOperations(mockClientWithMigrations);
			const orphaned = await ops.listOrphanedContainers();

			expect(orphaned).not.toContain("_migrations");
			expect(orphaned).toContain("orphaned");
		});
	});

	describe("deleteContainers", () => {
		test("should require confirmation", async () => {
			await expect(
				managementOps.deleteContainers(["test"], { confirm: false }),
			).rejects.toThrow("Must set confirm: true");
		});

		test("should delete containers with confirmation", async () => {
			const result = await managementOps.deleteContainers(["container1"], { confirm: true });

			expect(result.deleted).toContain("container1");
			expect(result.failed).toHaveLength(0);
			expect(mockClient.deleteContainer).toHaveBeenCalledWith("container1");
		});

		test("should handle deletion errors", async () => {
			(mockClient.deleteContainer as any).mockRejectedValueOnce(new Error("Delete failed"));

			const result = await managementOps.deleteContainers(["container1"], { confirm: true });

			expect(result.failed).toHaveLength(1);
			expect(result.failed[0].container).toBe("container1");
			expect(result.failed[0].error).toContain("Delete failed");
		});
	});

	describe("pruneContainers", () => {
		test("should require confirm or dryRun", async () => {
			await expect(
				managementOps.pruneContainers({ confirm: false, dryRun: false }),
			).rejects.toThrow("Must set confirm: true or dryRun: true");
		});

		test("should perform dry run without deleting", async () => {
			managementOps.registerContainer("container1", {} as any);

			const result = await managementOps.pruneContainers({
				confirm: false,
				dryRun: true,
			});

			expect(result.pruned.length).toBeGreaterThan(0);
			expect(mockClient.deleteContainer).not.toHaveBeenCalled();
		});

		test("should exclude specified containers", async () => {
			managementOps.registerContainer("container1", {} as any);

			const result = await managementOps.pruneContainers({
				confirm: false,
				dryRun: true,
				exclude: ["orphaned"],
			});

			expect(result.kept).toContain("orphaned");
			expect(result.pruned).not.toContain("orphaned");
		});

		test("should delete orphaned containers with confirmation", async () => {
			managementOps.registerContainer("container1", {} as any);
			managementOps.registerContainer("container2", {} as any);

			const result = await managementOps.pruneContainers({
				confirm: true,
			});

			expect(result.pruned).toContain("orphaned");
		});
	});

	describe("healthCheck", () => {
		test("should return health report", async () => {
			const health = await managementOps.healthCheck();

			expect(health.database).toBe("test-db");
			expect(health.overallHealth).toMatch(/healthy|warning|critical/);
			expect(health.containers).toBeInstanceOf(Array);
			expect(health.timestamp).toBeInstanceOf(Date);
			expect(health.recommendations).toBeInstanceOf(Array);
		});

		test("should detect orphaned containers as issues", async () => {
			managementOps.registerContainer("container1", {} as any);

			const health = await managementOps.healthCheck();

			const orphanedContainer = health.containers.find((c) => c.container === "orphaned");
			expect(orphanedContainer).toBeDefined();
			expect(orphanedContainer?.issues.some((i) => i.type === "orphaned")).toBe(true);
		});

		test("should mark containers with issues as unhealthy", async () => {
			const health = await managementOps.healthCheck();

			const unhealthy = health.containers.filter((c) => !c.healthy);
			if (unhealthy.length > 0) {
				expect(unhealthy[0].issues.length).toBeGreaterThan(0);
			}
		});
	});

	describe("diffSchema", () => {
		test("should detect orphaned containers", async () => {
			managementOps.registerContainer("container1", {} as any);

			const diff = await managementOps.diffSchema();

			expect(diff.containers.orphaned).toContain("orphaned");
			expect(diff.containers.orphaned).toContain("container2");
			expect(diff.requiresAction).toBe(true);
		});

		test("should detect missing containers", async () => {
			managementOps.registerContainer("missing-container", {} as any);

			const diff = await managementOps.diffSchema();

			expect(diff.containers.missing).toContain("missing-container");
			expect(diff.requiresAction).toBe(true);
		});

		test("should show no action required when in sync", async () => {
			managementOps.registerContainer("container1", { partitionKeyField: "id" } as any);
			managementOps.registerContainer("container2", { partitionKeyField: "id" } as any);
			managementOps.registerContainer("orphaned", { partitionKeyField: "id" } as any);

			const diff = await managementOps.diffSchema();

			expect(diff.containers.orphaned).toHaveLength(0);
			expect(diff.containers.missing).toHaveLength(0);
			expect(diff.requiresAction).toBe(false);
		});

		test("should detect partition key mismatches", async () => {
			managementOps.registerContainer("container1", { partitionKeyField: "email" } as any);

			const diff = await managementOps.diffSchema();

			const modified = diff.containers.modified.find((m) => m.container === "container1");
			expect(modified).toBeDefined();
			expect(modified?.differences.partitionKey).toBeDefined();
		});
	});
});

