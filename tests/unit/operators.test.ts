/**
 * Type-level tests for operator types
 * These verify that the type definitions work correctly
 */

import type { OrderByInput, SelectInput, SelectResult, WhereInput } from "../../src/types";

describe("Operator Types", () => {
	describe("WhereInput", () => {
		test("accepts string operators", () => {
			type TestSchema = {
				name: string;
				email: string;
			};

			const where: WhereInput<TestSchema> = {
				name: "John",
				email: {
					contains: "@example.com",
					startsWith: "user",
				},
			};

			expect(where.name).toBe("John");
			const emailOp = where.email as { contains?: string; startsWith?: string };
			expect(emailOp.contains).toBe("@example.com");
		});

		test("accepts number operators", () => {
			type TestSchema = {
				age: number;
				score: number;
			};

			const where: WhereInput<TestSchema> = {
				age: 25,
				score: {
					gt: 100,
					lte: 200,
				},
			};

			expect(where.age).toBe(25);
			const scoreOp = where.score as { gt?: number; lte?: number };
			expect(scoreOp.gt).toBe(100);
		});

		test("accepts boolean operators", () => {
			type TestSchema = {
				active: boolean;
			};

			const where: WhereInput<TestSchema> = {
				active: true,
			};

			expect(where.active).toBe(true);
		});

		test("accepts array operators", () => {
			type TestSchema = {
				tags: string[];
			};

			const where: WhereInput<TestSchema> = {
				tags: {
					contains: "javascript",
					containsAny: ["typescript", "javascript"],
					containsAll: ["web", "frontend"],
				},
			};

			expect(where.tags?.contains).toBe("javascript");
			expect(where.tags?.containsAny).toEqual(["typescript", "javascript"]);
		});

		test("accepts nested object operators", () => {
			type TestSchema = {
				address: {
					city: string;
					zip: number;
				};
			};

			const where: WhereInput<TestSchema> = {
				address: {
					city: "New York",
					zip: 10001,
				},
			};

			expect(where.address?.city).toBe("New York");
		});
	});

	describe("SelectInput", () => {
		test("accepts boolean for fields", () => {
			type TestSchema = {
				id: string;
				name: string;
				email: string;
			};

			const select: SelectInput<TestSchema> = {
				id: true,
				name: true,
				email: false,
			};

			expect(select.id).toBe(true);
			expect(select.email).toBe(false);
		});

		test("accepts nested select for objects", () => {
			type TestSchema = {
				user: {
					name: string;
					email: string;
				};
			};

			const select: SelectInput<TestSchema> = {
				user: {
					name: true,
					email: false,
				},
			};

			const userSelect = select.user as SelectInput<TestSchema["user"]>;
			expect(userSelect?.name).toBe(true);
		});
	});

	describe("OrderByInput", () => {
		test("accepts asc and desc", () => {
			type TestSchema = {
				name: string;
				age: number;
			};

			const orderBy: OrderByInput<TestSchema> = {
				name: "asc",
				age: "desc",
			};

			expect(orderBy.name).toBe("asc");
			expect(orderBy.age).toBe("desc");
		});
	});

	describe("SelectResult", () => {
		test("correctly types result from select", () => {
			type TestSchema = {
				id: string;
				name: string;
				email: string;
			};

			type SelectType = {
				id: true;
				name: true;
			};

			// This is a type-level test - if SelectResult is wrong, TypeScript will error
			type Result = SelectResult<TestSchema, SelectType>;
			type Expected = {
				id: string;
				name: string;
			};

			// Type assertion
			const _typeCheck: Result extends Expected ? (Expected extends Result ? true : false) : false =
				true;
			expect(_typeCheck).toBe(true);
		});
	});
});
