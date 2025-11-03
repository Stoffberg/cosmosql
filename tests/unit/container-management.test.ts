import { afterEach, beforeEach, describe, expect, jest, test } from "bun:test";
import { CosmosClient } from "../../src/client/cosmos-client";
import { container, field } from "../../src/schema";

// Store the real fetch
const realFetch = global.fetch;

describe("Container Management", () => {
	beforeEach(() => {
		// Mock fetch for each test
		global.fetch = jest.fn() as any;
		jest.clearAllMocks();
	});

	afterEach(() => {
		// Restore real fetch after each test
		global.fetch = realFetch;
	});

	describe("ContainerSchema Configuration", () => {
		test("supports throughput configuration", () => {
			const users = container("users", {
				id: field.string(),
				email: field.string(),
			})
				.partitionKey("email")
				.throughput(400);

			expect(users.config?.throughput).toBe(400);
			expect(users.partitionKeyField).toBe("email");
		});

		test("supports indexing policy configuration", () => {
			const posts = container("posts", {
				id: field.string(),
				title: field.string(),
				content: field.string(),
			})
				.partitionKey("id")
				.indexing({
					automatic: true,
					excludedPaths: [{ path: "/content/?" }],
				});

			expect(posts.config?.indexing).toBeDefined();
			expect(posts.config?.indexing?.automatic).toBe(true);
			expect(posts.config?.indexing?.excludedPaths).toHaveLength(1);
			expect(posts.config?.indexing?.excludedPaths?.[0].path).toBe("/content/?");
		});

		test("supports chaining configuration methods", () => {
			const comments = container("comments", {
				id: field.string(),
				postId: field.string(),
				text: field.string(),
			})
				.partitionKey("postId")
				.throughput(800)
				.indexing({
					automatic: true,
					excludedPaths: [{ path: "/text/?" }],
				});

			expect(comments.config?.throughput).toBe(800);
			expect(comments.config?.indexing?.excludedPaths).toHaveLength(1);
			expect(comments.partitionKeyField).toBe("postId");
		});
	});

	describe("CosmosClient Container Management", () => {
		test("databaseExists returns true when database exists", async () => {
			(fetch as unknown as jest.Mock).mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: async () => ({ DocumentCollections: [] }),
			});

			const client = new CosmosClient({
				endpoint: "https://test.documents.azure.com:443",
				key: "test-key",
				database: "testdb",
			});

			const exists = await client.databaseExists();
			expect(exists).toBe(true);
			expect(fetch).toHaveBeenCalledWith(
				expect.stringContaining("/dbs/testdb/colls"),
				expect.objectContaining({ method: "GET" }),
			);
		});

		test("databaseExists returns false when database does not exist", async () => {
			(fetch as unknown as jest.Mock).mockResolvedValueOnce({
				ok: false,
				status: 404,
				json: async () => ({ code: "NotFound" }),
			});

			const client = new CosmosClient({
				endpoint: "https://test.documents.azure.com:443",
				key: "test-key",
				database: "testdb",
			});

			const exists = await client.databaseExists();
			expect(exists).toBe(false);
		});

		test("createDatabase creates a new database", async () => {
			(fetch as unknown as jest.Mock).mockResolvedValueOnce({
				ok: true,
				status: 201,
				json: async () => ({ id: "testdb" }),
			});

			const client = new CosmosClient({
				endpoint: "https://test.documents.azure.com:443",
				key: "test-key",
				database: "testdb",
			});

			await client.createDatabase();

			expect(fetch).toHaveBeenCalledWith(
				expect.stringContaining("/dbs"),
				expect.objectContaining({
					method: "POST",
					body: JSON.stringify({ id: "testdb" }),
				}),
			);
		});

		test("containerExists returns true when container exists", async () => {
			(fetch as unknown as jest.Mock).mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: async () => ({ id: "users" }),
			});

			const client = new CosmosClient({
				endpoint: "https://test.documents.azure.com:443",
				key: "test-key",
				database: "testdb",
			});

			const exists = await client.containerExists("users");
			expect(exists).toBe(true);
			expect(fetch).toHaveBeenCalledWith(
				expect.stringContaining("/dbs/testdb/colls/users"),
				expect.objectContaining({ method: "GET" }),
			);
		});

		test("containerExists returns false when container does not exist", async () => {
			(fetch as unknown as jest.Mock).mockResolvedValueOnce({
				ok: false,
				status: 404,
				json: async () => ({ code: "NotFound" }),
			});

			const client = new CosmosClient({
				endpoint: "https://test.documents.azure.com:443",
				key: "test-key",
				database: "testdb",
			});

			const exists = await client.containerExists("users");
			expect(exists).toBe(false);
		});

		test("getContainer returns container info when it exists", async () => {
			const containerInfo = {
				id: "users",
				partitionKey: { paths: ["/email"], kind: "Hash" },
				_rid: "rid123",
				_ts: 1234567890,
				_self: "/self",
			};

			(fetch as unknown as jest.Mock).mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: async () => containerInfo,
			});

			const client = new CosmosClient({
				endpoint: "https://test.documents.azure.com:443",
				key: "test-key",
				database: "testdb",
			});

			const result = await client.getContainer("users");
			expect(result).toEqual(containerInfo);
		});

		test("getContainer returns null when container does not exist", async () => {
			(fetch as unknown as jest.Mock).mockResolvedValueOnce({
				ok: false,
				status: 404,
				json: async () => ({ code: "NotFound" }),
			});

			const client = new CosmosClient({
				endpoint: "https://test.documents.azure.com:443",
				key: "test-key",
				database: "testdb",
			});

			const result = await client.getContainer("users");
			expect(result).toBeNull();
		});

		test("createContainer creates a new container", async () => {
			(fetch as unknown as jest.Mock).mockResolvedValueOnce({
				ok: true,
				status: 201,
				json: async () => ({ id: "users" }),
			});

			const client = new CosmosClient({
				endpoint: "https://test.documents.azure.com:443",
				key: "test-key",
				database: "testdb",
			});

			await client.createContainer({
				id: "users",
				partitionKey: { paths: ["/email"], kind: "Hash" },
			});

			expect(fetch).toHaveBeenCalledWith(
				expect.stringContaining("/dbs/testdb/colls"),
				expect.objectContaining({
					method: "POST",
					body: JSON.stringify({
						id: "users",
						partitionKey: { paths: ["/email"], kind: "Hash" },
					}),
				}),
			);
		});

		test("updateContainer updates existing container", async () => {
			const existingContainer = {
				id: "users",
				partitionKey: { paths: ["/email"], kind: "Hash" },
				_rid: "rid123",
				_ts: 1234567890,
				_self: "/self",
			};

			(fetch as unknown as jest.Mock).mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: async () => existingContainer,
			});

			const client = new CosmosClient({
				endpoint: "https://test.documents.azure.com:443",
				key: "test-key",
				database: "testdb",
			});

			await client.updateContainer("users", {
				id: "users",
				partitionKey: { paths: ["/email"], kind: "Hash" },
				_rid: "rid123",
				_ts: 1234567890,
				_self: "/self",
			});

			// Should call PUT
			expect(fetch).toHaveBeenCalledTimes(1);
			expect(fetch).toHaveBeenCalledWith(
				expect.stringContaining("/dbs/testdb/colls/users"),
				expect.objectContaining({ method: "PUT" }),
			);
		});

		test("listContainers returns all containers", async () => {
			const response = {
				DocumentCollections: [{ id: "users" }, { id: "posts" }, { id: "comments" }],
			};

			(fetch as unknown as jest.Mock).mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: async () => response,
			});

			const client = new CosmosClient({
				endpoint: "https://test.documents.azure.com:443",
				key: "test-key",
				database: "testdb",
			});

			const containers = await client.listContainers();
			expect(containers).toHaveLength(3);
			expect(containers.map((c) => c.id)).toEqual(["users", "posts", "comments"]);
		});

		test("deleteContainer deletes a container", async () => {
			(fetch as unknown as jest.Mock).mockResolvedValueOnce({
				ok: true,
				status: 204,
				json: async () => ({}),
			});

			const client = new CosmosClient({
				endpoint: "https://test.documents.azure.com:443",
				key: "test-key",
				database: "testdb",
			});

			await client.deleteContainer("users");

			expect(fetch).toHaveBeenCalledWith(
				expect.stringContaining("/dbs/testdb/colls/users"),
				expect.objectContaining({ method: "DELETE" }),
			);
		});
	});
});
