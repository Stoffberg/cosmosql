import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { container, createClient, field } from "../../src";

const TEST_DB = `bulk-ops-test-${Date.now()}`;

// Define test schemas
const users = container("bulk-users", {
	id: field.string(),
	email: field.string(),
	name: field.string(),
	age: field.number().optional(),
	status: field.string().optional(),
	isActive: field.boolean().optional(),
	metadata: field.object({
		lastLogin: field.date().optional(),
		loginCount: field.number().optional(),
	}).optional(),
}).partitionKey("email");

const posts = container("bulk-posts", {
	id: field.string(),
	userId: field.string(),
	title: field.string(),
	content: field.string(),
	published: field.boolean(),
	views: field.number().optional(),
}).partitionKey("userId");

describe("Bulk Operations Integration Tests", () => {
	let db: any;

	beforeAll(async () => {
		if (!process.env.COSMOS_CONNECTION_STRING) {
			throw new Error("COSMOS_CONNECTION_STRING environment variable is required for integration tests");
		}

		db = await createClient({
			connectionString: process.env.COSMOS_CONNECTION_STRING,
			database: TEST_DB,
			mode: "auto-create",
		}).withContainers({
			users,
			posts,
		});

		// Seed test data
		const testUsers = [
			{
				id: "user-1",
				email: "user1@example.com",
				name: "User One",
				age: 25,
				isActive: true,
			},
			{
				id: "user-2",
				email: "user2@example.com",
				name: "User Two",
				age: 30,
				isActive: true,
			},
			{
				id: "user-3",
				email: "user3@old.com",
				name: "User Three",
				age: 35,
				isActive: false,
			},
		];

		for (const user of testUsers) {
			try {
				await db.users.create({ data: user });
			} catch (error: any) {
				// Skip if already exists
				if (error.statusCode !== 409) {
					throw error;
				}
			}
		}

		// Wait a bit for data to be available
		await new Promise((resolve) => setTimeout(resolve, 1000));
	}, 60000);

	afterAll(async () => {
		// Cleanup not implemented yet
	}, 30000);

	test("should update documents with static data", async () => {
		if (!process.env.COSMOS_CONNECTION_STRING) {
			return;
		}

		const result = await db.users.updateMany({
			where: { isActive: true },
			data: { status: "verified" },
			enableCrossPartitionQuery: true,
		});

		expect(result.success).toBe(true);
		expect(result.updated).toBeGreaterThan(0);
	}, 30000);

	test("should track progress during updates", async () => {
		if (!process.env.COSMOS_CONNECTION_STRING) {
			return;
		}

		let progressCalled = false;

		const result = await db.users.updateMany({
			where: {},
			data: { status: "active" },
			enableCrossPartitionQuery: true,
			onProgress: (stats) => {
				progressCalled = true;
				expect(stats.percentage).toBeGreaterThanOrEqual(0);
				expect(stats.percentage).toBeLessThanOrEqual(100);
			},
		});

		expect(progressCalled).toBe(true);
		expect(result.success).toBe(true);
	}, 30000);
});

