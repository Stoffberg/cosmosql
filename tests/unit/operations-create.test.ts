import type { CosmosClient } from "../../src/client/cosmos-client";
import { CreateOperations } from "../../src/operations/create";
import { container, field } from "../../src/schema";

describe("CreateOperations", () => {
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
			role: field.string().default("user"),
			name: field.string().optional(),
		}).partitionKey("email");
	});

	describe("create", () => {
		test("creates document with required fields", async () => {
			const ops = new CreateOperations(mockClient, schema);
			const data = { id: "1", email: "test@example.com" };
			const expectedResult = {
				id: "1",
				email: "test@example.com",
				role: "user",
			};

			mockClient.request.mockResolvedValue(expectedResult);

			const result = await ops.create({ data });

			expect(mockClient.request).toHaveBeenCalledWith(
				"POST",
				"/dbs/testdb/colls/users/docs",
				expectedResult,
				"test@example.com",
			);
			expect(result).toEqual(expectedResult);
		});

		test("applies default values", async () => {
			const ops = new CreateOperations(mockClient, schema);
			const data = { id: "1", email: "test@example.com" };
			const expectedResult = {
				id: "1",
				email: "test@example.com",
				role: "user",
			};

			mockClient.request.mockResolvedValue(expectedResult);

			await ops.create({ data });

			expect(mockClient.request).toHaveBeenCalledWith(
				expect.any(String),
				expect.any(String),
				expect.objectContaining({ role: "user" }),
				expect.any(String),
			);
		});

		test("does not override provided values with defaults", async () => {
			const ops = new CreateOperations(mockClient, schema);
			const data = { id: "1", email: "test@example.com", role: "admin" };
			const expectedResult = { ...data };

			mockClient.request.mockResolvedValue(expectedResult);

			await ops.create({ data });

			expect(mockClient.request).toHaveBeenCalledWith(
				expect.any(String),
				expect.any(String),
				expect.objectContaining({ role: "admin" }),
				expect.any(String),
			);
		});

		test("includes partition key in request", async () => {
			const ops = new CreateOperations(mockClient, schema);
			const data = { id: "1", email: "test@example.com" };
			const expectedResult = { ...data, role: "user" };

			mockClient.request.mockResolvedValue(expectedResult);

			await ops.create({ data });

			expect(mockClient.request).toHaveBeenCalledWith(
				expect.any(String),
				expect.any(String),
				expect.any(Object),
				"test@example.com",
			);
		});

		test("handles optional fields", async () => {
			const ops = new CreateOperations(mockClient, schema);
			const data = { id: "1", email: "test@example.com", name: "John" };
			const expectedResult = { ...data, role: "user" };

			mockClient.request.mockResolvedValue(expectedResult);

			const result = await ops.create({ data });

			expect(result).toEqual(expectedResult);
		});

		test("handles schema without partition key", async () => {
			const schemaWithoutPK = container("users", {
				id: field.string(),
				name: field.string(),
			});

			const ops = new CreateOperations(mockClient, schemaWithoutPK as any);
			const data = { id: "1", name: "John" };
			const expectedResult = { ...data };

			mockClient.request.mockResolvedValue(expectedResult);

			const result = await ops.create({ data });

			expect(mockClient.request).toHaveBeenCalledWith(
				expect.any(String),
				expect.any(String),
				expect.any(Object),
				undefined,
			);
			expect(result).toEqual(expectedResult);
		});

		test("applies function defaults", async () => {
			const schemaWithFunctionDefault = container("users", {
				id: field.string(),
				email: field.string(),
				createdAt: field.date().default(() => new Date()),
			}).partitionKey("email");

			const ops = new CreateOperations(mockClient, schemaWithFunctionDefault as any);
			const data = { id: "1", email: "test@example.com" };

			mockClient.request.mockResolvedValue({ ...data, createdAt: new Date() });

			await ops.create({ data });

			const callArgs = mockClient.request.mock.calls[0];
			const document = callArgs[2] as any;

			expect(document).toHaveProperty("createdAt");
			expect(document.createdAt).toBeInstanceOf(Date);
		});
	});

	describe("createMany", () => {
		test("creates multiple documents", async () => {
			const ops = new CreateOperations(mockClient, schema);
			const data = [
				{ id: "1", email: "test1@example.com" },
				{ id: "2", email: "test1@example.com" },
			];
			const partitionKey = "test1@example.com";
			const expectedResult = [
				{ id: "1", email: "test1@example.com", role: "user" },
				{ id: "2", email: "test1@example.com", role: "user" },
			];

			mockClient.request.mockResolvedValue(expectedResult);

			const result = await ops.createMany({ data, partitionKey });

			expect(mockClient.request).toHaveBeenCalledWith(
				"POST",
				"/dbs/testdb/colls/users",
				expect.arrayContaining([
					expect.objectContaining({ operationType: "Create" }),
					expect.objectContaining({ operationType: "Create" }),
				]),
				partitionKey,
			);
			expect(result).toEqual(expectedResult);
		});

		test("applies defaults to all documents", async () => {
			const ops = new CreateOperations(mockClient, schema);
			const data = [
				{ id: "1", email: "test1@example.com" },
				{ id: "2", email: "test1@example.com" },
			];
			const partitionKey = "test1@example.com";

			mockClient.request.mockResolvedValue([]);

			await ops.createMany({ data, partitionKey });

			const callArgs = mockClient.request.mock.calls[0];
			const operations = callArgs[2] as Array<{ resourceBody: any }>;

			expect(operations[0].resourceBody).toHaveProperty("role", "user");
			expect(operations[1].resourceBody).toHaveProperty("role", "user");
		});

		test("throws error if documents have different partition keys", async () => {
			const ops = new CreateOperations(mockClient, schema);
			const data = [
				{ id: "1", email: "test1@example.com" },
				{ id: "2", email: "test2@example.com" },
			];
			const partitionKey = "test1@example.com";

			await expect(ops.createMany({ data, partitionKey })).rejects.toThrow(
				"All documents in createMany must share the same partition key",
			);
		});

		test("verifies partition key matches all documents", async () => {
			const ops = new CreateOperations(mockClient, schema);
			const data = [
				{ id: "1", email: "test1@example.com" },
				{ id: "2", email: "test1@example.com" },
			];
			const partitionKey = "test1@example.com";

			mockClient.request.mockResolvedValue([]);

			await ops.createMany({ data, partitionKey });

			expect(mockClient.request).toHaveBeenCalled();
		});
	});
});
