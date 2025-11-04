import { describe, expect, test, mock, beforeEach } from "bun:test";
import { BulkUpdateOperations } from "../../src/operations/bulk-update";
import { BulkDeleteOperations } from "../../src/operations/bulk-delete";
import type { CosmosClient } from "../../src/client/cosmos-client";
import { ContainerSchema } from "../../src/schema/container";
import { field } from "../../src/schema/field";

// Mock schema
const testSchema = new ContainerSchema(
	"test-container",
	{
		id: field.string().getConfig(),
		email: field.string().getConfig(),
		name: field.string().getConfig(),
		age: field.number().getConfig(),
	},
	"email" as any,
);

// Mock CosmosClient
function createMockClient(mockRequest: any = mock(() => Promise.resolve({ Documents: [] }))) {
	return {
		getDatabase: () => "test-db",
		request: mockRequest,
	} as unknown as CosmosClient;
}

describe("BulkUpdateOperations", () => {
	let bulkUpdateOps: BulkUpdateOperations<any, any>;
	let mockRequest: any;

	beforeEach(() => {
		mockRequest = mock(() =>
			Promise.resolve({
				Documents: [
					{ id: "1", email: "user1@example.com", name: "User 1", age: 25 },
					{ id: "2", email: "user2@example.com", name: "User 2", age: 30 },
				],
			}),
		);
		const mockClient = createMockClient(mockRequest);
		bulkUpdateOps = new BulkUpdateOperations(mockClient, testSchema);
	});

	test("should require partitionKey or enableCrossPartitionQuery", async () => {
		await expect(
			bulkUpdateOps.updateMany({
				where: {},
				data: { name: "Updated" },
			}),
		).rejects.toThrow("Either partitionKey or enableCrossPartitionQuery must be specified");
	});

	test("should perform static update", async () => {
		mockRequest.mockResolvedValueOnce({
			Documents: [{ id: "1", email: "test@example.com", name: "Test", age: 25 }],
		});

		const result = await bulkUpdateOps.updateMany({
			where: {},
			data: { name: "Updated Name" },
			enableCrossPartitionQuery: true,
			batchSize: 10,
		});

		expect(result.success).toBe(true);
		expect(result.updated).toBeGreaterThanOrEqual(0);
		expect(result.failed).toBe(0);
	});

	test("should track progress stats", async () => {
		const progressStats: any[] = [];

		mockRequest.mockResolvedValueOnce({
			Documents: [
				{ id: "1", email: "test@example.com", name: "Test 1" },
				{ id: "2", email: "test@example.com", name: "Test 2" },
			],
		});

		await bulkUpdateOps.updateMany({
			where: {},
			data: { name: "Updated" },
			enableCrossPartitionQuery: true,
			batchSize: 1,
			onProgress: (stats) => progressStats.push(stats),
		});

		expect(progressStats.length).toBeGreaterThan(0);
		expect(progressStats[0]).toHaveProperty("total");
		expect(progressStats[0]).toHaveProperty("processed");
		expect(progressStats[0]).toHaveProperty("percentage");
		expect(progressStats[0]).toHaveProperty("ruConsumed");
	});

	test("should handle empty results", async () => {
		mockRequest.mockResolvedValueOnce({ Documents: [] });

		const result = await bulkUpdateOps.updateMany({
			where: {},
			data: { name: "Updated" },
			partitionKey: "test@example.com",
		});

		expect(result.success).toBe(true);
		expect(result.updated).toBe(0);
		expect(result.performance.durationMs).toBeGreaterThanOrEqual(0);
	});
});

describe("BulkDeleteOperations", () => {
	let bulkDeleteOps: BulkDeleteOperations<any, any>;
	let mockRequest: any;

	beforeEach(() => {
		mockRequest = mock(() => Promise.resolve({ Documents: [] }));
		const mockClient = createMockClient(mockRequest);
		bulkDeleteOps = new BulkDeleteOperations(mockClient, testSchema);
	});

	test("should require confirm: true", async () => {
		await expect(
			bulkDeleteOps.deleteMany({
				where: {},
				partitionKey: "test@example.com",
			}),
		).rejects.toThrow("Must set confirm: true");
	});

	test("should require partitionKey or enableCrossPartitionQuery", async () => {
		await expect(
			bulkDeleteOps.deleteMany({
				where: {},
				confirm: true,
			}),
		).rejects.toThrow("Either partitionKey or enableCrossPartitionQuery must be specified");
	});

	test("should perform deletion with confirmation", async () => {
		mockRequest.mockResolvedValueOnce({
			Documents: [{ id: "1", email: "test@example.com", name: "Test" }],
		});

		const result = await bulkDeleteOps.deleteMany({
			where: {},
			confirm: true,
			enableCrossPartitionQuery: true,
		});

		expect(result.success).toBe(true);
		expect(result.deleted).toBeGreaterThanOrEqual(0);
		expect(result.failed).toBe(0);
	});

	test("should track progress during deletion", async () => {
		const progressStats: any[] = [];

		mockRequest.mockResolvedValueOnce({
			Documents: [
				{ id: "1", email: "test@example.com" },
				{ id: "2", email: "test@example.com" },
			],
		});

		await bulkDeleteOps.deleteMany({
			where: {},
			confirm: true,
			enableCrossPartitionQuery: true,
			batchSize: 1,
			onProgress: (stats) => progressStats.push(stats),
		});

		expect(progressStats.length).toBeGreaterThan(0);
		expect(progressStats[0]).toHaveProperty("total");
		expect(progressStats[0]).toHaveProperty("percentage");
	});

	test("should handle empty results", async () => {
		mockRequest.mockResolvedValueOnce({ Documents: [] });

		const result = await bulkDeleteOps.deleteMany({
			where: {},
			confirm: true,
			partitionKey: "test@example.com",
		});

		expect(result.success).toBe(true);
		expect(result.deleted).toBe(0);
		expect(result.performance.durationMs).toBeGreaterThanOrEqual(0);
	});
});

