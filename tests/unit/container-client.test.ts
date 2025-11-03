import { ContainerClient } from "../../src/client/container-client";
import type { CosmosClient } from "../../src/client/cosmos-client";
import { container, field } from "../../src/schema";

describe("ContainerClient", () => {
	let mockCosmosClient: jest.Mocked<CosmosClient>;

	beforeEach(() => {
		jest.clearAllMocks();

		mockCosmosClient = {
			getDatabase: jest.fn().mockReturnValue("testdb"),
			request: jest.fn(),
		} as any;
	});

	test("creates container client with schema", () => {
		const schema = container("users", {
			id: field.string(),
			email: field.string(),
		}).partitionKey("email");

		const client = new ContainerClient(mockCosmosClient, schema);

		expect(client).toBeDefined();
	});

	test("delegates findUnique to FindOperations", async () => {
		const schema = container("users", {
			id: field.string(),
			email: field.string(),
		}).partitionKey("email");

		const client = new ContainerClient(mockCosmosClient, schema);
		const args = { where: { id: "1", email: "test@example.com" } };
		const expectedResult = { id: "1", email: "test@example.com" };

		mockCosmosClient.request.mockResolvedValue(expectedResult);

		const result = await client.findUnique(args);

		expect(mockCosmosClient.request).toHaveBeenCalledWith(
			"GET",
			"/dbs/testdb/colls/users/docs/1",
			undefined,
			"test@example.com",
		);
		expect(result).toEqual(expectedResult);
	});

	test("delegates findMany to FindOperations", async () => {
		const schema = container("users", {
			id: field.string(),
			email: field.string(),
		}).partitionKey("email");

		const client = new ContainerClient(mockCosmosClient, schema);
		const args = { partitionKey: "test@example.com" };
		const expectedResult = [{ id: "1", email: "test@example.com" }];

		mockCosmosClient.request.mockResolvedValue({
			Documents: expectedResult,
		});

		const result = await client.findMany(args);

		expect(mockCosmosClient.request).toHaveBeenCalled();
		expect(result).toEqual(expectedResult);
	});

	test("delegates query to FindOperations", async () => {
		const schema = container("users", {
			id: field.string(),
			email: field.string(),
		}).partitionKey("email");

		const client = new ContainerClient(mockCosmosClient, schema);
		const args = { sql: "SELECT * FROM c", partitionKey: "test@example.com" };
		const expectedResult = [{ id: "1", email: "test@example.com" }];

		mockCosmosClient.request.mockResolvedValue({
			Documents: expectedResult,
		});

		const result = await client.query(args);

		expect(mockCosmosClient.request).toHaveBeenCalled();
		expect(result).toEqual(expectedResult);
	});

	test("delegates create to CreateOperations", async () => {
		const schema = container("users", {
			id: field.string(),
			email: field.string(),
		}).partitionKey("email");

		const client = new ContainerClient(mockCosmosClient, schema);
		const args = { data: { id: "1", email: "test@example.com" } };
		const expectedResult = { id: "1", email: "test@example.com" };

		mockCosmosClient.request.mockResolvedValue(expectedResult);

		const result = await client.create(args);

		expect(mockCosmosClient.request).toHaveBeenCalledWith(
			"POST",
			"/dbs/testdb/colls/users/docs",
			expect.objectContaining({ id: "1", email: "test@example.com" }),
			"test@example.com",
		);
		expect(result).toEqual(expectedResult);
	});

	test("delegates createMany to CreateOperations", async () => {
		const schema = container("users", {
			id: field.string(),
			email: field.string(),
		}).partitionKey("email");

		const client = new ContainerClient(mockCosmosClient, schema);
		const args = {
			data: [
				{ id: "1", email: "test@example.com" },
				{ id: "2", email: "test@example.com" },
			],
			partitionKey: "test@example.com",
		};
		const expectedResult = [
			{ id: "1", email: "test@example.com" },
			{ id: "2", email: "test@example.com" },
		];

		mockCosmosClient.request.mockResolvedValue(expectedResult);

		const result = await client.createMany(args);

		expect(mockCosmosClient.request).toHaveBeenCalledTimes(1);
		expect(result).toEqual(expectedResult);
	});

	test("delegates update to UpdateOperations", async () => {
		const schema = container("users", {
			id: field.string(),
			email: field.string(),
		}).partitionKey("email");

		const client = new ContainerClient(mockCosmosClient, schema);
		const args = {
			where: { id: "1", email: "test@example.com" },
			data: { email: "updated@example.com" },
		};
		const existingDoc = { id: "1", email: "test@example.com" };
		const expectedResult = { id: "1", email: "updated@example.com" };

		// Mock GET request for existing document
		mockCosmosClient.request
			.mockResolvedValueOnce(existingDoc)
			.mockResolvedValueOnce(expectedResult);

		const result = await client.update(args);

		expect(mockCosmosClient.request).toHaveBeenCalledTimes(2);
		expect(result).toEqual(expectedResult);
	});

	test("delegates upsert to CreateOperations", async () => {
		const schema = container("users", {
			id: field.string(),
			email: field.string(),
		}).partitionKey("email");

		const client = new ContainerClient(mockCosmosClient, schema);
		const args = {
			data: { id: "1", email: "test@example.com" },
		};
		const expectedResult = { id: "1", email: "test@example.com" };

		mockCosmosClient.request.mockResolvedValue(expectedResult);

		const result = await client.upsert(args);

		expect(mockCosmosClient.request).toHaveBeenCalled();
		expect(result).toEqual(expectedResult);
	});

	test("delegates delete to DeleteOperations", async () => {
		const schema = container("users", {
			id: field.string(),
			email: field.string(),
		}).partitionKey("email");

		const client = new ContainerClient(mockCosmosClient, schema);
		const args = { where: { id: "1", email: "test@example.com" } };

		mockCosmosClient.request.mockResolvedValue(undefined);

		await client.delete(args);

		expect(mockCosmosClient.request).toHaveBeenCalledWith(
			"DELETE",
			"/dbs/testdb/colls/users/docs/1",
			undefined,
			"test@example.com",
		);
	});
});
