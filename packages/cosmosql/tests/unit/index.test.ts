import { container, createClient, field } from "../../src";
import type { CosmosClientConfig } from "../../src/client/cosmos-client";

describe("Main Index Exports", () => {
	test("exports createClient function", () => {
		expect(createClient).toBeDefined();
		expect(typeof createClient).toBe("function");
	});

	test("exports field builder", () => {
		expect(field).toBeDefined();
		expect(typeof field.string).toBe("function");
	});

	test("exports container function", () => {
		expect(container).toBeDefined();
		expect(typeof container).toBe("function");
	});

	test("createClient creates client with endpoint and key", () => {
		const config: CosmosClientConfig = {
			endpoint: "https://test.documents.azure.com:443",
			key: "test-key",
			database: "testdb",
		};

		const client = createClient(config);

		expect(client).toBeDefined();
		expect(typeof client.withContainers).toBe("function");
	});

	test("createClient creates client with connectionString", () => {
		const config: CosmosClientConfig = {
			connectionString:
				"AccountEndpoint=https://test.documents.azure.com:443/;AccountKey=test-key;",
			database: "testdb",
		};

		const client = createClient(config);

		expect(client).toBeDefined();
		expect(typeof client.withContainers).toBe("function");
	});

	test("createClient throws error when neither endpoint+key nor connectionString provided", () => {
		const config = {
			database: "testdb",
		} as CosmosClientConfig;

		expect(() => createClient(config)).toThrow(
			"Must provide either connectionString or endpoint + key",
		);
	});

	test("withContainers creates container clients", async () => {
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

		const containers = await client.withContainers({
			users,
		});

		expect(containers.users).toBeDefined();
		expect(typeof containers.users.findUnique).toBe("function");
		expect(typeof containers.users.findMany).toBe("function");
		expect(typeof containers.users.create).toBe("function");
		expect(typeof containers.users.update).toBe("function");
		expect(typeof containers.users.delete).toBe("function");
	});

	test("withContainers handles multiple containers", async () => {
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

		const posts = container("posts", {
			id: field.string(),
			title: field.string(),
		}).partitionKey("id");

		const containers = await client.withContainers({
			users,
			posts,
		});

		expect(containers.users).toBeDefined();
		expect(containers.posts).toBeDefined();
		expect(typeof containers.users.findUnique).toBe("function");
		expect(typeof containers.posts.findUnique).toBe("function");
	});
});
