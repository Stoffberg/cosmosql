import { ContainerClient } from "../../src/client/container-client";
import type { CosmosClient } from "../../src/client/cosmos-client";
import { container, field } from "../../src/schema";

// Mock the operations
jest.mock("../../src/operations/find");
jest.mock("../../src/operations/create");
jest.mock("../../src/operations/update");
jest.mock("../../src/operations/delete");

import { CreateOperations } from "../../src/operations/create";
import { DeleteOperations } from "../../src/operations/delete";
import { FindOperations } from "../../src/operations/find";
import { UpdateOperations } from "../../src/operations/update";

describe("ContainerClient", () => {
	let mockCosmosClient: jest.Mocked<CosmosClient>;
	let mockFindOps: jest.Mocked<FindOperations<any, any>>;
	let mockCreateOps: jest.Mocked<CreateOperations<any, any>>;
	let mockUpdateOps: jest.Mocked<UpdateOperations<any, any>>;
	let mockDeleteOps: jest.Mocked<DeleteOperations<any, any>>;

	beforeEach(() => {
		mockCosmosClient = {
			getDatabase: jest.fn().mockReturnValue("testdb"),
		} as any;

		mockFindOps = {
			findUnique: jest.fn(),
			findMany: jest.fn(),
			query: jest.fn(),
		} as any;

		mockCreateOps = {
			create: jest.fn(),
			createMany: jest.fn(),
		} as any;

		mockUpdateOps = {
			update: jest.fn(),
			upsert: jest.fn(),
		} as any;

		mockDeleteOps = {
			delete: jest.fn(),
		} as any;

		(FindOperations as jest.Mock).mockImplementation(() => mockFindOps);
		(CreateOperations as jest.Mock).mockImplementation(() => mockCreateOps);
		(UpdateOperations as jest.Mock).mockImplementation(() => mockUpdateOps);
		(DeleteOperations as jest.Mock).mockImplementation(() => mockDeleteOps);
	});

	test("creates container client with schema", () => {
		const schema = container("users", {
			id: field.string(),
			email: field.string(),
		}).partitionKey("email");

		const client = new ContainerClient(mockCosmosClient, schema);

		expect(client).toBeDefined();
		expect(FindOperations).toHaveBeenCalledWith(mockCosmosClient, schema);
		expect(CreateOperations).toHaveBeenCalledWith(mockCosmosClient, schema);
		expect(UpdateOperations).toHaveBeenCalledWith(mockCosmosClient, schema);
		expect(DeleteOperations).toHaveBeenCalledWith(mockCosmosClient, schema);
	});

	test("delegates findUnique to FindOperations", async () => {
		const schema = container("users", {
			id: field.string(),
			email: field.string(),
		}).partitionKey("email");

		const client = new ContainerClient(mockCosmosClient, schema);
		const args = { where: { id: "1", email: "test@example.com" } };
		const expectedResult = { id: "1", email: "test@example.com" };

		mockFindOps.findUnique.mockResolvedValue(expectedResult);

		const result = await client.findUnique(args);

		expect(mockFindOps.findUnique).toHaveBeenCalledWith(args);
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

		mockFindOps.findMany.mockResolvedValue(expectedResult);

		const result = await client.findMany(args);

		expect(mockFindOps.findMany).toHaveBeenCalledWith(args);
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

		mockFindOps.query.mockResolvedValue(expectedResult);

		const result = await client.query(args);

		expect(mockFindOps.query).toHaveBeenCalledWith(args);
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

		mockCreateOps.create.mockResolvedValue(expectedResult);

		const result = await client.create(args);

		expect(mockCreateOps.create).toHaveBeenCalledWith(args);
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
				{ id: "2", email: "test2@example.com" },
			],
			partitionKey: "test@example.com",
		};
		const expectedResult = [
			{ id: "1", email: "test@example.com" },
			{ id: "2", email: "test2@example.com" },
		];

		mockCreateOps.createMany.mockResolvedValue(expectedResult);

		const result = await client.createMany(args);

		expect(mockCreateOps.createMany).toHaveBeenCalledWith(args);
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
		const expectedResult = { id: "1", email: "updated@example.com" };

		mockUpdateOps.update.mockResolvedValue(expectedResult);

		const result = await client.update(args);

		expect(mockUpdateOps.update).toHaveBeenCalledWith(args);
		expect(result).toEqual(expectedResult);
	});

	test("delegates upsert to UpdateOperations", async () => {
		const schema = container("users", {
			id: field.string(),
			email: field.string(),
		}).partitionKey("email");

		const client = new ContainerClient(mockCosmosClient, schema);
		const args = {
			where: { id: "1", email: "test@example.com" },
			create: { id: "1", email: "test@example.com" },
			update: { email: "updated@example.com" },
		};
		const expectedResult = { id: "1", email: "updated@example.com" };

		mockUpdateOps.upsert.mockResolvedValue(expectedResult);

		const result = await client.upsert(args);

		expect(mockUpdateOps.upsert).toHaveBeenCalledWith(args);
		expect(result).toEqual(expectedResult);
	});

	test("delegates delete to DeleteOperations", async () => {
		const schema = container("users", {
			id: field.string(),
			email: field.string(),
		}).partitionKey("email");

		const client = new ContainerClient(mockCosmosClient, schema);
		const args = { where: { id: "1", email: "test@example.com" } };

		mockDeleteOps.delete.mockResolvedValue(undefined);

		await client.delete(args);

		expect(mockDeleteOps.delete).toHaveBeenCalledWith(args);
	});
});
