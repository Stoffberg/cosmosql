import { afterEach, beforeEach, describe, expect, jest, test } from "bun:test";
import { container, createClient, field } from "../../src";
import type { CosmosClientConfig } from "../../src/client/cosmos-client";

// Store the real fetch
const realFetch = global.fetch;

describe("withContainers Modes", () => {
	beforeEach(() => {
		// Mock fetch for each test
		global.fetch = jest.fn() as any;
		jest.clearAllMocks();
	});

	afterEach(() => {
		// Restore real fetch after each test
		global.fetch = realFetch;
	});

	describe("skip mode", () => {
		test("skips all database and container checks", async () => {
			const config: CosmosClientConfig = {
				endpoint: "https://test.documents.azure.com:443",
				key: "test-key",
				database: "testdb",
				mode: "skip",
			};

			const client = createClient(config);

			const users = container("users", {
				id: field.string(),
				email: field.string(),
			}).partitionKey("email");

			const containers = await client.withContainers({ users });

			// Should not make any HEAD/GET calls to check existence
			expect(fetch).not.toHaveBeenCalled();
			expect(containers.users).toBeDefined();
		});

		test("returns container clients immediately", async () => {
			const config: CosmosClientConfig = {
				endpoint: "https://test.documents.azure.com:443",
				key: "test-key",
				database: "testdb",
				mode: "skip",
			};

			const client = createClient(config);

			const containers = await client.withContainers({
				users: container("users", {
					id: field.string(),
					email: field.string(),
				}).partitionKey("email"),
				posts: container("posts", {
					id: field.string(),
					title: field.string(),
				}).partitionKey("id"),
			});

			expect(containers.users).toBeDefined();
			expect(containers.posts).toBeDefined();
			expect(typeof containers.users.findUnique).toBe("function");
			expect(typeof containers.posts.findUnique).toBe("function");
		});
	});

	describe("verify mode", () => {
		test("throws error when database does not exist", async () => {
			(fetch as unknown as jest.Mock).mockResolvedValueOnce({
				ok: false,
				status: 404,
				json: async () => ({ code: "NotFound" }),
			});

			const config: CosmosClientConfig = {
				endpoint: "https://test.documents.azure.com:443",
				key: "test-key",
				database: "testdb",
				mode: "verify",
			};

			const client = createClient(config);

			const users = container("users", {
				id: field.string(),
				email: field.string(),
			}).partitionKey("email");

			await expect(client.withContainers({ users })).rejects.toThrow(
				'Database "testdb" does not exist. Use mode: "auto-create" to create it automatically.',
			);
		});

		test("throws error when container does not exist", async () => {
			(fetch as unknown as jest.Mock)
				.mockResolvedValueOnce({
					ok: true,
					status: 200,
					json: async () => ({ DocumentCollections: [] }),
				})
				.mockResolvedValueOnce({
					ok: false,
					status: 404,
					json: async () => ({ code: "NotFound" }),
				});

			const config: CosmosClientConfig = {
				endpoint: "https://test.documents.azure.com:443",
				key: "test-key",
				database: "testdb",
				mode: "verify",
			};

			const client = createClient(config);

			const users = container("users", {
				id: field.string(),
				email: field.string(),
			}).partitionKey("email");

			await expect(client.withContainers({ users })).rejects.toThrow(
				'Container "users" does not exist. Use mode: "auto-create" to create it automatically.',
			);
		});

		test("verifies partition key matches existing container", async () => {
			const containerInfo = {
				id: "users",
				partitionKey: { paths: ["/email"], kind: "Hash" },
				indexingPolicy: { automatic: true },
				_rid: "rid123",
				_ts: 1234567890,
				_self: "/self",
			};

			(fetch as unknown as jest.Mock)
				.mockResolvedValueOnce({
					ok: true,
					status: 200,
					json: async () => ({ DocumentCollections: [] }),
				})
				.mockResolvedValueOnce({
					ok: true,
					status: 200,
					json: async () => containerInfo,
				})
				.mockResolvedValueOnce({
					ok: true,
					status: 200,
					json: async () => containerInfo,
				});

			const config: CosmosClientConfig = {
				endpoint: "https://test.documents.azure.com:443",
				key: "test-key",
				database: "testdb",
				mode: "verify",
			};

			const client = createClient(config);

			const users = container("users", {
				id: field.string(),
				email: field.string(),
			}).partitionKey("email");

			const containers = await client.withContainers({ users });
			expect(containers.users).toBeDefined();
		});

		test("throws error on partition key mismatch", async () => {
			const containerInfo = {
				id: "users",
				partitionKey: { paths: ["/id"], kind: "Hash" },
				indexingPolicy: { automatic: true },
				_rid: "rid123",
				_ts: 1234567890,
				_self: "/self",
			};

			(fetch as unknown as jest.Mock)
				.mockResolvedValueOnce({
					ok: true,
					status: 200,
					json: async () => ({ DocumentCollections: [] }),
				})
				.mockResolvedValueOnce({
					ok: true,
					status: 200,
					json: async () => containerInfo,
				})
				.mockResolvedValueOnce({
					ok: true,
					status: 200,
					json: async () => containerInfo,
				});

			const config: CosmosClientConfig = {
				endpoint: "https://test.documents.azure.com:443",
				key: "test-key",
				database: "testdb",
				mode: "verify",
			};

			const client = createClient(config);

			const users = container("users", {
				id: field.string(),
				email: field.string(),
			}).partitionKey("email");

			await expect(client.withContainers({ users })).rejects.toThrow(
				'Partition key mismatch for container "users": expected "/email", found "/id"',
			);
		});

		test("warns on indexing policy mismatch", async () => {
			const containerInfo = {
				id: "posts",
				partitionKey: { paths: ["/id"], kind: "Hash" },
				indexingPolicy: { automatic: true },
				_rid: "rid123",
				_ts: 1234567890,
				_self: "/self",
			};

			const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation((message) => {
				console.log("console.warn called with:", message);
			});

			(fetch as unknown as jest.Mock)
				.mockResolvedValueOnce({
					ok: true,
					status: 200,
					json: async () => ({ DocumentCollections: [] }),
				})
				.mockResolvedValueOnce({
					ok: true,
					status: 200,
					json: async () => containerInfo,
				})
				.mockResolvedValueOnce({
					ok: true,
					status: 200,
					json: async () => containerInfo,
				});

			const config: CosmosClientConfig = {
				endpoint: "https://test.documents.azure.com:443",
				key: "test-key",
				database: "testdb",
				mode: "verify",
			};

			const client = createClient(config);

			const posts = container("posts", {
				id: field.string(),
				content: field.string(),
			})
				.partitionKey("id")
				.indexing({
					automatic: true,
					excludedPaths: [{ path: "/content/?" }],
				});

			await client.withContainers({ posts });

			expect(consoleWarnSpy).toHaveBeenCalledWith(
				expect.stringContaining("Indexing policy mismatch"),
			);

			consoleWarnSpy.mockRestore();
		});
	});

	describe("auto-create mode", () => {
		test("creates database if it does not exist", async () => {
			(fetch as unknown as jest.Mock)
				.mockResolvedValueOnce({
					ok: false,
					status: 404,
					json: async () => ({ code: "NotFound" }),
				})
				.mockResolvedValueOnce({
					ok: true,
					status: 201,
					json: async () => ({ id: "testdb" }),
				})
				.mockResolvedValueOnce({
					ok: false,
					status: 404,
					json: async () => ({ code: "NotFound" }),
				})
				.mockResolvedValueOnce({
					ok: true,
					status: 201,
					json: async () => ({ id: "users" }),
				});

			const config: CosmosClientConfig = {
				endpoint: "https://test.documents.azure.com:443",
				key: "test-key",
				database: "testdb",
				mode: "auto-create",
			};

			const client = createClient(config);

			const users = container("users", {
				id: field.string(),
				email: field.string(),
			}).partitionKey("email");

			const containers = await client.withContainers({ users });

			// Should create database then container
			expect(fetch).toHaveBeenCalledTimes(4);
			expect(containers.users).toBeDefined();
		});

		test("creates container if it does not exist", async () => {
			(fetch as unknown as jest.Mock)
				.mockResolvedValueOnce({
					ok: true,
					status: 200,
					json: async () => ({ DocumentCollections: [] }),
				})
				.mockResolvedValueOnce({
					ok: false,
					status: 404,
					json: async () => ({ code: "NotFound" }),
				})
				.mockResolvedValueOnce({
					ok: true,
					status: 201,
					json: async () => ({ id: "users" }),
				});

			const config: CosmosClientConfig = {
				endpoint: "https://test.documents.azure.com:443",
				key: "test-key",
				database: "testdb",
				mode: "auto-create",
			};

			const client = createClient(config);

			const users = container("users", {
				id: field.string(),
				email: field.string(),
			}).partitionKey("email");

			const containers = await client.withContainers({ users });

			expect(containers.users).toBeDefined();
		});

		test("updates indexing policy when it differs", async () => {
			const containerInfo = {
				id: "posts",
				partitionKey: { paths: ["/id"], kind: "Hash" },
				indexingPolicy: { automatic: true },
				_rid: "rid123",
				_ts: 1234567890,
				_self: "/self",
			};

			(fetch as unknown as jest.Mock)
				.mockResolvedValueOnce({
					ok: true,
					status: 200,
					json: async () => ({ DocumentCollections: [] }),
				})
				.mockResolvedValueOnce({
					ok: true,
					status: 200,
					json: async () => containerInfo,
				})
				.mockResolvedValueOnce({
					ok: true,
					status: 200,
					json: async () => containerInfo,
				})
				.mockResolvedValueOnce({
					ok: true,
					status: 200,
					json: async () => containerInfo,
				});

			const config: CosmosClientConfig = {
				endpoint: "https://test.documents.azure.com:443",
				key: "test-key",
				database: "testdb",
				mode: "auto-create",
			};

			const client = createClient(config);

			const posts = container("posts", {
				id: field.string(),
				content: field.string(),
			})
				.partitionKey("id")
				.indexing({
					automatic: true,
					excludedPaths: [{ path: "/content/?" }],
				});

			const containers = await client.withContainers({ posts });

			// Should call HEAD database, HEAD container, GET container, PUT container
			expect(fetch).toHaveBeenCalledTimes(4);
			expect(containers.posts).toBeDefined();
		});
	});

	describe("Container Management Methods", () => {
		test("listOrphanedContainers lists containers not in schema", async () => {
			const response = {
				DocumentCollections: [
					{ id: "users" },
					{ id: "posts" },
					{ id: "orphaned1" },
					{ id: "orphaned2" },
				],
			};

			(fetch as unknown as jest.Mock)
				.mockResolvedValueOnce({
					ok: true,
					status: 200,
					json: async () => ({ DocumentCollections: [] }),
				})
				.mockResolvedValueOnce({
					ok: false,
					status: 404,
					json: async () => ({ code: "NotFound" }),
				})
				.mockResolvedValueOnce({
					ok: true,
					status: 201,
					json: async () => ({ id: "posts" }),
				})
				.mockResolvedValueOnce({
					ok: true,
					status: 200,
					json: async () => response,
				});

			const config: CosmosClientConfig = {
				endpoint: "https://test.documents.azure.com:443",
				key: "test-key",
				database: "testdb",
				mode: "auto-create",
			};

			const client = createClient(config);

			const posts = container("posts", {
				id: field.string(),
				title: field.string(),
			}).partitionKey("id");

			const containers = await client.withContainers({ posts });
			const orphaned = await containers.listOrphanedContainers();

			// Should exclude "posts" (in schema) but include "users", "orphaned1", "orphaned2"
			expect(orphaned.sort()).toEqual(["orphaned1", "orphaned2", "users"]);
		});

		test("deleteContainers deletes specified containers", async () => {
			(fetch as unknown as jest.Mock)
				.mockResolvedValueOnce({
					ok: true,
					status: 200,
					json: async () => ({ DocumentCollections: [] }),
				})
				.mockResolvedValueOnce({
					ok: false,
					status: 404,
					json: async () => ({ code: "NotFound" }),
				})
				.mockResolvedValueOnce({
					ok: true,
					status: 201,
					json: async () => ({ id: "users" }),
				})
				.mockResolvedValueOnce({
					ok: true,
					status: 204,
				})
				.mockResolvedValueOnce({
					ok: true,
					status: 204,
				});

			const config: CosmosClientConfig = {
				endpoint: "https://test.documents.azure.com:443",
				key: "test-key",
				database: "testdb",
				mode: "auto-create",
			};

			const client = createClient(config);

			const users = container("users", {
				id: field.string(),
				email: field.string(),
			}).partitionKey("email");

			const containers = await client.withContainers({ users });
			await containers.deleteContainers(["old", "temp"]);

			expect(fetch).toHaveBeenCalledWith(
				expect.stringContaining("/dbs/testdb/colls/old"),
				expect.objectContaining({ method: "DELETE" }),
			);
			expect(fetch).toHaveBeenCalledWith(
				expect.stringContaining("/dbs/testdb/colls/temp"),
				expect.objectContaining({ method: "DELETE" }),
			);
		});

		test("pruneContainers requires confirmation", async () => {
			(fetch as unknown as jest.Mock).mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: async () => ({ DocumentCollections: [] }),
			});

			const config: CosmosClientConfig = {
				endpoint: "https://test.documents.azure.com:443",
				key: "test-key",
				database: "testdb",
				mode: "skip",
			};

			const client = createClient(config);

			const containers = await client.withContainers({
				users: container("users", {
					id: field.string(),
					email: field.string(),
				}).partitionKey("email"),
			});

			await expect(containers.pruneContainers()).rejects.toThrow(
				"pruneContainers requires confirm: true to prevent accidental deletion",
			);
		});
	});
});
