/** biome-ignore-all lint/suspicious/noExplicitAny: test code */
import { AggregateQueryBuilder } from "../../src/query/aggregate-builder";

describe("AggregateQueryBuilder", () => {
	test("builds simple count query", () => {
		const builder = new AggregateQueryBuilder();
		const result = builder.buildCount({});

		expect(result.sql).toBe("SELECT VALUE COUNT(1) FROM c");
		expect(result.parameters).toHaveLength(0);
	});

	test("builds count query with WHERE clause", () => {
		const builder = new AggregateQueryBuilder();
		const result = builder.buildCount({
			where: { age: { gte: 18 } },
		});

		expect(result.sql).toContain("SELECT VALUE COUNT(1)");
		expect(result.sql).toContain("WHERE");
		expect(result.sql).toMatch(/c\["age"\] >= @param0/);
		expect(result.parameters).toHaveLength(1);
		expect(result.parameters[0].value).toBe(18);
	});

	test("builds aggregate query with _count", () => {
		const builder = new AggregateQueryBuilder();
		const result = builder.buildAggregate({
			_count: true,
		});

		expect(result.sql).toContain("SELECT COUNT(1) as _count FROM c");
		expect(result.parameters).toHaveLength(0);
	});

	test("builds aggregate query with multiple aggregations", () => {
		const builder = new AggregateQueryBuilder();
		const result = builder.buildAggregate({
			_count: true,
			_sum: { amount: true },
			_avg: { amount: true },
		});

		expect(result.sql).toContain("COUNT(1) as _count");
		expect(result.sql).toContain("SUM(c[\"amount\"]) as _sum_amount");
		expect(result.sql).toContain("AVG(c[\"amount\"]) as _avg_amount");
		expect(result.parameters).toHaveLength(0);
	});

	test("builds aggregate query with _count select", () => {
		const builder = new AggregateQueryBuilder();
		const result = builder.buildAggregate({
			_count: { select: { field1: true, field2: true } },
		});

		expect(result.sql).toContain("COUNT(c[\"field1\"]) as _count_field1");
		expect(result.sql).toContain("COUNT(c[\"field2\"]) as _count_field2");
	});

	test("builds aggregate query with WHERE clause", () => {
		const builder = new AggregateQueryBuilder();
		const result = builder.buildAggregate({
			_count: true,
			where: { status: "active" },
		});

		expect(result.sql).toContain("WHERE");
		expect(result.sql).toMatch(/c\["status"\] = @param0/);
		expect(result.parameters[0].value).toBe("active");
	});

	test("throws error when no aggregation specified", () => {
		const builder = new AggregateQueryBuilder();

		expect(() => {
			builder.buildAggregate({});
		}).toThrow("At least one aggregation operation");
	});

	test("builds group by query", () => {
		const builder = new AggregateQueryBuilder();
		const result = builder.buildGroupBy({
			by: "category",
			_count: true,
		});

		expect(result.sql).toContain("SELECT");
		expect(result.sql).toContain("c[\"category\"] as category");
		expect(result.sql).toContain("COUNT(1) as _count");
		expect(result.sql).toContain("GROUP BY c[\"category\"]");
	});

	test("builds group by query with multiple fields", () => {
		const builder = new AggregateQueryBuilder();
		const result = builder.buildGroupBy({
			by: ["region", "category"],
			_count: true,
		});

		expect(result.sql).toContain("c[\"region\"] as region");
		expect(result.sql).toContain("c[\"category\"] as category");
		expect(result.sql).toContain("GROUP BY c[\"region\"], c[\"category\"]");
	});

	test("builds group by query with aggregations", () => {
		const builder = new AggregateQueryBuilder();
		const result = builder.buildGroupBy({
			by: "category",
			_count: true,
			_sum: { total: true },
			_avg: { total: true },
		});

		expect(result.sql).toContain("COUNT(1) as _count");
		expect(result.sql).toContain("SUM(c[\"total\"]) as _sum_total");
		expect(result.sql).toContain("AVG(c[\"total\"]) as _avg_total");
	});

	test("builds group by query with ORDER BY", () => {
		const builder = new AggregateQueryBuilder();
		const result = builder.buildGroupBy({
			by: "category",
			_count: true,
			orderBy: { _count: "desc" },
		});

		expect(result.sql).toContain("ORDER BY _count DESC");
	});

	test("builds group by query with ORDER BY on regular field", () => {
		const builder = new AggregateQueryBuilder();
		const result = builder.buildGroupBy({
			by: "category",
			_count: true,
			orderBy: { category: "asc" },
		});

		expect(result.sql).toContain("ORDER BY c[\"category\"] ASC");
	});

	test("builds group by query with OFFSET and LIMIT", () => {
		const builder = new AggregateQueryBuilder();
		const result = builder.buildGroupBy({
			by: "category",
			_count: true,
			skip: 10,
			take: 20,
		});

		expect(result.sql).toContain("OFFSET 10");
		expect(result.sql).toContain("LIMIT 20");
	});

	test("builds group by query with WHERE clause", () => {
		const builder = new AggregateQueryBuilder();
		const result = builder.buildGroupBy({
			by: "category",
			_count: true,
			where: { status: "active" },
		});

		expect(result.sql).toContain("WHERE");
		expect(result.sql).toMatch(/c\["status"\] = @param0/);
	});

	test("builds query with multiple WHERE conditions", () => {
		const builder = new AggregateQueryBuilder();
		const result = builder.buildCount({
			where: {
				age: { gte: 18, lte: 65 },
				status: "active",
			},
		});

		expect(result.sql).toContain("AND");
		expect(result.parameters).toHaveLength(3);
	});

	test("handles WHERE operators correctly", () => {
		const builder = new AggregateQueryBuilder();
		const result = builder.buildCount({
			where: {
				name: { contains: "John" },
				email: { startsWith: "test" },
				age: { gt: 18 },
			},
		});

		expect(result.sql).toMatch(/CONTAINS\(c\["name"\], @param0\)/);
		expect(result.sql).toMatch(/STARTSWITH\(c\["email"\], @param1\)/);
		expect(result.sql).toMatch(/c\["age"\] > @param2/);
		expect(result.parameters).toHaveLength(3);
	});

	test("handles null/undefined in WHERE clause", () => {
		const builder = new AggregateQueryBuilder();
		const result = builder.buildCount({
			where: {
				name: "John",
				age: null as any,
				email: undefined as any,
			},
		});

		expect(result.sql).toMatch(/c\["name"\]/);
		expect(result.sql).not.toMatch(/c\["age"\]/);
		expect(result.sql).not.toMatch(/c\["email"\]/);
		expect(result.parameters).toHaveLength(1);
	});

	test("parameters are sequentially numbered", () => {
		const builder = new AggregateQueryBuilder();
		const result = builder.buildCount({
			where: {
				field1: "value1",
				field2: "value2",
				field3: "value3",
			},
		});

		expect(result.parameters[0].name).toBe("@param0");
		expect(result.parameters[1].name).toBe("@param1");
		expect(result.parameters[2].name).toBe("@param2");
	});
});

