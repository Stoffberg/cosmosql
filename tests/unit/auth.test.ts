import { CosmosAuth } from "../../src/client/auth";

describe("CosmosAuth", () => {
	describe("parseConnectionString", () => {
		test("parses valid connection string", () => {
			const auth = new CosmosAuth("");
			const connectionString =
				"AccountEndpoint=https://test.documents.azure.com:443/;AccountKey=testKey123==";

			const result = auth.parseConnectionString(connectionString);

			expect(result.endpoint).toBe("https://test.documents.azure.com:443/");
			expect(result.key).toBe("testKey123==");
		});

		test("handles connection string with spaces", () => {
			const auth = new CosmosAuth("");
			const connectionString =
				"AccountEndpoint = https://test.com ; AccountKey = key123 ";

			const result = auth.parseConnectionString(connectionString);

			expect(result.endpoint).toBe("https://test.com");
			expect(result.key).toBe("key123");
		});

		test("throws error when AccountEndpoint is missing", () => {
			const auth = new CosmosAuth("");
			const connectionString = "AccountKey=testKey";

			expect(() => {
				auth.parseConnectionString(connectionString);
			}).toThrow("Invalid connection string format");
		});

		test("throws error when AccountKey is missing", () => {
			const auth = new CosmosAuth("");
			const connectionString = "AccountEndpoint=https://test.com";

			expect(() => {
				auth.parseConnectionString(connectionString);
			}).toThrow("Invalid connection string format");
		});

		test("throws error for empty connection string", () => {
			const auth = new CosmosAuth("");

			expect(() => {
				auth.parseConnectionString("");
			}).toThrow("Invalid connection string format");
		});

		test("handles extra fields in connection string", () => {
			const auth = new CosmosAuth("");
			const connectionString =
				"AccountEndpoint=https://test.com;AccountKey=key;ExtraField=ignored";

			const result = auth.parseConnectionString(connectionString);

			expect(result.endpoint).toBe("https://test.com");
			expect(result.key).toBe("key");
		});

		test("handles connection string with different order", () => {
			const auth = new CosmosAuth("");
			const connectionString =
				"AccountKey=myKey;AccountEndpoint=https://endpoint.com";

			const result = auth.parseConnectionString(connectionString);

			expect(result.endpoint).toBe("https://endpoint.com");
			expect(result.key).toBe("myKey");
		});

		test("handles connection string without trailing semicolon", () => {
			const auth = new CosmosAuth("");
			const connectionString =
				"AccountEndpoint=https://test.com;AccountKey=key";

			const result = auth.parseConnectionString(connectionString);

			expect(result.endpoint).toBe("https://test.com");
			expect(result.key).toBe("key");
		});

		test("handles connection string with trailing semicolon", () => {
			const auth = new CosmosAuth("");
			const connectionString =
				"AccountEndpoint=https://test.com;AccountKey=key;";

			const result = auth.parseConnectionString(connectionString);

			expect(result.endpoint).toBe("https://test.com");
			expect(result.key).toBe("key");
		});

		test("handles malformed parts gracefully", () => {
			const auth = new CosmosAuth("");
			const connectionString =
				"AccountEndpoint=https://test.com;MalformedPart;AccountKey=key";

			const result = auth.parseConnectionString(connectionString);

			expect(result.endpoint).toBe("https://test.com");
			expect(result.key).toBe("key");
		});

		test("handles keys with equals signs", () => {
			const auth = new CosmosAuth("");
			const connectionString =
				"AccountEndpoint=https://test.com;AccountKey=keyWith==padding";

			const result = auth.parseConnectionString(connectionString);

			expect(result.key).toBe("keyWith==padding");
		});

		test("handles endpoints with query parameters", () => {
			const auth = new CosmosAuth("");
			const connectionString =
				"AccountEndpoint=https://test.com?param=value;AccountKey=key";

			const result = auth.parseConnectionString(connectionString);

			expect(result.endpoint).toContain("https://test.com?param=value");
		});

		test("trims whitespace from values", () => {
			const auth = new CosmosAuth("");
			const connectionString =
				"AccountEndpoint =  https://test.com  ; AccountKey =  key123  ";

			const result = auth.parseConnectionString(connectionString);

			expect(result.endpoint).toBe("https://test.com");
			expect(result.key).toBe("key123");
		});

		test("throws for connection string with only AccountEndpoint", () => {
			const auth = new CosmosAuth("");
			const connectionString = "AccountEndpoint=https://test.com;";

			expect(() => {
				auth.parseConnectionString(connectionString);
			}).toThrow("Invalid connection string format");
		});

		test("throws for connection string with only AccountKey", () => {
			const auth = new CosmosAuth("");
			const connectionString = "AccountKey=testKey;";

			expect(() => {
				auth.parseConnectionString(connectionString);
			}).toThrow("Invalid connection string format");
		});

		test("handles complex real-world connection string", () => {
			const auth = new CosmosAuth("");
			const connectionString =
				"AccountEndpoint=https://my-cosmos-db.documents.azure.com:443/;AccountKey=C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw==";

			const result = auth.parseConnectionString(connectionString);

			expect(result.endpoint).toBe(
				"https://my-cosmos-db.documents.azure.com:443/",
			);
			expect(result.key).toBe(
				"C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw==",
			);
		});
	});

	describe("generateAuthToken", () => {
		test("generates token with correct structure", () => {
			const auth = new CosmosAuth("dGVzdEtleQ==");

			const token = auth.generateAuthToken(
				"GET",
				"docs",
				"dbs/mydb/colls/mycoll",
				new Date("Thu, 01 Jan 2020 00:00:00 GMT"),
			);

			// Token should be URL-encoded and contain the expected parts
			expect(token).toContain("type%3Dmaster");
			expect(token).toContain("ver%3D1.0");
			expect(token).toContain("sig%3D");
		});

		test("generates different tokens for different inputs", () => {
			const auth = new CosmosAuth("dGVzdEtleQ==");

			const date1 = new Date("2020-01-01T00:00:00Z");
			const token1 = auth.generateAuthToken("GET", "docs", "resource1", date1);
			const token2 = auth.generateAuthToken("POST", "docs", "resource1", date1);
			const token3 = auth.generateAuthToken("GET", "colls", "resource1", date1);

			expect(token1).not.toBe(token2);
			expect(token1).not.toBe(token3);
			expect(token2).not.toBe(token3);
		});

		test("generates same token for same inputs", () => {
			const auth = new CosmosAuth("dGVzdEtleQ==");

			const date = new Date("2020-01-01T00:00:00Z");
			const token1 = auth.generateAuthToken("GET", "docs", "resource", date);
			const token2 = auth.generateAuthToken("GET", "docs", "resource", date);

			expect(token1).toBe(token2);
		});

		test("handles empty resource ID", () => {
			const auth = new CosmosAuth("key");

			expect(() => {
				auth.generateAuthToken("GET", "dbs", "", new Date());
			}).not.toThrow();
		});

		test("handles special characters in resource ID", () => {
			const auth = new CosmosAuth("key");

			expect(() => {
				auth.generateAuthToken(
					"GET",
					"docs",
					"dbs/test-db/colls/test-coll",
					new Date(),
				);
			}).not.toThrow();
		});
	});

	describe("Integration scenarios", () => {
		test("can generate token after parsing connection string", () => {
			const auth = new CosmosAuth("");
			const connectionString =
				"AccountEndpoint=https://test.com;AccountKey=dGVzdEtleQ==";

			const { endpoint, key } = auth.parseConnectionString(connectionString);
			const authWithKey = new CosmosAuth(key);

			const token = authWithKey.generateAuthToken(
				"GET",
				"docs",
				"resource",
				new Date(),
			);

			expect(token).toBeTruthy();
			expect(token).toContain("type%3Dmaster");
			expect(endpoint).toBe("https://test.com");
		});

		test("multiple instances can coexist", () => {
			const auth1 = new CosmosAuth("key1");
			const auth2 = new CosmosAuth("key2");

			const date = new Date();
			const token1 = auth1.generateAuthToken("GET", "docs", "res1", date);
			const token2 = auth2.generateAuthToken("POST", "colls", "res2", date);

			expect(token1).toBeTruthy();
			expect(token2).toBeTruthy();
			expect(token1).not.toBe(token2);
		});

		test("same auth instance can generate multiple tokens", () => {
			const auth = new CosmosAuth("key");

			const date1 = new Date("2020-01-01T00:00:00Z");
			const date2 = new Date("2020-01-02T00:00:00Z");
			const date3 = new Date("2020-01-03T00:00:00Z");
			const token1 = auth.generateAuthToken("GET", "docs", "res1", date1);
			const token2 = auth.generateAuthToken("POST", "colls", "res2", date2);
			const token3 = auth.generateAuthToken("PUT", "sprocs", "res3", date3);

			expect(token1).toBeTruthy();
			expect(token2).toBeTruthy();
			expect(token3).toBeTruthy();

			// All should be different since inputs are different
			expect(token1).not.toBe(token2);
			expect(token2).not.toBe(token3);
			expect(token1).not.toBe(token3);
		});
	});
});
