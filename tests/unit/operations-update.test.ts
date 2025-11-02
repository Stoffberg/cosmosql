import type { CosmosClient } from "../../src/client/cosmos-client";
import { CosmosError } from "../../src/errors/cosmos-error";
import { UpdateOperations } from "../../src/operations/update";
import { container, field } from "../../src/schema";

// Mock fetch globally
global.fetch = jest.fn();

describe("UpdateOperations", () => {
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

	describe("update", () => {
		test("updates existing document", async () => {
			const ops = new UpdateOperations(mockClient, schema);
			const args = {
				where: { id: "1", email: "test@example.com" },
				data: { name: "Updated Name" },
			};
			const existingDoc = {
				id: "1",
				email: "test@example.com",
				name: "Old Name",
			};
			const updatedDoc = { ...existingDoc, ...args.data };

			mockClient.request
				.mockResolvedValueOnce(existingDoc) // GET
				.mockResolvedValueOnce(updatedDoc); // PUT

			const result = await ops.update(args);

			expect(mockClient.request).toHaveBeenCalledTimes(2);
			expect(mockClient.request).toHaveBeenNthCalledWith(
				1,
				"GET",
				"/dbs/testdb/colls/users/docs/1",
				undefined,
				"test@example.com",
			);
			expect(mockClient.request).toHaveBeenNthCalledWith(
				2,
				"PUT",
				"/dbs/testdb/colls/users/docs/1",
				updatedDoc,
				"test@example.com",
			);
			expect(result).toEqual(updatedDoc);
		});

		test("merges partial updates with existing document", async () => {
			const ops = new UpdateOperations(mockClient, schema);
			const args = {
				where: { id: "1", email: "test@example.com" },
				data: { name: "New Name" },
			};
			const existingDoc = {
				id: "1",
				email: "test@example.com",
				name: "Old Name",
				role: "user",
			};
			const updatedDoc = { ...existingDoc, name: "New Name" };

			mockClient.request
				.mockResolvedValueOnce(existingDoc)
				.mockResolvedValueOnce(updatedDoc);

			const result = await ops.update(args);

			expect(result).toEqual(updatedDoc);
			expect(result).toHaveProperty("role", "user"); // Preserved from existing
		});

		test("throws error when partition key not defined", async () => {
			const schemaWithoutPK = container("users", {
				id: field.string(),
				email: field.string(),
			});

			const ops = new UpdateOperations(mockClient, schemaWithoutPK as any);
			const args = {
				where: { id: "1", email: "test@example.com" },
				data: { name: "Updated" },
			};

			await expect((ops as any).update(args)).rejects.toThrow(
				"Container must have partition key defined",
			);
		});
	});

	describe("upsert", () => {
		test("updates existing document", async () => {
			const ops = new UpdateOperations(mockClient, schema);
			const args = {
				where: { id: "1", email: "test@example.com" },
				create: { id: "1", email: "test@example.com", name: "New" },
				update: { name: "Updated" },
			};
			const existingDoc = { id: "1", email: "test@example.com", name: "Old" };
			const updatedDoc = { ...existingDoc, name: "Updated" };

			mockClient.request
				.mockResolvedValueOnce(existingDoc) // GET in update
				.mockResolvedValueOnce(updatedDoc); // PUT in update

			const result = await ops.upsert(args);

			expect(result).toEqual(updatedDoc);
			expect(mockClient.request).toHaveBeenCalledTimes(2);
		});

		test("creates document when it does not exist", async () => {
			const ops = new UpdateOperations(mockClient, schema);
			const args = {
				where: { id: "1", email: "test@example.com" },
				create: { id: "1", email: "test@example.com", name: "New" },
				update: { name: "Updated" },
			};
			const createdDoc = { id: "1", email: "test@example.com", name: "New" };

			const notFoundError = new CosmosError(404, "NotFound", "Not found");
			mockClient.request
				.mockRejectedValueOnce(notFoundError) // GET fails
				.mockResolvedValueOnce(createdDoc); // POST succeeds

			const result = await ops.upsert(args);

			expect(result).toEqual(createdDoc);
			expect(mockClient.request).toHaveBeenCalledTimes(2);
		});

		test("throws error if update fails for non-404 error", async () => {
			const ops = new UpdateOperations(mockClient, schema);
			const args = {
				where: { id: "1", email: "test@example.com" },
				create: { id: "1", email: "test@example.com", name: "New" },
				update: { name: "Updated" },
			};

			const serverError = new CosmosError(500, "ServerError", "Server error");
			mockClient.request.mockRejectedValueOnce(serverError);

			await expect(ops.upsert(args)).rejects.toThrow(CosmosError);
		});
	});
});
