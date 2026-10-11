/** biome-ignore-all lint/suspicious/noExplicitAny: test code */
import type { CosmosClient } from "../../src/client/cosmos-client";
import { AggregateOps } from "../../src/operations/aggregate";
import { container, field } from "../../src/schema";

describe("AggregateOps", () => {
	let mockClient: jest.Mocked<CosmosClient>;
	let schema: any;

	beforeEach(() => {
		jest.clearAllMocks();

		mockClient = {
			getDatabase: jest.fn().mockReturnValue("testdb"),
			request: jest.fn(),
		} as any;

		schema = container("orders", {
			id: field.string(),
			userId: field.string(),
			total: field.number(),
			status: field.string(),
			createdAt: field.date(),
		}).partitionKey("userId");
	});

	describe("count", () => {
		test("executes count query", async () => {
			const ops = new AggregateOps(mockClient, schema);
			// SELECT VALUE returns array directly, not Documents
			mockClient.request.mockResolvedValue([42]);

			const result = await ops.count({
				partitionKey: "user123",
			});

			expect(mockClient.request).toHaveBeenCalledWith(
				"POST",
				"/dbs/testdb/colls/orders/docs",
				expect.objectContaining({
					query: expect.stringContaining("SELECT VALUE COUNT(1)"),
				}),
				"user123",
				undefined,
			);
			expect(result).toBe(42);
		});

		test("returns 0 when result is empty", async () => {
			const ops = new AggregateOps(mockClient, schema);
			mockClient.request.mockResolvedValue([]);

			const result = await ops.count({
				partitionKey: "user123",
			});

			expect(result).toBe(0);
		});

		test("throws error when partition key missing", async () => {
			const ops = new AggregateOps(mockClient, schema);

			await expect(
				ops.count({
					partitionKey: undefined as any,
				}),
			).rejects.toThrow("PARTITION KEY REQUIRED");
		});

		test("allows cross-partition query", async () => {
			const ops = new AggregateOps(mockClient, schema);
			// SELECT VALUE returns array directly
			mockClient.request.mockResolvedValue([100]);

			const result = await ops.count({
				enableCrossPartitionQuery: true,
			});

			expect(mockClient.request).toHaveBeenCalledWith(
				expect.any(String),
				expect.any(String),
				expect.any(Object),
				undefined,
				true,
			);
			expect(result).toBe(100);
		});
	});

	describe("aggregate", () => {
		test("executes aggregate query", async () => {
			const ops = new AggregateOps(mockClient, schema);
			mockClient.request.mockResolvedValue({
				Documents: [
					{
						_count: 15,
						_sum_total: 1250.5,
						_avg_total: 83.37,
					},
				],
			});

			const result = await ops.aggregate({
				partitionKey: "user123",
				_count: true,
				_sum: { total: true },
				_avg: { total: true },
			});

			expect(result._count).toBe(15);
			expect(result._sum).toEqual({ total: 1250.5 });
			expect(result._avg).toEqual({ total: 83.37 });
		});

		test("throws error when no aggregations specified", async () => {
			const ops = new AggregateOps(mockClient, schema);

			await expect(
				ops.aggregate({
					partitionKey: "user123",
				} as any),
			).rejects.toThrow("At least one aggregation operation");
		});
	});

	describe("groupBy", () => {
		test("executes group by query", async () => {
			const ops = new AggregateOps(mockClient, schema);
			mockClient.request.mockResolvedValue({
				Documents: [
					{ category: "electronics", _count: 150, _sum_total: 45000 },
					{ category: "books", _count: 200, _sum_total: 5000 },
				],
			});

			const result = await ops.groupBy({
				by: "category",
				partitionKey: "user123",
				_count: true,
				_sum: { total: true },
			} as any);

			expect(result).toHaveLength(2);
			expect(result[0].category).toBe("electronics");
			expect(result[0]._count).toBe(150);
		});

		test("executes group by with multiple fields", async () => {
			const ops = new AggregateOps(mockClient, schema);
			mockClient.request.mockResolvedValue({
				Documents: [{ region: "US", category: "electronics", _count: 100 }],
			});

			const result = await ops.groupBy({
				by: ["region", "category"],
				partitionKey: "user123",
				_count: true,
			} as any);

			expect(result[0].region).toBe("US");
			expect(result[0].category).toBe("electronics");
		});
	});

	describe("convenience methods", () => {
		test("sum returns correct value", async () => {
			const ops = new AggregateOps(mockClient, schema);
			mockClient.request.mockResolvedValue({
				Documents: [{ _sum_total: 1250.5 }],
			});

			const result = await ops.sum("total", {
				partitionKey: "user123",
			} as any);

			expect(result).toBe(1250.5);
		});

		test("avg returns correct value", async () => {
			const ops = new AggregateOps(mockClient, schema);
			mockClient.request.mockResolvedValue({
				Documents: [{ _avg_total: 83.37 }],
			});

			const result = await ops.avg("total", {
				partitionKey: "user123",
			} as any);

			expect(result).toBe(83.37);
		});

		test("min returns correct value", async () => {
			const ops = new AggregateOps(mockClient, schema);
			mockClient.request.mockResolvedValue({
				Documents: [{ _min_createdAt: "2024-01-01" }],
			});

			const result = await ops.min("createdAt", {
				partitionKey: "user123",
			} as any);

			expect(result).toBe("2024-01-01");
		});

		test("max returns correct value", async () => {
			const ops = new AggregateOps(mockClient, schema);
			mockClient.request.mockResolvedValue({
				Documents: [{ _max_createdAt: "2024-12-31" }],
			});

			const result = await ops.max("createdAt", {
				partitionKey: "user123",
			} as any);

			expect(result).toBe("2024-12-31");
		});

		test("convenience methods return null when no results", async () => {
			const ops = new AggregateOps(mockClient, schema);
			mockClient.request.mockResolvedValue({
				Documents: [{ _sum_total: null }],
			});

			const result = await ops.sum("total", {
				partitionKey: "user123",
			} as any);

			expect(result).toBeNull();
		});
	});

	describe("error handling", () => {
		test("handles cross-partition query errors", async () => {
			const ops = new AggregateOps(mockClient, schema);
			const error = new Error("cross partition");
			error.code = "CROSS_PARTITION_QUERY_ERROR";
			mockClient.request.mockRejectedValue(error);

			await expect(
				ops.count({
					enableCrossPartitionQuery: true,
				}),
			).rejects.toThrow("Cross-partition query failed");
		});
	});
});

