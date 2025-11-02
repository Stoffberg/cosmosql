import {
	CosmosClient,
	type CosmosClientConfig,
} from "../../src/client/cosmos-client";
import { CosmosError } from "../../src/errors/cosmos-error";

// Mock fetch globally
global.fetch = jest.fn();

describe("CosmosClient", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe("constructor", () => {
		test("creates client with endpoint and key", () => {
			const config: CosmosClientConfig = {
				endpoint: "https://test.documents.azure.com:443",
				key: "dGVzdC1rZXk=",
				database: "testdb",
			};

			const client = new CosmosClient(config);

			expect(client).toBeDefined();
			expect(client.getDatabase()).toBe("testdb");
		});

		test("creates client with connectionString", () => {
			const config: CosmosClientConfig = {
				connectionString:
					"AccountEndpoint=https://test.documents.azure.com:443/;AccountKey=dGVzdC1rZXk=;",
				database: "testdb",
			};

			const client = new CosmosClient(config);

			expect(client).toBeDefined();
			expect(client.getDatabase()).toBe("testdb");
		});

		test("throws error when neither endpoint+key nor connectionString provided", () => {
			const config = {
				database: "testdb",
			} as CosmosClientConfig;

			expect(() => new CosmosClient(config)).toThrow(
				"Must provide either connectionString or endpoint + key",
			);
		});

		test("uses default retry options", () => {
			const config: CosmosClientConfig = {
				endpoint: "https://test.documents.azure.com:443",
				key: "dGVzdC1rZXk=",
				database: "testdb",
			};

			const client = new CosmosClient(config);
			expect(client).toBeDefined();
		});

		test("uses custom retry options", () => {
			const config: CosmosClientConfig = {
				endpoint: "https://test.documents.azure.com:443",
				key: "dGVzdC1rZXk=",
				database: "testdb",
				retryOptions: {
					maxRetries: 5,
					initialDelay: 200,
					maxDelay: 10000,
				},
			};

			const client = new CosmosClient(config);
			expect(client).toBeDefined();
		});

		test("removes trailing slash from endpoint with slash", () => {
			const config: CosmosClientConfig = {
				endpoint: "https://test.documents.azure.com:443/",
				key: "dGVzdC1rZXk=",
				database: "testdb",
			};

			const client = new CosmosClient(config);

			(global.fetch as jest.Mock).mockResolvedValueOnce({
				ok: true,
				json: async () => ({}),
			});

			void client.request("GET", "/dbs/testdb/colls/test/docs/doc1");

			const callArgs = (global.fetch as jest.Mock).mock.calls[0];
			const url = callArgs[0];

			expect(url).toBe(
				"https://test.documents.azure.com:443/dbs/testdb/colls/test/docs/doc1",
			);
			// Should not contain double slash in the path (after :443/)
			expect(url).not.toContain(":443//");
		});

		test("removes trailing slash from connectionString endpoint", () => {
			const config: CosmosClientConfig = {
				connectionString:
					"AccountEndpoint=https://test.documents.azure.com:443/;AccountKey=dGVzdC1rZXk=;",
				database: "testdb",
			};

			const client = new CosmosClient(config);

			(global.fetch as jest.Mock).mockResolvedValueOnce({
				ok: true,
				json: async () => ({}),
			});

			void client.request("GET", "/dbs/testdb/colls/test/docs/doc1");

			const callArgs = (global.fetch as jest.Mock).mock.calls[0];
			const url = callArgs[0];

			expect(url).toBe(
				"https://test.documents.azure.com:443/dbs/testdb/colls/test/docs/doc1",
			);
			// Should not contain double slash in the path (after :443/)
			expect(url).not.toContain(":443//");
		});

		test("handles endpoint without trailing slash", () => {
			const config: CosmosClientConfig = {
				endpoint: "https://test.documents.azure.com:443",
				key: "dGVzdC1rZXk=",
				database: "testdb",
			};

			const client = new CosmosClient(config);

			(global.fetch as jest.Mock).mockResolvedValueOnce({
				ok: true,
				json: async () => ({}),
			});

			void client.request("GET", "/dbs/testdb/colls/test/docs/doc1");

			const callArgs = (global.fetch as jest.Mock).mock.calls[0];
			const url = callArgs[0];

			expect(url).toBe(
				"https://test.documents.azure.com:443/dbs/testdb/colls/test/docs/doc1",
			);
		});
	});

	describe("request", () => {
		test("makes successful GET request", async () => {
			const config: CosmosClientConfig = {
				endpoint: "https://test.documents.azure.com:443",
				key: "dGVzdC1rZXk=",
				database: "testdb",
			};

			const client = new CosmosClient(config);

			const mockResponse = {
				id: "doc1",
				name: "Test",
			};

			(global.fetch as jest.Mock).mockResolvedValueOnce({
				ok: true,
				json: async () => mockResponse,
			});

			const result = await client.request(
				"GET",
				"/dbs/testdb/colls/test/docs/doc1",
			);

			expect(result).toEqual(mockResponse);
			expect(global.fetch).toHaveBeenCalledTimes(1);
		});

		test("makes POST request with body", async () => {
			const config: CosmosClientConfig = {
				endpoint: "https://test.documents.azure.com:443",
				key: "dGVzdC1rZXk=",
				database: "testdb",
			};

			const client = new CosmosClient(config);

			const requestBody = { name: "Test", value: 123 };
			const mockResponse = { id: "doc1", ...requestBody };

			(global.fetch as jest.Mock).mockResolvedValueOnce({
				ok: true,
				json: async () => mockResponse,
			});

			const result = await client.request(
				"POST",
				"/dbs/testdb/colls/test/docs",
				requestBody,
			);

			expect(result).toEqual(mockResponse);
			expect(global.fetch).toHaveBeenCalledWith(
				expect.stringContaining("/dbs/testdb/colls/test/docs"),
				expect.objectContaining({
					method: "POST",
					body: JSON.stringify(requestBody),
				}),
			);
		});

		test("includes partition key header", async () => {
			const config: CosmosClientConfig = {
				endpoint: "https://test.documents.azure.com:443",
				key: "dGVzdC1rZXk=",
				database: "testdb",
			};

			const client = new CosmosClient(config);

			(global.fetch as jest.Mock).mockResolvedValueOnce({
				ok: true,
				json: async () => ({}),
			});

			await client.request(
				"GET",
				"/dbs/testdb/colls/test/docs/doc1",
				undefined,
				"pk1",
			);

			expect(global.fetch).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					headers: expect.objectContaining({
						"x-ms-documentdb-partitionkey": JSON.stringify(["pk1"]),
					}),
				}),
			);
		});

		test("includes array partition key header", async () => {
			const config: CosmosClientConfig = {
				endpoint: "https://test.documents.azure.com:443",
				key: "dGVzdC1rZXk=",
				database: "testdb",
			};

			const client = new CosmosClient(config);

			(global.fetch as jest.Mock).mockResolvedValueOnce({
				ok: true,
				json: async () => ({}),
			});

			await client.request(
				"GET",
				"/dbs/testdb/colls/test/docs/doc1",
				undefined,
				["pk1", "pk2"],
			);

			expect(global.fetch).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					headers: expect.objectContaining({
						"x-ms-documentdb-partitionkey": JSON.stringify(["pk1", "pk2"]),
					}),
				}),
			);
		});

		test("includes cross-partition query header when enableCrossPartitionQuery is true", async () => {
			const config: CosmosClientConfig = {
				endpoint: "https://test.documents.azure.com:443",
				key: "dGVzdC1rZXk=",
				database: "testdb",
			};

			const client = new CosmosClient(config);

			(global.fetch as jest.Mock).mockResolvedValueOnce({
				ok: true,
				json: async () => ({}),
			});

			await client.request(
				"POST",
				"/dbs/testdb/colls/test/docs",
				{ query: "SELECT * FROM c", parameters: [] },
				undefined,
				true, // enableCrossPartitionQuery
			);

			expect(global.fetch).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					headers: expect.objectContaining({
						"x-ms-documentdb-query-enablecrosspartition": true,
					}),
				}),
			);
		});

		test("does not include cross-partition query header when enableCrossPartitionQuery is false", async () => {
			const config: CosmosClientConfig = {
				endpoint: "https://test.documents.azure.com:443",
				key: "dGVzdC1rZXk=",
				database: "testdb",
			};

			const client = new CosmosClient(config);

			(global.fetch as jest.Mock).mockResolvedValueOnce({
				ok: true,
				json: async () => ({}),
			});

			await client.request(
				"POST",
				"/dbs/testdb/colls/test/docs",
				{ query: "SELECT * FROM c", parameters: [] },
				undefined,
				false, // enableCrossPartitionQuery
			);

			const callArgs = (global.fetch as jest.Mock).mock.calls[0];
			const headers = callArgs[1].headers;

			expect(headers).not.toHaveProperty("x-ms-documentdb-query-enablecrosspartition");
		});

		test("does not include cross-partition query header when enableCrossPartitionQuery is undefined", async () => {
			const config: CosmosClientConfig = {
				endpoint: "https://test.documents.azure.com:443",
				key: "dGVzdC1rZXk=",
				database: "testdb",
			};

			const client = new CosmosClient(config);

			(global.fetch as jest.Mock).mockResolvedValueOnce({
				ok: true,
				json: async () => ({}),
			});

			await client.request(
				"POST",
				"/dbs/testdb/colls/test/docs",
				{ query: "SELECT * FROM c", parameters: [] },
			);

			const callArgs = (global.fetch as jest.Mock).mock.calls[0];
			const headers = callArgs[1].headers;

			expect(headers).not.toHaveProperty("x-ms-documentdb-query-enablecrosspartition");
		});

		test("includes required headers", async () => {
			const config: CosmosClientConfig = {
				endpoint: "https://test.documents.azure.com:443",
				key: "dGVzdC1rZXk=",
				database: "testdb",
			};

			const client = new CosmosClient(config);

			(global.fetch as jest.Mock).mockResolvedValueOnce({
				ok: true,
				json: async () => ({}),
			});

			await client.request("GET", "/dbs/testdb/colls/test/docs/doc1");

			const callArgs = (global.fetch as jest.Mock).mock.calls[0];
			const headers = callArgs[1].headers;

			expect(headers).toHaveProperty("Authorization");
			expect(headers).toHaveProperty("x-ms-date");
			expect(headers).toHaveProperty("x-ms-version", "2018-12-31");
			expect(headers).toHaveProperty("Content-Type", "application/json");
			expect(headers).toHaveProperty("Accept", "application/json");
		});

		test("throws CosmosError on error response", async () => {
			const config: CosmosClientConfig = {
				endpoint: "https://test.documents.azure.com:443",
				key: "dGVzdC1rZXk=",
				database: "testdb",
			};

			const client = new CosmosClient(config);

			(global.fetch as jest.Mock).mockResolvedValueOnce({
				ok: false,
				status: 404,
				statusText: "Not Found",
				json: async () => ({
					code: "NotFound",
					message: "Resource not found",
				}),
			});

			try {
				await client.request("GET", "/dbs/testdb/colls/test/docs/doc1");
				fail("Should have thrown");
			} catch (error) {
				expect(error).toBeInstanceOf(CosmosError);
				expect((error as CosmosError).message).toBe("Resource not found");
			}
		});

		test("retries on 429 rate limit", async () => {
			const config: CosmosClientConfig = {
				endpoint: "https://test.documents.azure.com:443",
				key: "dGVzdC1rZXk=",
				database: "testdb",
				retryOptions: {
					maxRetries: 2,
					initialDelay: 10,
					maxDelay: 100,
				},
			};

			const client = new CosmosClient(config);

			// First call: rate limited
			(global.fetch as jest.Mock).mockResolvedValueOnce({
				ok: false,
				status: 429,
				statusText: "Too Many Requests",
			});

			// Second call: success
			(global.fetch as jest.Mock).mockResolvedValueOnce({
				ok: true,
				json: async () => ({ id: "doc1" }),
			});

			const result = await client.request(
				"GET",
				"/dbs/testdb/colls/test/docs/doc1",
			);

			expect(result).toEqual({ id: "doc1" });
			expect(global.fetch).toHaveBeenCalledTimes(2);
		});

		test("stops retrying after maxRetries", async () => {
			const config: CosmosClientConfig = {
				endpoint: "https://test.documents.azure.com:443",
				key: "dGVzdC1rZXk=",
				database: "testdb",
				retryOptions: {
					maxRetries: 2,
					initialDelay: 10,
					maxDelay: 100,
				},
			};

			const client = new CosmosClient(config);

			// All calls: rate limited
			(global.fetch as jest.Mock).mockResolvedValue({
				ok: false,
				status: 429,
				statusText: "Too Many Requests",
				json: async () => ({
					code: "TooManyRequests",
					message: "Rate limited",
				}),
			});

			await expect(
				client.request("GET", "/dbs/testdb/colls/test/docs/doc1"),
			).rejects.toThrow(CosmosError);

			expect(global.fetch).toHaveBeenCalledTimes(3); // Initial + 2 retries
		});

		test("handles network errors", async () => {
			const config: CosmosClientConfig = {
				endpoint: "https://test.documents.azure.com:443",
				key: "dGVzdC1rZXk=",
				database: "testdb",
			};

			const client = new CosmosClient(config);

			const networkError = new Error("Network error");
			(global.fetch as jest.Mock).mockRejectedValueOnce(networkError);

			try {
				await client.request("GET", "/dbs/testdb/colls/test/docs/doc1");
				fail("Should have thrown");
			} catch (error) {
				expect(error).toBeInstanceOf(CosmosError);
				expect((error as CosmosError).message).toBe("Network error");
			}
		});

		test("handles error response without JSON body", async () => {
			const config: CosmosClientConfig = {
				endpoint: "https://test.documents.azure.com:443",
				key: "dGVzdC1rZXk=",
				database: "testdb",
			};

			const client = new CosmosClient(config);

			(global.fetch as jest.Mock).mockResolvedValueOnce({
				ok: false,
				status: 500,
				statusText: "Internal Server Error",
				json: async () => {
					throw new Error("Invalid JSON");
				},
			});

			await expect(
				client.request("GET", "/dbs/testdb/colls/test/docs/doc1"),
			).rejects.toThrow(CosmosError);
		});

		test("handles path with insufficient parts", async () => {
			const config: CosmosClientConfig = {
				endpoint: "https://test.documents.azure.com:443",
				key: "dGVzdC1rZXk=",
				database: "testdb",
			};

			const client = new CosmosClient(config);

			(global.fetch as jest.Mock).mockResolvedValueOnce({
				ok: true,
				json: async () => ({}),
			});

			// Path with only one part should trigger fallback
			await client.request("GET", "/test");

			expect(global.fetch).toHaveBeenCalled();
		});
	});

	describe("getDatabase", () => {
		test("returns database name", () => {
			const config: CosmosClientConfig = {
				endpoint: "https://test.documents.azure.com:443",
				key: "dGVzdC1rZXk=",
				database: "testdb",
			};

			const client = new CosmosClient(config);

			expect(client.getDatabase()).toBe("testdb");
		});
	});

	describe("parseResourcePath", () => {
		let client: CosmosClient;

		beforeEach(() => {
			const config: CosmosClientConfig = {
				endpoint: "https://test.documents.azure.com:443",
				key: "dGVzdC1rZXk=",
				database: "testdb",
			};
			client = new CosmosClient(config);
		});

		test("parses document path correctly", () => {
			// biome-ignore lint/complexity/useLiteralKeys: test private method
			const result = client["parseResourcePath"](
				"/dbs/chatapi/colls/conversations/docs",
			);

			expect(result).toEqual(["docs", "dbs/chatapi/colls/conversations"]);
		});

		test("parses collection path correctly", () => {
			// biome-ignore lint/complexity/useLiteralKeys: test private method
			const result = client["parseResourcePath"](
				"/dbs/chatapi/colls/conversations",
			);

			expect(result).toEqual(["conversations", "dbs/chatapi/colls"]);
		});

		test("parses database path correctly", () => {
			// biome-ignore lint/complexity/useLiteralKeys: test private method
			const result = client["parseResourcePath"]("/dbs/chatapi");

			expect(result).toEqual(["chatapi", "dbs"]);
		});

		test("parses single segment path", () => {
			// biome-ignore lint/complexity/useLiteralKeys: test private method
			const result = client["parseResourcePath"]("/dbs");

			expect(result).toEqual(["dbs", ""]);
		});

		test("handles empty path", () => {
			// biome-ignore lint/complexity/useLiteralKeys: test private method
			const result = client["parseResourcePath"]("");

			expect(result).toEqual(["", ""]);
		});

		test("handles path with leading slash", () => {
			// biome-ignore lint/complexity/useLiteralKeys: test private method
			const result = client["parseResourcePath"]("/dbs/test");

			expect(result).toEqual(["test", "dbs"]);
		});

		test("handles complex document path", () => {
			// biome-ignore lint/complexity/useLiteralKeys: test private method
			const result = client["parseResourcePath"](
				"/dbs/my-db/colls/my-collection/docs/my-doc",
			);

			expect(result).toEqual(["my-doc", "dbs/my-db/colls/my-collection/docs"]);
		});

		test("handles stored procedure path", () => {
			// biome-ignore lint/complexity/useLiteralKeys: test private method
			const result = client["parseResourcePath"](
				"/dbs/db/colls/coll/sprocs/proc",
			);

			expect(result).toEqual(["proc", "dbs/db/colls/coll/sprocs"]);
		});

		test("handles user defined function path", () => {
			// biome-ignore lint/complexity/useLiteralKeys: test private method
			const result = client["parseResourcePath"](
				"/dbs/db/colls/coll/udfs/func",
			);

			expect(result).toEqual(["func", "dbs/db/colls/coll/udfs"]);
		});

		test("handles trigger path", () => {
			// biome-ignore lint/complexity/useLiteralKeys: test private method
			const result = client["parseResourcePath"](
				"/dbs/db/colls/coll/triggers/trig",
			);

			expect(result).toEqual(["trig", "dbs/db/colls/coll/triggers"]);
		});
	});

	describe("close", () => {
		test("destroys agent", () => {
			const config: CosmosClientConfig = {
				endpoint: "https://test.documents.azure.com:443",
				key: "dGVzdC1rZXk=",
				database: "testdb",
			};

			const client = new CosmosClient(config);
			// biome-ignore lint/complexity/useLiteralKeys: test code
			const destroySpy = jest.spyOn(client["agent"], "destroy");

			client.close();

			expect(destroySpy).toHaveBeenCalled();
		});
	});
});
