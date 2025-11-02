/** biome-ignore-all lint/suspicious/noExplicitAny: test code */
import { container, field } from "../../src/schema";

describe("Schema Definition", () => {
	test("creates basic schema", () => {
		const users = container("users", {
			id: field.string(),
			email: field.string(),
			age: field.number(),
		});

		expect(users.name).toBe("users");
	});

	test("handles partition keys", () => {
		const users = container("users", {
			id: field.string(),
			email: field.string(),
		}).partitionKey("email");

		expect(users.partitionKeyField).toBe("email");
	});

	test("supports optional fields", () => {
		const users = container("users", {
			id: field.string(),
			name: field.string().optional(),
		});

		expect(users.schema.name.optional).toBe(true);
	});

	test("supports default values", () => {
		const users = container("users", {
			id: field.string(),
			isActive: field.boolean().default(true),
		});

		expect(users.schema.isActive.default).toBe(true);
	});

	test("supports nested objects", () => {
		const users = container("users", {
			id: field.string(),
			address: field.object({
				street: field.string(),
				city: field.string(),
			}),
		});

		expect(users.schema.address.type).toBe("object");
	});

	test("supports arrays", () => {
		const users = container("users", {
			id: field.string(),
			tags: field.array(field.string()),
		});

		expect(users.schema.tags.type).toBe("array");
	});

	describe("Field Types", () => {
		test("creates string field", () => {
			const config = field.string().getConfig();
			expect(config.type).toBe("string");
			expect(config.optional).toBeUndefined();
			expect(config.default).toBeUndefined();
		});

		test("creates number field", () => {
			const config = field.number().getConfig();
			expect(config.type).toBe("number");
		});

		test("creates boolean field", () => {
			const config = field.boolean().getConfig();
			expect(config.type).toBe("boolean");
		});

		test("creates date field", () => {
			const config = field.date().getConfig();
			expect(config.type).toBe("date");
		});

		test("creates array field with primitive type", () => {
			const config = field.array(field.string()).getConfig();
			expect(config.type).toBe("array");
			expect(config.array).toBeDefined();
			expect(config.array?.type).toBe("string");
		});

		test("creates array of numbers", () => {
			const config = field.array(field.number()).getConfig();
			expect(config.type).toBe("array");
			expect(config.array?.type).toBe("number");
		});

		test("creates array of booleans", () => {
			const config = field.array(field.boolean()).getConfig();
			expect(config.type).toBe("array");
			expect(config.array?.type).toBe("boolean");
		});

		test("creates array of dates", () => {
			const config = field.array(field.date()).getConfig();
			expect(config.type).toBe("array");
			expect(config.array?.type).toBe("date");
		});

		test("creates array of objects", () => {
			const config = field
				.array(
					field.object({
						name: field.string(),
						value: field.number(),
					}),
				)
				.getConfig();

			expect(config.type).toBe("array");
			expect(config.array?.type).toBe("object");
			expect(config.array?.objectSchema).toBeDefined();
		});

		test("creates object with nested structure", () => {
			const config = field
				.object({
					name: field.string(),
					age: field.number(),
					active: field.boolean(),
				})
				.getConfig();

			expect(config.type).toBe("object");
			expect(config.objectSchema).toBeDefined();
			expect(config.objectSchema?.name.type).toBe("string");
			expect(config.objectSchema?.age.type).toBe("number");
			expect(config.objectSchema?.active.type).toBe("boolean");
		});

		test("creates deeply nested object", () => {
			const config = field
				.object({
					user: field.object({
						profile: field.object({
							name: field.string(),
							bio: field.string(),
						}),
					}),
				})
				.getConfig();

			expect(config.type).toBe("object");
			expect(config.objectSchema?.user.type).toBe("object");
			expect(config.objectSchema?.user.objectSchema?.profile.type).toBe(
				"object",
			);
		});
	});

	describe("Optional Fields", () => {
		test("marks field as optional", () => {
			const config = field.string().optional().getConfig();
			expect(config.optional).toBe(true);
		});

		test("optional number field", () => {
			const config = field.number().optional().getConfig();
			expect(config.type).toBe("number");
			expect(config.optional).toBe(true);
		});

		test("optional boolean field", () => {
			const config = field.boolean().optional().getConfig();
			expect(config.type).toBe("boolean");
			expect(config.optional).toBe(true);
		});

		test("optional date field", () => {
			const config = field.date().optional().getConfig();
			expect(config.type).toBe("date");
			expect(config.optional).toBe(true);
		});

		test("optional array field", () => {
			const config = field.array(field.string()).optional().getConfig();
			expect(config.type).toBe("array");
			expect(config.optional).toBe(true);
		});

		test("optional object field", () => {
			const config = field
				.object({
					name: field.string(),
				})
				.optional()
				.getConfig();
			expect(config.type).toBe("object");
			expect(config.optional).toBe(true);
		});
	});

	describe("Default Values", () => {
		test("sets default string value", () => {
			const config = field.string().default("test").getConfig();
			expect(config.default).toBe("test");
		});

		test("sets default number value", () => {
			const config = field.number().default(42).getConfig();
			expect(config.default).toBe(42);
		});

		test("sets default boolean value", () => {
			const config = field.boolean().default(false).getConfig();
			expect(config.default).toBe(false);
		});

		test("sets default to zero", () => {
			const config = field.number().default(0).getConfig();
			expect(config.default).toBe(0);
		});

		test("sets default to empty string", () => {
			const config = field.string().default("").getConfig();
			expect(config.default).toBe("");
		});

		test("sets default array", () => {
			const defaultArray: string[] = [];
			const config = field
				.array(field.string())
				.default(defaultArray)
				.getConfig();
			expect(config.default).toBe(defaultArray);
		});

		test("sets default object", () => {
			const defaultObj = { name: "test" };
			const config = field
				.object({
					name: field.string(),
				})
				.default(defaultObj as any)
				.getConfig();
			expect(config.default).toEqual(defaultObj);
		});

		test("chaining optional and default", () => {
			const config = field.string().optional().default("default").getConfig();
			expect(config.optional).toBe(true);
			expect(config.default).toBe("default");
		});
	});

	describe("Container Creation", () => {
		test("creates container with multiple fields", () => {
			const posts = container("posts", {
				id: field.string(),
				title: field.string(),
				content: field.string(),
				views: field.number(),
				published: field.boolean(),
				createdAt: field.date(),
				tags: field.array(field.string()),
				metadata: field.object({
					author: field.string(),
					category: field.string(),
				}),
			});

			expect(posts.name).toBe("posts");
			expect(posts.schema.id.type).toBe("string");
			expect(posts.schema.title.type).toBe("string");
			expect(posts.schema.views.type).toBe("number");
			expect(posts.schema.published.type).toBe("boolean");
			expect(posts.schema.createdAt.type).toBe("date");
			expect(posts.schema.tags.type).toBe("array");
			expect(posts.schema.metadata.type).toBe("object");
		});

		test("creates container with optional fields", () => {
			const users = container("users", {
				id: field.string(),
				email: field.string(),
				name: field.string().optional(),
				age: field.number().optional(),
			});

			expect(users.schema.name.optional).toBe(true);
			expect(users.schema.age.optional).toBe(true);
			expect(users.schema.id.optional).toBeUndefined();
		});

		test("creates container with defaults", () => {
			const users = container("users", {
				id: field.string(),
				role: field.string().default("user"),
				credits: field.number().default(0),
				active: field.boolean().default(true),
			});

			expect(users.schema.role.default).toBe("user");
			expect(users.schema.credits.default).toBe(0);
			expect(users.schema.active.default).toBe(true);
		});

		test("creates container without partition key", () => {
			const items = container("items", {
				id: field.string(),
				name: field.string(),
			});

			expect(items.partitionKeyField).toBeUndefined();
		});

		test("adds partition key to container", () => {
			const orders = container("orders", {
				id: field.string(),
				userId: field.string(),
				total: field.number(),
			}).partitionKey("userId");

			expect(orders.partitionKeyField).toBe("userId");
			expect(orders.name).toBe("orders");
		});

		test("partition key can be any field", () => {
			const items = container("items", {
				id: field.string(),
				category: field.string(),
				name: field.string(),
			}).partitionKey("category");

			expect(items.partitionKeyField).toBe("category");
		});
	});

	describe("Complex Nested Structures", () => {
		test("array of objects with nested fields", () => {
			const schema = container("blog", {
				id: field.string(),
				posts: field.array(
					field.object({
						title: field.string(),
						author: field.object({
							name: field.string(),
							email: field.string(),
						}),
						tags: field.array(field.string()),
					}),
				),
			});

			expect(schema.schema.posts.type).toBe("array");
			const postSchema = schema.schema.posts.array?.objectSchema;
			expect(postSchema?.title.type).toBe("string");
			expect(postSchema?.author.type).toBe("object");
			expect(postSchema?.tags.type).toBe("array");
		});

		test("nested arrays", () => {
			const schema = container("matrix", {
				id: field.string(),
				data: field.array(field.array(field.number())),
			});

			expect(schema.schema.data.type).toBe("array");
			expect(schema.schema.data.array?.type).toBe("array");
			expect(schema.schema.data.array?.array?.type).toBe("number");
		});

		test("mixed optional and required nested fields", () => {
			const schema = container("users", {
				id: field.string(),
				profile: field.object({
					name: field.string(),
					bio: field.string().optional(),
					social: field
						.object({
							twitter: field.string().optional(),
							github: field.string().optional(),
						})
						.optional(),
				}),
			});

			expect(schema.schema.profile.objectSchema?.bio.optional).toBe(true);
			expect(schema.schema.profile.objectSchema?.social.optional).toBe(true);
		});

		test("optional array of optional objects", () => {
			const schema = container("data", {
				id: field.string(),
				items: field
					.array(
						field.object({
							value: field.string().optional(),
						}),
					)
					.optional(),
			});

			expect(schema.schema.items.optional).toBe(true);
			expect(schema.schema.items.array?.objectSchema?.value.optional).toBe(
				true,
			);
		});
	});

	describe("Schema Metadata", () => {
		test("infer property is null (type-only)", () => {
			const schema = container("test", {
				id: field.string(),
			});

			expect(schema.infer).toBeNull();
		});

		test("schema property contains field configs", () => {
			const schema = container("test", {
				id: field.string(),
				name: field.string(),
			});

			expect(schema.schema).toBeDefined();
			expect(schema.schema.id).toBeDefined();
			expect(schema.schema.name).toBeDefined();
		});

		test("name property is accessible", () => {
			const schema = container("my-container", {
				id: field.string(),
			});

			expect(schema.name).toBe("my-container");
		});
	});
});
