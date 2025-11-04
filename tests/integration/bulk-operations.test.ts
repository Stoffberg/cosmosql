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
			{
				id: "user-4",
				email: "user4@old.com",
				name: "User Four",
				age: 40,
				isActive: false,
			},
		];

		for (const user of testUsers) {
			await db.users.create({ data: user });
		}

		const testPosts = [
			{
				id: "post-1",
				userId: "user1",
				title: "Post 1",
				content: "Content 1",
				published: true,
			},
			{
				id: "post-2",
				userId: "user1",
				title: "Post 2",
				content: "Content 2",
				published: false,
			},
			{
				id: "post-3",
				userId: "user2",
				title: "Post 3",
				content: "Content 3",
				published: false,
			},
		];

		for (const post of testPosts) {
			await db.posts.create({ data: post });
		}
	}, 60000);

	afterAll(async () => {
		// Cleanup is handled by existing test cleanup
	}, 30000);

	describe("updateMany", () => {
		test("should update multiple documents with static data", async () => {
			const result = await db.users.updateMany({
				where: { isActive: false },
				data: { status: "inactive" },
				enableCrossPartitionQuery: true,
			});

			expect(result.success).toBe(true);
			expect(result.updated).toBe(2); // user-3 and user-4
			expect(result.failed).toBe(0);
			expect(result.performance.ruConsumed).toBeGreaterThan(0);
			expect(result.performance.durationMs).toBeGreaterThan(0);
		});

		test("should update documents with dynamic function", async () => {
			const result = await db.users.updateMany({
				where: { email: { contains: "@old.com" } },
				data: (doc) => ({
					email: doc.email.replace("@old.com", "@new.com"),
					metadata: {
						lastLogin: new Date(),
						loginCount: 1,
					},
				}),
				enableCrossPartitionQuery: true,
			});

			expect(result.success).toBe(true);
			expect(result.updated).toBe(2);

			// Verify the updates
			const updated = await db.users.findMany({
				where: { email: { contains: "@new.com" } },
				enableCrossPartitionQuery: true,
			});

			expect(updated.length).toBe(2);
			expect(updated[0].email).toContain("@new.com");
			expect(updated[0].metadata).toBeDefined();
		});

		test("should track progress during update", async () => {
			const progressUpdates: any[] = [];

			const result = await db.users.updateMany({
				where: { isActive: true },
				data: { status: "active" },
				enableCrossPartitionQuery: true,
				batchSize: 1,
				onProgress: (stats) => {
					progressUpdates.push(stats);
				},
			});

			expect(result.success).toBe(true);
			expect(progressUpdates.length).toBeGreaterThan(0);

			const lastUpdate = progressUpdates[progressUpdates.length - 1];
			expect(lastUpdate.percentage).toBe(100);
			expect(lastUpdate.total).toBeGreaterThan(0);
			expect(lastUpdate.updated).toBe(result.updated);
		});

		test("should respect batch size and concurrency", async () => {
			const result = await db.users.updateMany({
				where: {},
				data: { status: "processed" },
				enableCrossPartitionQuery: true,
				batchSize: 2,
				maxConcurrency: 1,
			});

			expect(result.success).toBe(true);
			expect(result.updated).toBeGreaterThan(0);
		});

		test("should handle empty results gracefully", async () => {
			const result = await db.users.updateMany({
				where: { age: 999 },
				data: { status: "test" },
				enableCrossPartitionQuery: true,
			});

			expect(result.success).toBe(true);
			expect(result.updated).toBe(0);
			expect(result.failed).toBe(0);
		});

		test("should work with partition key", async () => {
			const result = await db.users.updateMany({
				where: { name: "User One" },
				data: { age: 26 },
				partitionKey: "user1@example.com",
			});

			expect(result.success).toBe(true);
		});

		test("should collect errors when continueOnError is true", async () => {
			// This test would need intentional errors to trigger
			const result = await db.users.updateMany({
				where: {},
				data: { status: "test-continue" },
				enableCrossPartitionQuery: true,
				continueOnError: true,
			});

			expect(result).toHaveProperty("errors");
			expect(Array.isArray(result.errors)).toBe(true);
		});
	});

	describe("deleteMany", () => {
		test("should require confirmation", async () => {
			await expect(
				db.posts.deleteMany({
					where: { published: false },
					enableCrossPartitionQuery: true,
				}),
			).rejects.toThrow("Must set confirm: true");
		});

		test("should delete multiple documents with confirmation", async () => {
			const result = await db.posts.deleteMany({
				where: { published: false },
				confirm: true,
				enableCrossPartitionQuery: true,
			});

			expect(result.success).toBe(true);
			expect(result.deleted).toBe(2); // post-2 and post-3
			expect(result.failed).toBe(0);
			expect(result.performance.ruConsumed).toBeGreaterThan(0);
		});

		test("should track progress during deletion", async () => {
			// Recreate some posts
			await db.posts.create({
				data: {
					id: "post-temp-1",
					userId: "user-temp",
					title: "Temp 1",
					content: "Content",
					published: false,
				},
			});
			await db.posts.create({
				data: {
					id: "post-temp-2",
					userId: "user-temp",
					title: "Temp 2",
					content: "Content",
					published: false,
				},
			});

			const progressUpdates: any[] = [];

			const result = await db.posts.deleteMany({
				where: { userId: "user-temp" },
				confirm: true,
				enableCrossPartitionQuery: true,
				batchSize: 1,
				onProgress: (stats) => {
					progressUpdates.push(stats);
				},
			});

			expect(result.success).toBe(true);
			expect(progressUpdates.length).toBeGreaterThan(0);
		});

		test("should handle empty results gracefully", async () => {
			const result = await db.posts.deleteMany({
				where: { title: "nonexistent" },
				confirm: true,
				enableCrossPartitionQuery: true,
			});

			expect(result.success).toBe(true);
			expect(result.deleted).toBe(0);
		});

		test("should work with partition key", async () => {
			// Create a post to delete
			await db.posts.create({
				data: {
					id: "post-pk-test",
					userId: "user1",
					title: "PK Test",
					content: "Content",
					published: false,
				},
			});

			const result = await db.posts.deleteMany({
				where: { title: "PK Test" },
				confirm: true,
				partitionKey: "user1",
			});

			expect(result.success).toBe(true);
			expect(result.deleted).toBeGreaterThanOrEqual(1);
		});
	});

	describe("Performance and RU tracking", () => {
		test("should track RU consumption", async () => {
			const result = await db.users.updateMany({
				where: {},
				data: { status: "ru-test" },
				enableCrossPartitionQuery: true,
			});

			expect(result.performance.ruConsumed).toBeGreaterThan(0);
			expect(result.performance.avgRuPerDocument).toBeGreaterThanOrEqual(0);
		});

		test("should calculate performance metrics", async () => {
			const result = await db.users.updateMany({
				where: {},
				data: { status: "perf-test" },
				enableCrossPartitionQuery: true,
			});

			expect(result.performance.durationMs).toBeGreaterThan(0);
			expect(result.performance.documentsPerSecond).toBeGreaterThanOrEqual(0);
		});
	});
});

