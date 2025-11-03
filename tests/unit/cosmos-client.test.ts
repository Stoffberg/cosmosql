import { CosmosClient, type CosmosClientConfig } from "../../src/client/cosmos-client";
import { CosmosError } from "../../src/errors/cosmos-error";

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

			(fetch as jest.Mock).mockResolvedValueOnce({
				ok: true,
				json: async () => ({}),
			});

			void client.request("GET", "/dbs/testdb/colls/test/docs/doc1");

			const callArgs = (fetch as jest.Mock).mock.calls[0];
			const url = callArgs[0];

			expect(url).toBe("https://test.documents.azure.com/dbs/testdb/colls/test/docs/doc1");
			// Should not contain double slash in the path (after domain part)
			const pathPart = url.split("://")[1];
			expect(pathPart).not.toContain("//");
		});

		test("removes trailing slash from connectionString endpoint", () => {
			const config: CosmosClientConfig = {
				connectionString:
					"AccountEndpoint=https://test.documents.azure.com:443/;AccountKey=dGVzdC1rZXk=;",
				database: "testdb",
			};

			const client = new CosmosClient(config);

			(fetch as jest.Mock).mockResolvedValueOnce({
				ok: true,
				json: async () => ({}),
			});

			void client.request("GET", "/dbs/testdb/colls/test/docs/doc1");

			const callArgs = (fetch as jest.Mock).mock.calls[0];
			const url = callArgs[0];

			expect(url).toBe("https://test.documents.azure.com/dbs/testdb/colls/test/docs/doc1");
			// Should not contain double slash in the path (after domain part)
			const pathPart = url.split("://")[1];
			expect(pathPart).not.toContain("//");
		});

		test("handles endpoint without trailing slash", () => {
			const config: CosmosClientConfig = {
				endpoint: "https://test.documents.azure.com:443",
				key: "dGVzdC1rZXk=",
				database: "testdb",
			};

			const client = new CosmosClient(config);

			(fetch as jest.Mock).mockResolvedValueOnce({
				ok: true,
				json: async () => ({}),
			});

			void client.request("GET", "/dbs/testdb/colls/test/docs/doc1");

			const callArgs = (fetch as jest.Mock).mock.calls[0];
			const url = callArgs[0];

			expect(url).toBe("https://test.documents.azure.com/dbs/testdb/colls/test/docs/doc1");
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

			(fetch as jest.Mock).mockResolvedValueOnce({
				ok: true,
				json: async () => mockResponse,
			});

			const result = await client.request("GET", "/dbs/testdb/colls/test/docs/doc1");

			expect(result).toEqual(mockResponse);
			expect(fetch).toHaveBeenCalledTimes(1);
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

			(fetch as jest.Mock).mockResolvedValueOnce({
				ok: true,
				json: async () => mockResponse,
			});

			const result = await client.request("POST", "/dbs/testdb/colls/test/docs", requestBody);

			expect(result).toEqual(mockResponse);
			expect(fetch).toHaveBeenCalledWith(
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

			(fetch as jest.Mock).mockResolvedValueOnce({
				ok: true,
				json: async () => ({}),
			});

			await client.request("GET", "/dbs/testdb/colls/test/docs/doc1", undefined, "pk1");

			const callArgs = (fetch as jest.Mock).mock.calls[0];
			const headers = callArgs[1].headers as Record<string, string>;

			expect(headers["x-ms-documentdb-partitionkey"]).toBe(JSON.stringify(["pk1"]));
		});

		test("includes array partition key header", async () => {
			const config: CosmosClientConfig = {
				endpoint: "https://test.documents.azure.com:443",
				key: "dGVzdC1rZXk=",
				database: "testdb",
			};

			const client = new CosmosClient(config);

			(fetch as jest.Mock).mockResolvedValueOnce({
				ok: true,
				json: async () => ({}),
			});

			await client.request("GET", "/dbs/testdb/colls/test/docs/doc1", undefined, ["pk1", "pk2"]);

			const callArgs = (fetch as jest.Mock).mock.calls[0];
			const headers = callArgs[1].headers as Record<string, string>;

			expect(headers["x-ms-documentdb-partitionkey"]).toBe(JSON.stringify(["pk1", "pk2"]));
		});

		test("includes cross-partition query header when enableCrossPartitionQuery is true", async () => {
			const config: CosmosClientConfig = {
				endpoint: "https://test.documents.azure.com:443",
				key: "dGVzdC1rZXk=",
				database: "testdb",
			};

			const client = new CosmosClient(config);

			(fetch as jest.Mock).mockResolvedValueOnce({
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

			const callArgs = (fetch as jest.Mock).mock.calls[0];
			const headers = callArgs[1].headers as Record<string, string>;

			expect(headers["x-ms-documentdb-query-enablecrosspartition"]).toBe("true");
		});

		test("does not include cross-partition query header when enableCrossPartitionQuery is false", async () => {
			const config: CosmosClientConfig = {
				endpoint: "https://test.documents.azure.com:443",
				key: "dGVzdC1rZXk=",
				database: "testdb",
			};

			const client = new CosmosClient(config);

			(fetch as jest.Mock).mockResolvedValueOnce({
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

			const callArgs = (fetch as jest.Mock).mock.calls[0];
			const headers = callArgs[1].headers as Record<string, string>;

			expect(headers["x-ms-documentdb-query-enablecrosspartition"]).toBeUndefined();
		});

		test("does not include cross-partition query header when enableCrossPartitionQuery is undefined", async () => {
			const config: CosmosClientConfig = {
				endpoint: "https://test.documents.azure.com:443",
				key: "dGVzdC1rZXk=",
				database: "testdb",
			};

			const client = new CosmosClient(config);

			(fetch as jest.Mock).mockResolvedValueOnce({
				ok: true,
				json: async () => ({}),
			});

			await client.request("POST", "/dbs/testdb/colls/test/docs", {
				query: "SELECT * FROM c",
				parameters: [],
			});

			const callArgs = (fetch as jest.Mock).mock.calls[0];
			const headers = callArgs[1].headers as Record<string, string>;

			expect(headers["x-ms-documentdb-query-enablecrosspartition"]).toBeUndefined();
		});

		test("does not include partition key header when partitionKey is null", async () => {
			const config: CosmosClientConfig = {
				endpoint: "https://test.documents.azure.com:443",
				key: "dGVzdC1rZXk=",
				database: "testdb",
			};

			const client = new CosmosClient(config);

			(fetch as jest.Mock).mockResolvedValueOnce({
				ok: true,
				json: async () => ({}),
			});

			await client.request("GET", "/dbs/testdb/colls/test/docs/doc1", undefined, null);

			const callArgs = (fetch as jest.Mock).mock.calls[0];
			const headers = callArgs[1].headers as Record<string, string>;

			expect(headers["x-ms-documentdb-partitionkey"]).toBeUndefined();
		});

		test("does not include partition key header when partitionKey is undefined", async () => {
			const config: CosmosClientConfig = {
				endpoint: "https://test.documents.azure.com:443",
				key: "dGVzdC1rZXk=",
				database: "testdb",
			};

			const client = new CosmosClient(config);

			(fetch as jest.Mock).mockResolvedValueOnce({
				ok: true,
				json: async () => ({}),
			});

			await client.request("GET", "/dbs/testdb/colls/test/docs/doc1", undefined, undefined);

			const callArgs = (fetch as jest.Mock).mock.calls[0];
			const headers = callArgs[1].headers as Record<string, string>;

			expect(headers["x-ms-documentdb-partitionkey"]).toBeUndefined();
		});

		test("includes cross-partition query header as string 'true'", async () => {
			const config: CosmosClientConfig = {
				endpoint: "https://test.documents.azure.com:443",
				key: "dGVzdC1rZXk=",
				database: "testdb",
			};

			const client = new CosmosClient(config);

			(fetch as jest.Mock).mockResolvedValueOnce({
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

			const callArgs = (fetch as jest.Mock).mock.calls[0];
			const headers = callArgs[1].headers as Record<string, string>;

			expect(headers["x-ms-documentdb-query-enablecrosspartition"]).toBe("true");
		});

		test("cross-partition query with explicit undefined partition key does not include partition key header", async () => {
			const config: CosmosClientConfig = {
				endpoint: "https://test.documents.azure.com:443",
				key: "dGVzdC1rZXk=",
				database: "testdb",
			};

			const client = new CosmosClient(config);

			(fetch as jest.Mock).mockResolvedValueOnce({
				ok: true,
				json: async () => ({ Documents: [] }),
			});

			await client.request(
				"POST",
				"/dbs/testdb/colls/test/docs",
				{ query: "SELECT * FROM c", parameters: [] },
				undefined, // explicit undefined partition key
				true, // enableCrossPartitionQuery
			);

			const callArgs = (fetch as jest.Mock).mock.calls[0];
			const headers = callArgs[1].headers as Record<string, string>;

			expect(headers["x-ms-documentdb-query-enablecrosspartition"]).toBe("true");
			expect(headers["x-ms-documentdb-partitionkey"]).toBeUndefined();
		});

		test("cross-partition query with take parameter works", async () => {
			const config: CosmosClientConfig = {
				endpoint: "https://test.documents.azure.com:443",
				key: "dGVzdC1rZXk=",
				database: "testdb",
			};

			const client = new CosmosClient(config);

			(fetch as jest.Mock).mockResolvedValueOnce({
				ok: true,
				json: async () => ({ Documents: [{ id: "1" }, { id: "2" }] }),
			});

			await client.request(
				"POST",
				"/dbs/testdb/colls/test/docs",
				{
					query: "SELECT TOP @take * FROM c",
					parameters: [{ name: "@take", value: 1 }],
				},
				undefined,
				true, // enableCrossPartitionQuery
			);

			const callArgs = (fetch as jest.Mock).mock.calls[0];
			const headers = callArgs[1].headers as Record<string, string>;

			expect(headers["x-ms-documentdb-query-enablecrosspartition"]).toBe("true");
			expect(headers["x-ms-documentdb-partitionkey"]).toBeUndefined();
		});

		test("filters out undefined and null values from headers", async () => {
			const config: CosmosClientConfig = {
				endpoint: "https://test.documents.azure.com:443",
				key: "dGVzdC1rZXk=",
				database: "testdb",
			};

			const client = new CosmosClient(config);

			(fetch as jest.Mock).mockResolvedValueOnce({
				ok: true,
				json: async () => ({}),
			});

			// Manually call fetch to test header filtering behavior
			await client.request("GET", "/dbs/testdb/colls/test/docs/doc1");

			const callArgs = (fetch as jest.Mock).mock.calls[0];
			const actualHeaders = callArgs[1].headers as Record<string, string>;

			// Headers should not contain undefined or null values
			Object.values(actualHeaders).forEach((value) => {
				expect(value).not.toBeUndefined();
				expect(value).not.toBeNull();
				expect(typeof value).toBe("string");
			});
		});

		test("includes required headers", async () => {
			const config: CosmosClientConfig = {
				endpoint: "https://test.documents.azure.com:443",
				key: "dGVzdC1rZXk=",
				database: "testdb",
			};

			const client = new CosmosClient(config);

			(fetch as jest.Mock).mockResolvedValueOnce({
				ok: true,
				json: async () => ({}),
			});

			await client.request("GET", "/dbs/testdb/colls/test/docs/doc1");

			const callArgs = (fetch as jest.Mock).mock.calls[0];
			const headers = callArgs[1].headers as Record<string, string>;

			expect(headers.authorization).toBeDefined();
			expect(headers["x-ms-date"]).toBeDefined();
			expect(headers["x-ms-version"]).toBe("2018-12-31");
			expect(headers.accept).toBe("application/json");
		});

		test("throws CosmosError on error response", async () => {
			const config: CosmosClientConfig = {
				endpoint: "https://test.documents.azure.com:443",
				key: "dGVzdC1rZXk=",
				database: "testdb",
			};

			const client = new CosmosClient(config);

			(fetch as jest.Mock).mockResolvedValueOnce({
				ok: false,
				status: 404,
				statusText: "Not Found",
				text: async () =>
					JSON.stringify({
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
			(fetch as jest.Mock).mockResolvedValueOnce({
				ok: false,
				status: 429,
				statusText: "Too Many Requests",
			});

			// Second call: success
			(fetch as jest.Mock).mockResolvedValueOnce({
				ok: true,
				json: async () => ({ id: "doc1" }),
			});

			const result = await client.request("GET", "/dbs/testdb/colls/test/docs/doc1");

			expect(result).toEqual({ id: "doc1" });
			expect(fetch).toHaveBeenCalledTimes(2);
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
			(fetch as jest.Mock).mockResolvedValue({
				ok: false,
				status: 429,
				statusText: "Too Many Requests",
				json: async () => ({
					code: "TooManyRequests",
					message: "Rate limited",
				}),
			});

			await expect(client.request("GET", "/dbs/testdb/colls/test/docs/doc1")).rejects.toThrow(
				CosmosError,
			);

			expect(fetch).toHaveBeenCalledTimes(3); // Initial + 2 retries
		});

		test("handles network errors", async () => {
			const config: CosmosClientConfig = {
				endpoint: "https://test.documents.azure.com:443",
				key: "dGVzdC1rZXk=",
				database: "testdb",
			};

			const client = new CosmosClient(config);

			const networkError = new Error("Network error");
			(fetch as jest.Mock).mockRejectedValueOnce(networkError);

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

			(fetch as jest.Mock).mockResolvedValueOnce({
				ok: false,
				status: 500,
				statusText: "Internal Server Error",
				json: async () => {
					throw new Error("Invalid JSON");
				},
			});

			await expect(client.request("GET", "/dbs/testdb/colls/test/docs/doc1")).rejects.toThrow(
				CosmosError,
			);
		});

		test("handles path with insufficient parts", async () => {
			const config: CosmosClientConfig = {
				endpoint: "https://test.documents.azure.com:443",
				key: "dGVzdC1rZXk=",
				database: "testdb",
			};

			const client = new CosmosClient(config);

			(fetch as jest.Mock).mockResolvedValueOnce({
				ok: true,
				json: async () => ({}),
			});

			// Path with only one part should trigger fallback
			await client.request("GET", "/test");

			expect(fetch).toHaveBeenCalled();
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
			const result = client["parseResourcePath"]("/dbs/chatapi/colls/conversations/docs");

			expect(result).toEqual(["docs", "dbs/chatapi/colls/conversations"]);
		});

		test("parses collection path correctly", () => {
			// biome-ignore lint/complexity/useLiteralKeys: test private method
			const result = client["parseResourcePath"]("/dbs/chatapi/colls/conversations");

			expect(result).toEqual(["colls", "dbs/chatapi/colls/conversations"]);
		});

		test("parses database path correctly", () => {
			// biome-ignore lint/complexity/useLiteralKeys: test private method
			const result = client["parseResourcePath"]("/dbs/chatapi");

			expect(result).toEqual(["dbs", "dbs/chatapi"]);
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

			expect(result).toEqual(["dbs", "dbs/test"]);
		});

		test("handles complex document path", () => {
			// biome-ignore lint/complexity/useLiteralKeys: test private method
			const result = client["parseResourcePath"]("/dbs/my-db/colls/my-collection/docs/my-doc");

			expect(result).toEqual(["docs", "dbs/my-db/colls/my-collection/docs/my-doc"]);
		});

		test("handles stored procedure path", () => {
			// biome-ignore lint/complexity/useLiteralKeys: test private method
			const result = client["parseResourcePath"]("/dbs/db/colls/coll/sprocs/proc");

			expect(result).toEqual(["sprocs", "dbs/db/colls/coll/sprocs/proc"]);
		});

		test("handles user defined function path", () => {
			// biome-ignore lint/complexity/useLiteralKeys: test private method
			const result = client["parseResourcePath"]("/dbs/db/colls/coll/udfs/func");

			expect(result).toEqual(["udfs", "dbs/db/colls/coll/udfs/func"]);
		});

		test("handles trigger path", () => {
			// biome-ignore lint/complexity/useLiteralKeys: test private method
			const result = client["parseResourcePath"]("/dbs/db/colls/coll/triggers/trig");

			expect(result).toEqual(["triggers", "dbs/db/colls/coll/triggers/trig"]);
		});
	});
});
