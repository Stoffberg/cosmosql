/** biome-ignore-all lint/suspicious/noExplicitAny: test code */
import { AggregateResultParser } from "../../src/query/aggregate-parser";

describe("AggregateResultParser", () => {
	const parser = new AggregateResultParser();

	test("parses simple _count result", () => {
		const rawResult = { _count: 42 };
		const options = { _count: true as const };

		const result = parser.parseAggregateResult(rawResult, options);

		expect(result._count).toBe(42);
	});

	test("parses _count with select", () => {
		const rawResult = {
			_count_field1: 10,
			_count_field2: 20,
		};
		const options = {
			_count: {
				select: { field1: true, field2: true },
			},
		};

		const result = parser.parseAggregateResult(rawResult, options);

		expect(result._count).toEqual({ field1: 10, field2: 20 });
	});

	test("parses _sum result", () => {
		const rawResult = { _sum_amount: 1250.5 };
		const options = { _sum: { amount: true } };

		const result = parser.parseAggregateResult(rawResult, options);

		expect(result._sum).toEqual({ amount: 1250.5 });
	});

	test("parses _avg result", () => {
		const rawResult = { _avg_amount: 83.37 };
		const options = { _avg: { amount: true } };

		const result = parser.parseAggregateResult(rawResult, options);

		expect(result._avg).toEqual({ amount: 83.37 });
	});

	test("parses _min result", () => {
		const rawResult = { _min_date: "2024-01-01" };
		const options = { _min: { date: true } };

		const result = parser.parseAggregateResult(rawResult, options);

		expect(result._min).toEqual({ date: "2024-01-01" });
	});

	test("parses _max result", () => {
		const rawResult = { _max_date: "2024-12-31" };
		const options = { _max: { date: true } };

		const result = parser.parseAggregateResult(rawResult, options);

		expect(result._max).toEqual({ date: "2024-12-31" });
	});

	test("parses multiple aggregations", () => {
		const rawResult = {
			_count: 15,
			_sum_total: 1250.5,
			_avg_total: 83.37,
		};
		const options = {
			_count: true as const,
			_sum: { total: true },
			_avg: { total: true },
		};

		const result = parser.parseAggregateResult(rawResult, options);

		expect(result._count).toBe(15);
		expect(result._sum).toEqual({ total: 1250.5 });
		expect(result._avg).toEqual({ total: 83.37 });
	});

	test("handles null values", () => {
		const rawResult = { _sum_amount: null };
		const options = { _sum: { amount: true } };

		const result = parser.parseAggregateResult(rawResult, options);

		expect(result._sum).toEqual({ amount: null });
	});

	test("handles missing fields with defaults", () => {
		const rawResult = {};
		const options = { _count: true as const };

		const result = parser.parseAggregateResult(rawResult, options);

		expect(result._count).toBe(0);
	});

	test("parses group by results", () => {
		const rawResults = [
			{ category: "electronics", _count: 150, _sum_total: 45000 },
			{ category: "books", _count: 200, _sum_total: 5000 },
		];
		const options = {
			by: "category" as const,
			_count: true as const,
			_sum: { total: true },
		};

		const result = parser.parseGroupByResults(rawResults, options);

		expect(result).toHaveLength(2);
		expect(result[0]).toEqual({
			category: "electronics",
			_count: 150,
			_sum: { total: 45000 },
		});
		expect(result[1]).toEqual({
			category: "books",
			_count: 200,
			_sum: { total: 5000 },
		});
	});

	test("parses group by with multiple fields", () => {
		const rawResults = [
			{ region: "US", category: "electronics", _count: 100 },
		];
		const options = {
			by: ["region", "category"] as const,
			_count: true as const,
		};

		const result = parser.parseGroupByResults(rawResults, options);

		expect(result[0]).toEqual({
			region: "US",
			category: "electronics",
			_count: 100,
		});
	});

	test("handles empty group by results", () => {
		const rawResults: any[] = [];
		const options = {
			by: "category" as const,
			_count: true as const,
		};

		const result = parser.parseGroupByResults(rawResults, options);

		expect(result).toHaveLength(0);
	});
});

