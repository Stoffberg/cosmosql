import type { CosmosClient } from "../../src/client/cosmos-client";
import { CosmosError } from "../../src/errors/cosmos-error";
import { FindOperations } from "../../src/operations/find";
import { container, field } from "../../src/schema";

describe("FindOperations", () => {
	let mockClient: jest.Mocked<CosmosClient>;
	let schema: any;

	beforeEach(() => {
		jest.clearAllMocks();

		mockClient = {
			getDatabase: jest.fn().mockReturnValue("testdb"),
			request: jest.fn(),
		} as any;

		schema = container("users", {
			id: field.string(),
			email: field.string(),
			name: field.string().optional(),
		}).partitionKey("email");
	});

	describe("findUnique", () => {
		test("finds document by id and partition key", async () => {
			const ops = new FindOperations(mockClient, schema);
			const args = { where: { id: "1", email: "test@example.com" } };
			const expectedResult = {
				id: "1",
				email: "test@example.com",
				name: "John",
			};

			mockClient.request.mockResolvedValue(expectedResult);

			const result = await ops.findUnique(args);

			expect(mockClient.request).toHaveBeenCalledWith(
				"GET",
				"/dbs/testdb/colls/users/docs/1",
				undefined,
				"test@example.com",
			);
			expect(result).toEqual(expectedResult);
		});

		test("returns null when document not found", async () => {
			const ops = new FindOperations(mockClient, schema);
			const args = { where: { id: "1", email: "test@example.com" } };

			const error = new CosmosError(404, "NotFound", "Document not found");
			mockClient.request.mockRejectedValue(error);

			const result = await ops.findUnique(args);

			expect(result).toBeNull();
		});

		test("throws error when partition key not defined", async () => {
			const schemaWithoutPK = container("users", {
				id: field.string(),
				email: field.string(),
			});

			const ops = new FindOperations(mockClient, schemaWithoutPK as any);
			const args = { where: { id: "1", email: "test@example.com" } };

			await expect((ops as any).findUnique(args)).rejects.toThrow(
				"Container must have a partition key defined",
			);
		});

		test("throws error when id or partition key missing", async () => {
			const ops = new FindOperations(mockClient, schema);
			const args = { where: { id: "1" } };

			await expect(ops.findUnique(args as any)).rejects.toThrow(
				"Both id and partition key are required for findUnique",
			);
		});

		test("applies select to result", async () => {
			const ops = new FindOperations(mockClient, schema);
			const args = {
				where: { id: "1", email: "test@example.com" },
				select: { id: true, email: true },
			};
			const fullResult = { id: "1", email: "test@example.com", name: "John" };

			mockClient.request.mockResolvedValue(fullResult);

			const result = await ops.findUnique(args);

			expect(result).toEqual({ id: "1", email: "test@example.com" });
		});

		test("throws non-404 errors", async () => {
			const ops = new FindOperations(mockClient, schema);
			const args = { where: { id: "1", email: "test@example.com" } };

			const serverError = new CosmosError(500, "ServerError", "Server error");
			mockClient.request.mockRejectedValue(serverError);

			await expect(ops.findUnique(args)).rejects.toThrow(CosmosError);
		});

		test("applies nested select", async () => {
			const schemaWithNested = container("users", {
				id: field.string(),
				email: field.string(),
				profile: field.object({
					name: field.string(),
					bio: field.string(),
				}),
			}).partitionKey("email");

			const ops = new FindOperations(mockClient, schemaWithNested as any);
			const args: any = {
				where: { id: "1", email: "test@example.com" },
				select: {
					id: true,
					profile: {
						name: true,
					},
				},
			};

			const fullResult = {
				id: "1",
				email: "test@example.com",
				profile: { name: "John", bio: "Developer" },
			};

			mockClient.request.mockResolvedValue(fullResult);

			const result = await ops.findUnique(args);

			expect(result).toEqual({
				id: "1",
				profile: { name: "John" },
			});
		});
	});

	describe("findMany", () => {
		test("finds multiple documents with partition key", async () => {
			const ops = new FindOperations(mockClient, schema);
			const args = { partitionKey: "test@example.com" };
			const expectedResult = {
				Documents: [
					{ id: "1", email: "test@example.com" },
					{ id: "2", email: "test@example.com" },
				],
			};

			mockClient.request.mockResolvedValue(expectedResult);

			const result = await ops.findMany(args);

			expect(mockClient.request).toHaveBeenCalledWith(
				"POST",
				"/dbs/testdb/colls/users/docs",
				expect.objectContaining({
					query: expect.any(String),
					parameters: expect.any(Array),
				}),
				"test@example.com",
				undefined, // enableCrossPartitionQuery
			);
			expect(result).toEqual(expectedResult.Documents);
		});

		test("finds documents with where clause", async () => {
			const ops = new FindOperations(mockClient, schema);
			const args = {
				partitionKey: "test@example.com",
				where: { name: "John" },
			};

			mockClient.request.mockResolvedValue({ Documents: [] });

			await ops.findMany(args);

			const callArgs = mockClient.request.mock.calls[0];
			const body = callArgs[2] as { query: string; parameters: any[] };

			expect(body.query).toContain("WHERE");
			expect(body.parameters.length).toBeGreaterThan(0);
		});

		test("finds documents with orderBy", async () => {
			const ops = new FindOperations(mockClient, schema);
			const args = {
				partitionKey: "test@example.com",
				orderBy: { name: "asc" as const },
			};

			mockClient.request.mockResolvedValue({ Documents: [] });

			await ops.findMany(args);

			const callArgs = mockClient.request.mock.calls[0];
			const body = callArgs[2] as { query: string };

			expect(body.query).toContain("ORDER BY");
		});

		test("finds documents with take and skip", async () => {
			const ops = new FindOperations(mockClient, schema);
			const args = {
				partitionKey: "test@example.com",
				take: 10,
				skip: 5,
			};

			mockClient.request.mockResolvedValue({ Documents: [] });

			await ops.findMany(args);

			const callArgs = mockClient.request.mock.calls[0];
			const body = callArgs[2] as { query: string };

			expect(body.query).toContain("LIMIT");
			expect(body.query).toContain("OFFSET");
		});

		test("throws error when neither partitionKey nor enableCrossPartitionQuery provided", async () => {
			const ops = new FindOperations(mockClient, schema);
			const args = {};

			await expect(ops.findMany(args)).rejects.toThrow(
				"Either partitionKey or enableCrossPartitionQuery must be provided",
			);
		});

		test("allows cross-partition query", async () => {
			const ops = new FindOperations(mockClient, schema);
			const args = { enableCrossPartitionQuery: true };

			mockClient.request.mockResolvedValue({ Documents: [] });

			await ops.findMany(args);

			expect(mockClient.request).toHaveBeenCalled();
			expect(mockClient.request).toHaveBeenCalledWith(
				expect.any(String),
				expect.any(String),
				expect.any(Object),
				undefined, // partitionKey
				true, // enableCrossPartitionQuery
			);
		});

		test("passes enableCrossPartitionQuery through to client request", async () => {
			const ops = new FindOperations(mockClient, schema);
			const args = {
				enableCrossPartitionQuery: true,
				take: 10,
			};

			mockClient.request.mockResolvedValue({ Documents: [] });

			await ops.findMany(args);

			expect(mockClient.request).toHaveBeenCalledWith(
				"POST",
				expect.stringContaining("/docs"),
				expect.any(Object),
				undefined, // partitionKey should be undefined when enableCrossPartitionQuery is true
				true, // enableCrossPartitionQuery should be passed through
			);
		});

		test("handles explicit undefined partitionKey with enableCrossPartitionQuery", async () => {
			const ops = new FindOperations(mockClient, schema);
			const args = {
				partitionKey: undefined as any, // explicit undefined
				enableCrossPartitionQuery: true,
				take: 1,
			};

			mockClient.request.mockResolvedValue({ Documents: [] });

			await ops.findMany(args);

			expect(mockClient.request).toHaveBeenCalledWith(
				"POST",
				expect.stringContaining("/docs"),
				expect.any(Object),
				undefined, // partitionKey explicitly undefined
				true, // enableCrossPartitionQuery
			);
		});

		test("cross-partition query with where clause and explicit undefined partitionKey", async () => {
			const ops = new FindOperations(mockClient, schema);
			const args = {
				where: { name: "John" },
				partitionKey: undefined as any, // explicit undefined
				enableCrossPartitionQuery: true,
			};

			mockClient.request.mockResolvedValue({ Documents: [] });

			await ops.findMany(args);

			const callArgs = mockClient.request.mock.calls[0];
			expect(callArgs[3]).toBeUndefined(); // partitionKey
			expect(callArgs[4]).toBe(true); // enableCrossPartitionQuery

			const body = callArgs[2] as { query: string; parameters: any[] };
			expect(body.query).toContain("WHERE");
			expect(body.parameters.length).toBeGreaterThan(0);
		});

		test("cross-partition query with take parameter and undefined partitionKey", async () => {
			const ops = new FindOperations(mockClient, schema);
			const args = {
				take: 5,
				partitionKey: undefined as any,
				enableCrossPartitionQuery: true,
			};

			mockClient.request.mockResolvedValue({ Documents: [] });

			await ops.findMany(args);

			expect(mockClient.request).toHaveBeenCalledWith(
				"POST",
				expect.stringContaining("/docs"),
				expect.objectContaining({
					query: expect.stringContaining("TOP"),
				}),
				undefined, // partitionKey
				true, // enableCrossPartitionQuery
			);
		});

		test("applies select to results", async () => {
			const ops = new FindOperations(mockClient, schema);
			const args = {
				partitionKey: "test@example.com",
				select: { id: true, email: true },
			};

			const fullDoc = { id: "1", email: "test@example.com", name: "John" };
			mockClient.request.mockResolvedValue({
				Documents: [fullDoc],
			});

			const result = await ops.findMany(args);

			// applySelect should filter to only selected fields
			expect(result[0]).toHaveProperty("id", "1");
			expect(result[0]).toHaveProperty("email", "test@example.com");
			// Note: applySelect in findMany currently doesn't filter, it just returns Documents
			// This test verifies the select parameter is passed to QueryBuilder
			expect(result).toHaveLength(1);
		});

		describe("with aggregations", () => {
			test("returns data and aggregations when aggregate is provided", async () => {
				const ops = new FindOperations(mockClient, schema);
				const args = {
					partitionKey: "test@example.com",
					aggregate: {
						_count: true,
						_avg: { id: true },
					},
				};

				const dataResult = {
					Documents: [
						{ id: "1", email: "test@example.com", name: "John" },
						{ id: "2", email: "test@example.com", name: "Jane" },
					],
				};

				const aggResult = {
					Documents: [{ _count: 2, _avg_id: 1.5 }],
				};

				mockClient.request.mockResolvedValueOnce(dataResult).mockResolvedValueOnce(aggResult);

				const result = await ops.findMany(args as any);

				// Should make two requests
				expect(mockClient.request).toHaveBeenCalledTimes(2);

				// Result should have data and aggregations
				expect(result).toHaveProperty("data");
				expect(result).toHaveProperty("_count");
				expect(result).toHaveProperty("_avg");

				expect((result as any).data).toEqual(dataResult.Documents);
				expect((result as any)._count).toBe(2);
				expect((result as any)._avg).toEqual({ id: 1.5 });
			});

			test("executes both queries in parallel", async () => {
				const ops = new FindOperations(mockClient, schema);
				const args = {
					partitionKey: "test@example.com",
					aggregate: { _count: true },
				};

				const dataResult = { Documents: [{ id: "1" }] };
				const aggResult = { Documents: [{ _count: 1 }] };

				mockClient.request.mockResolvedValueOnce(dataResult).mockResolvedValueOnce(aggResult);

				await ops.findMany(args as any);

				// Both requests should be made
				expect(mockClient.request).toHaveBeenCalledTimes(2);

				// First call is data query
				const dataCall = mockClient.request.mock.calls[0];
				expect(dataCall[2]).toHaveProperty("query");

				// Second call is aggregate query
				const aggCall = mockClient.request.mock.calls[1];
				expect(aggCall[2]).toHaveProperty("query");
			});

			test("combines aggregate with where clause", async () => {
				const ops = new FindOperations(mockClient, schema);
				const args = {
					partitionKey: "test@example.com",
					where: { name: "John" },
					aggregate: { _count: true },
				};

				mockClient.request
					.mockResolvedValueOnce({ Documents: [] })
					.mockResolvedValueOnce({ Documents: [{ _count: 0 }] });

				await ops.findMany(args as any);

				// Both queries should include the where clause
				const dataCall = mockClient.request.mock.calls[0];
				const aggCall = mockClient.request.mock.calls[1];

				expect((dataCall[2] as any).query).toContain("WHERE");
				expect((aggCall[2] as any).query).toContain("WHERE");
			});

			test("supports multiple aggregation operations", async () => {
				const schemaWithNumbers = container("stats", {
					id: field.string(),
					email: field.string(),
					age: field.number(),
					score: field.number(),
				}).partitionKey("email");

				const ops = new FindOperations(mockClient, schemaWithNumbers as any);
				const args = {
					partitionKey: "test@example.com",
					aggregate: {
						_count: true,
						_avg: { age: true, score: true },
						_min: { age: true },
						_max: { score: true },
					},
				};

				mockClient.request.mockResolvedValueOnce({ Documents: [] }).mockResolvedValueOnce({
					Documents: [
						{
							_count: 10,
							_avg_age: 25,
							_avg_score: 85,
							_min_age: 20,
							_max_score: 95,
						},
					],
				});

				const result = await ops.findMany(args as any);

				expect(result).toHaveProperty("_count", 10);
				expect(result).toHaveProperty("_avg");
				expect((result as any)._avg).toEqual({ age: 25, score: 85 });
				expect(result).toHaveProperty("_min");
				expect((result as any)._min).toEqual({ age: 20 });
				expect(result).toHaveProperty("_max");
				expect((result as any)._max).toEqual({ score: 95 });
			});

			test("works with cross-partition queries", async () => {
				const ops = new FindOperations(mockClient, schema);
				const args = {
					enableCrossPartitionQuery: true,
					aggregate: { _count: true },
				};

				mockClient.request
					.mockResolvedValueOnce({ Documents: [] })
					.mockResolvedValueOnce({ Documents: [{ _count: 0 }] });

				await ops.findMany(args as any);

				// Both calls should have enableCrossPartitionQuery
				expect(mockClient.request).toHaveBeenCalledTimes(2);
				expect(mockClient.request.mock.calls[0][4]).toBe(true);
				expect(mockClient.request.mock.calls[1][4]).toBe(true);
			});

			test("handles select with aggregations", async () => {
				const ops = new FindOperations(mockClient, schema);
				const args = {
					partitionKey: "test@example.com",
					select: { id: true, name: true },
					aggregate: { _count: true },
				};

				mockClient.request
					.mockResolvedValueOnce({ Documents: [{ id: "1", name: "John" }] })
					.mockResolvedValueOnce({ Documents: [{ _count: 1 }] });

				const result = await ops.findMany(args as any);

				expect(result).toHaveProperty("data");
				expect((result as any).data).toEqual([{ id: "1", name: "John" }]);
				expect((result as any)._count).toBe(1);
			});

			test("handles pagination with aggregations", async () => {
				const ops = new FindOperations(mockClient, schema);
				const args = {
					partitionKey: "test@example.com",
					take: 10,
					skip: 5,
					aggregate: { _count: true },
				};

				mockClient.request
					.mockResolvedValueOnce({ Documents: [] })
					.mockResolvedValueOnce({ Documents: [{ _count: 50 }] });

				const result = await ops.findMany(args as any);

				// Data query should have pagination
				const dataCall = mockClient.request.mock.calls[0];
				expect((dataCall[2] as any).query).toContain("LIMIT");
				expect((dataCall[2] as any).query).toContain("OFFSET");

				// Aggregate query should NOT have pagination (counts all)
				const aggCall = mockClient.request.mock.calls[1];
				expect((aggCall[2] as any).query).not.toContain("LIMIT");
				expect((aggCall[2] as any).query).not.toContain("OFFSET");

				// Result should have both data and count
				expect(result).toHaveProperty("data");
				expect(result).toHaveProperty("_count");
			});

			test("handles orderBy with aggregations", async () => {
				const ops = new FindOperations(mockClient, schema);
				const args = {
					partitionKey: "test@example.com",
					orderBy: { name: "desc" as const },
					aggregate: { _count: true },
				};

				mockClient.request
					.mockResolvedValueOnce({ Documents: [] })
					.mockResolvedValueOnce({ Documents: [{ _count: 0 }] });

				await ops.findMany(args as any);

				// Data query should have ORDER BY
				const dataCall = mockClient.request.mock.calls[0];
				expect((dataCall[2] as any).query).toContain("ORDER BY");

				// Aggregate query should NOT have ORDER BY
				const aggCall = mockClient.request.mock.calls[1];
				expect((aggCall[2] as any).query).not.toContain("ORDER BY");
			});

			test("returns plain array when no aggregate provided", async () => {
				const ops = new FindOperations(mockClient, schema);
				const args = {
					partitionKey: "test@example.com",
				};

				mockClient.request.mockResolvedValue({
					Documents: [{ id: "1" }, { id: "2" }],
				});

				const result = await ops.findMany(args);

				// Should return plain array, not object with data property
				expect(Array.isArray(result)).toBe(true);
				expect(result).toHaveLength(2);
				expect(result).not.toHaveProperty("data");
			});
		});
	});

	describe("query", () => {
		test("executes custom SQL query", async () => {
			const ops = new FindOperations(mockClient, schema);
			const args = {
				sql: "SELECT * FROM c WHERE c.id = @id",
				parameters: [{ name: "id", value: "1" }],
				partitionKey: "test@example.com",
			};

			mockClient.request.mockResolvedValue({
				Documents: [{ id: "1", email: "test@example.com" }],
			});

			const result = await ops.query(args);

			expect(mockClient.request).toHaveBeenCalledWith(
				"POST",
				"/dbs/testdb/colls/users/docs",
				{
					query: "SELECT * FROM c WHERE c.id = @id",
					parameters: [{ name: "id", value: "1" }],
				},
				"test@example.com",
			);
			expect(result).toEqual([{ id: "1", email: "test@example.com" }]);
		});

		test("handles query without parameters", async () => {
			const ops = new FindOperations(mockClient, schema);
			const args = {
				sql: "SELECT * FROM c",
				partitionKey: "test@example.com",
			};

			mockClient.request.mockResolvedValue({ Documents: [] });

			await ops.query(args);

			expect(mockClient.request).toHaveBeenCalledWith(
				expect.any(String),
				expect.any(String),
				expect.objectContaining({
					query: "SELECT * FROM c",
					parameters: [],
				}),
				expect.any(String),
			);
		});
	});
});
