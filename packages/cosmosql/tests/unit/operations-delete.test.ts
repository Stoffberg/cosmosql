import { beforeEach, describe, expect, type Mocked, test, vi } from "vitest";
import type { CosmosClient } from "../../src/client/cosmos-client";
import { DeleteOperations } from "../../src/operations/delete";
import { container, field } from "../../src/schema";

describe("DeleteOperations", () => {
	let mockClient: Mocked<CosmosClient>;
	let schema: any;

	beforeEach(() => {
		vi.clearAllMocks();

		mockClient = {
			getDatabase: vi.fn().mockReturnValue("testdb"),
			request: vi.fn(),
		} as any;

		schema = container("users", {
			id: field.string(),
			email: field.string(),
		}).partitionKey("email");
	});

	describe("delete", () => {
		test("deletes document by id and partition key", async () => {
			const ops = new DeleteOperations(mockClient, schema);
			const args = { where: { id: "1", email: "test@example.com" } };

			mockClient.request.mockResolvedValue(undefined);

			await ops.delete(args);

			expect(mockClient.request).toHaveBeenCalledWith(
				"DELETE",
				"/dbs/testdb/colls/users/docs/1",
				undefined,
				"test@example.com",
			);
		});

		test("throws error when partition key not defined", async () => {
			const schemaWithoutPK = container("users", {
				id: field.string(),
				email: field.string(),
			});

			const ops = new DeleteOperations(mockClient, schemaWithoutPK as any);
			const args = { where: { id: "1", email: "test@example.com" } };

			await expect((ops as any).delete(args)).rejects.toThrow(
				"Container must have partition key defined",
			);
		});

		test("uses correct partition key value", async () => {
			const ops = new DeleteOperations(mockClient, schema);
			const args = { where: { id: "1", email: "test@example.com" } };

			mockClient.request.mockResolvedValue(undefined);

			await ops.delete(args);

			expect(mockClient.request).toHaveBeenCalledWith(
				"DELETE",
				expect.stringContaining("/docs/1"),
				undefined,
				"test@example.com",
			);
		});
	});
});
