/** biome-ignore-all lint/suspicious/noExplicitAny: test code */
import { QueryBuilder } from "../../src/query/query-builder";

describe("QueryBuilder", () => {
	test("builds simple query", () => {
		const builder = new QueryBuilder();
		builder.where({ age: 18 });

		const { query, parameters } = builder.build();

		expect(query).toContain("WHERE");
		expect(query).toContain("c["age"]");
		expect(parameters).toHaveLength(1);
		expect(parameters[0].value).toBe(18);
	});

	test("builds query with operators", () => {
		const builder = new QueryBuilder();
		builder.where({ age: { gte: 18, lte: 65 } });

		const { query, parameters } = builder.build();

		expect(query).toContain(">=");
		expect(query).toContain("<=");
		expect(parameters).toHaveLength(2);
	});

	test("adds ORDER BY", () => {
		const builder = new QueryBuilder();
		builder.orderBy({ age: "desc" });

		const { query } = builder.build();

		expect(query).toContain("ORDER BY c["age"] DESC");
	});

	test("adds OFFSET and LIMIT together", () => {
		const builder = new QueryBuilder();
		builder.take(10).skip(20);

		const { query } = builder.build();

		expect(query).toContain("OFFSET 20");
		expect(query).toContain("LIMIT 10");
	});

	describe("WHERE clause", () => {
		test("equals operator", () => {
			const builder = new QueryBuilder();
			builder.where({ name: { equals: "John" } });

			const { query, parameters } = builder.build();

			expect(query).toContain("c["name"] = @param0");
			expect(parameters[0].value).toBe("John");
		});

		test("gt operator", () => {
			const builder = new QueryBuilder();
			builder.where({ age: { gt: 18 } });

			const { query, parameters } = builder.build();

			expect(query).toContain("c["age"] > @param0");
			expect(parameters[0].value).toBe(18);
		});

		test("gte operator", () => {
			const builder = new QueryBuilder();
			builder.where({ age: { gte: 18 } });

			const { query, parameters } = builder.build();

			expect(query).toContain("c["age"] >= @param0");
			expect(parameters[0].value).toBe(18);
		});

		test("lt operator", () => {
			const builder = new QueryBuilder();
			builder.where({ age: { lt: 65 } });

			const { query, parameters } = builder.build();

			expect(query).toContain("c["age"] < @param0");
			expect(parameters[0].value).toBe(65);
		});

		test("lte operator", () => {
			const builder = new QueryBuilder();
			builder.where({ age: { lte: 65 } });

			const { query, parameters } = builder.build();

			expect(query).toContain("c["age"] <= @param0");
			expect(parameters[0].value).toBe(65);
		});

		test("contains operator", () => {
			const builder = new QueryBuilder();
			builder.where({ email: { contains: "@example.com" } });

			const { query, parameters } = builder.build();

			expect(query).toContain("CONTAINS(c["email"], @param0)");
			expect(parameters[0].value).toBe("@example.com");
		});

		test("startsWith operator", () => {
			const builder = new QueryBuilder();
			builder.where({ name: { startsWith: "John" } });

			const { query, parameters } = builder.build();

			expect(query).toContain("STARTSWITH(c["name"], @param0)");
			expect(parameters[0].value).toBe("John");
		});

		test("endsWith operator", () => {
			const builder = new QueryBuilder();
			builder.where({ email: { endsWith: ".com" } });

			const { query, parameters } = builder.build();

			expect(query).toContain("ENDSWITH(c["email"], @param0)");
			expect(parameters[0].value).toBe(".com");
		});

		test("multiple conditions on same field", () => {
			const builder = new QueryBuilder();
			builder.where({ age: { gte: 18, lte: 65 } });

			const { query, parameters } = builder.build();

			expect(query).toContain("c["age"] >= @param0");
			expect(query).toContain("c["age"] <= @param1");
			expect(query).toContain("AND");
			expect(parameters).toHaveLength(2);
		});

		test("multiple fields", () => {
			const builder = new QueryBuilder();
			builder.where({ age: 18, name: "John" });

			const { query, parameters } = builder.build();

			expect(query).toContain("c["age"] = @param0");
			expect(query).toContain("c["name"] = @param1");
			expect(query).toContain("AND");
			expect(parameters).toHaveLength(2);
		});

		test("direct value assignment", () => {
			const builder = new QueryBuilder();
			builder.where({
				name: "Alice",
				age: 25,
				active: true,
			});

			const { parameters } = builder.build();

			expect(parameters).toHaveLength(3);
			expect(parameters[0].value).toBe("Alice");
			expect(parameters[1].value).toBe(25);
			expect(parameters[2].value).toBe(true);
		});

		test("handles null values (skipped)", () => {
			const builder = new QueryBuilder();
			builder.where({ name: null as any });

			const { query, parameters } = builder.build();

			expect(parameters).toHaveLength(0);
			expect(query).not.toContain("c["name"]");
			expect(query).toBe("SELECT * FROM c");
		});

		test("handles undefined values (skipped)", () => {
			const builder = new QueryBuilder();
			builder.where({ name: undefined as any });

			const { query, parameters } = builder.build();

			expect(parameters).toHaveLength(0);
			expect(query).not.toContain("c["name"]");
			expect(query).toBe("SELECT * FROM c");
		});

		test("mixed null and valid values", () => {
			const builder = new QueryBuilder();
			builder.where({
				name: "John",
				age: null as any,
				email: "john@example.com",
			});

			const { query, parameters } = builder.build();

			expect(parameters).toHaveLength(2);
			expect(query).toContain("c["name"]");
			expect(query).toContain("c["email"]");
			expect(query).not.toContain("c["age"]");
		});

		test("empty where clause", () => {
			const builder = new QueryBuilder();
			builder.where({});

			const { query, parameters } = builder.build();

			expect(parameters).toHaveLength(0);
			expect(query).not.toContain("WHERE");
		});

		test("zero values are included", () => {
			const builder = new QueryBuilder();
			builder.where({ count: 0 });

			const { query, parameters } = builder.build();

			expect(parameters).toHaveLength(1);
			expect(parameters[0].value).toBe(0);
			expect(query).toContain("c["count"] = @param0");
		});

		test("empty string values are included", () => {
			const builder = new QueryBuilder();
			builder.where({ name: "" });

			const { query, parameters } = builder.build();

			expect(parameters).toHaveLength(1);
			expect(parameters[0].value).toBe("");
			expect(query).toContain("c["name"] = @param0");
		});

		test("false values are included", () => {
			const builder = new QueryBuilder();
			builder.where({ active: false });

			const { query, parameters } = builder.build();

			expect(parameters).toHaveLength(1);
			expect(parameters[0].value).toBe(false);
			expect(query).toContain("c["active"] = @param0");
		});
	});

	describe("SELECT clause", () => {
		test("selects all fields by default", () => {
			const builder = new QueryBuilder();

			const { query } = builder.build();

			expect(query).toContain("SELECT *");
		});

		test("selects specific fields", () => {
			const builder = new QueryBuilder();
			builder.select(["name", "email"]);

			const { query } = builder.build();

			expect(query).toContain("SELECT c["name"], c["email"]");
			expect(query).not.toContain("*");
		});

		test("selects single field", () => {
			const builder = new QueryBuilder();
			builder.select(["id"]);

			const { query } = builder.build();

			expect(query).toContain("SELECT c.id");
		});

		test("selects multiple fields", () => {
			const builder = new QueryBuilder();
			builder.select(["id", "name", "email", "age"]);

			const { query } = builder.build();

			expect(query).toContain("c.id");
			expect(query).toContain("c["name"]");
			expect(query).toContain("c["email"]");
			expect(query).toContain("c["age"]");
		});

		test("empty select defaults to all", () => {
			const builder = new QueryBuilder();
			builder.select([]);

			const { query } = builder.build();

			expect(query).toContain("SELECT *");
		});
	});

	describe("ORDER BY clause", () => {
		test("orders by single field ascending", () => {
			const builder = new QueryBuilder();
			builder.orderBy({ name: "asc" });

			const { query } = builder.build();

			expect(query).toContain("ORDER BY c["name"] ASC");
		});

		test("orders by single field descending", () => {
			const builder = new QueryBuilder();
			builder.orderBy({ age: "desc" });

			const { query } = builder.build();

			expect(query).toContain("ORDER BY c["age"] DESC");
		});

		test("orders by multiple fields", () => {
			const builder = new QueryBuilder();
			builder.orderBy({
				age: "desc",
				name: "asc",
			});

			const { query } = builder.build();

			expect(query).toContain("ORDER BY");
			expect(query).toContain("c["age"] DESC");
			expect(query).toContain("c["name"] ASC");
			expect(query).toMatch(/c\.age DESC.*c\.name ASC/);
		});

		test("no order by when not specified", () => {
			const builder = new QueryBuilder();

			const { query } = builder.build();

			expect(query).not.toContain("ORDER BY");
		});
	});

	describe("TOP, LIMIT and OFFSET", () => {
		test("uses TOP for limit only (no offset)", () => {
			const builder = new QueryBuilder();
			builder.take(10);

			const { query } = builder.build();

			expect(query).toContain("TOP 10");
			expect(query).not.toContain("OFFSET");
			expect(query).not.toContain("LIMIT");
		});

		test("adds offset only (no limit)", () => {
			const builder = new QueryBuilder();
			builder.skip(20);

			const { query } = builder.build();

			expect(query).toContain("OFFSET 20");
			expect(query).not.toContain("LIMIT");
			expect(query).not.toContain("TOP");
		});

		test("uses OFFSET/LIMIT when both are specified", () => {
			const builder = new QueryBuilder();
			builder.take(10).skip(20);

			const { query } = builder.build();

			expect(query).toContain("OFFSET 20");
			expect(query).toContain("LIMIT 10");
			expect(query).not.toContain("TOP");
		});

		test("offset comes before limit in query", () => {
			const builder = new QueryBuilder();
			builder.take(5).skip(10);

			const { query } = builder.build();

			const offsetIndex = query.indexOf("OFFSET");
			const limitIndex = query.indexOf("LIMIT");
			expect(offsetIndex).toBeLessThan(limitIndex);
		});

		test("handles zero offset", () => {
			const builder = new QueryBuilder();
			builder.skip(0);

			const { query } = builder.build();

			expect(query).toContain("OFFSET 0");
		});

		test("handles zero limit with TOP", () => {
			const builder = new QueryBuilder();
			builder.take(0);

			const { query } = builder.build();

			expect(query).toContain("TOP 0");
		});
	});

	describe("Complete queries", () => {
		test("builds query with all clauses", () => {
			const builder = new QueryBuilder();
			builder
				.select(["name", "age"])
				.where({ age: { gte: 18 } })
				.orderBy({ age: "desc" })
				.take(10)
				.skip(5);

			const { query, parameters } = builder.build();

			expect(query).toContain("SELECT c["name"], c["age"]");
			expect(query).toContain("FROM c");
			expect(query).toContain("WHERE c["age"] >= @param0");
			expect(query).toContain("ORDER BY c["age"] DESC");
			expect(query).toContain("OFFSET 5");
			expect(query).toContain("LIMIT 10");
			expect(parameters).toHaveLength(1);
		});

		test("builds minimal query", () => {
			const builder = new QueryBuilder();

			const { query, parameters } = builder.build();

			expect(query).toBe("SELECT * FROM c");
			expect(parameters).toHaveLength(0);
		});

		test("complex filtering", () => {
			const builder = new QueryBuilder();
			builder
				.where({
					age: { gte: 18, lte: 65 },
					email: { contains: "@example.com" },
					active: true,
				})
				.orderBy({ age: "asc", name: "desc" })
				.take(20);

			const { query, parameters } = builder.build();

			expect(query).toContain("WHERE");
			expect(query).toContain("ORDER BY");
			expect(query).toContain("TOP 20");
			expect(parameters.length).toBeGreaterThan(3);
		});

		test("query structure is valid", () => {
			const builder = new QueryBuilder();
			builder.select(["id"]).where({ active: true }).orderBy({ id: "asc" }).skip(10).take(5);

			const { query } = builder.build();

			// Ensure proper order: SELECT ... FROM ... WHERE ... ORDER BY ... OFFSET ... LIMIT
			expect(query).toMatch(/^SELECT.*FROM.*WHERE.*ORDER BY.*OFFSET.*LIMIT/);
		});
	});

	describe("Parameter naming", () => {
		test("parameters are sequentially named", () => {
			const builder = new QueryBuilder();
			builder.where({
				field1: "value1",
				field2: "value2",
				field3: "value3",
			});

			const { parameters } = builder.build();

			expect(parameters[0].name).toBe("@param0");
			expect(parameters[1].name).toBe("@param1");
			expect(parameters[2].name).toBe("@param2");
		});

		test("parameters for multiple operators", () => {
			const builder = new QueryBuilder();
			builder.where({
				age: { gte: 18, lte: 65 },
			});

			const { parameters } = builder.build();

			expect(parameters[0].name).toBe("@param0");
			expect(parameters[1].name).toBe("@param1");
			expect(parameters[0].value).toBe(18);
			expect(parameters[1].value).toBe(65);
		});
	});

	describe("Method chaining", () => {
		test("all methods return builder instance", () => {
			const builder = new QueryBuilder();

			const result1 = builder.select(["id"]);
			const result2 = builder.where({ active: true });
			const result3 = builder.orderBy({ id: "asc" });
			const result4 = builder.take(10);
			const result5 = builder.skip(5);

			expect(result1).toBe(builder);
			expect(result2).toBe(builder);
			expect(result3).toBe(builder);
			expect(result4).toBe(builder);
			expect(result5).toBe(builder);
		});

		test("can chain all methods", () => {
			const builder = new QueryBuilder();

			expect(() => {
				builder
					.select(["id"])
					.where({ active: true })
					.orderBy({ id: "asc" })
					.take(10)
					.skip(5)
					.build();
			}).not.toThrow();
		});
	});
});
