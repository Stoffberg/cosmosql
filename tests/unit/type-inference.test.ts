/**
 * Type-level tests for type inference system
 * These tests verify that TypeScript correctly infers types from schemas.
 * If types are incorrect, TypeScript will fail at compile time.
 */

import { container, field } from "../../src/schema";
import type {
	CreateInput,
	InferSchema,
	OptionalKeys,
	RequiredKeys,
	UpdateInput,
} from "../../src/types";

// Helper type to assert type equality
type ExpectEqual<T, U> = T extends U ? (U extends T ? true : false) : false;

describe("Type Inference", () => {
	describe("Basic field types", () => {
		test("infers string type", () => {
			const schema = container("test", {
				name: field.string(),
			});

			type Result = InferSchema<typeof schema.schema>;
			type Expected = { name: string };

			// Type assertion - will fail at compile time if types don't match
			const _typeCheck: ExpectEqual<Result, Expected> = true;
			expect(_typeCheck).toBe(true);
		});

		test("infers number type", () => {
			const schema = container("test", {
				age: field.number(),
			});

			type Result = InferSchema<typeof schema.schema>;
			type Expected = { age: number };

			const _typeCheck: ExpectEqual<Result, Expected> = true;
			expect(_typeCheck).toBe(true);
		});

		test("infers boolean type", () => {
			const schema = container("test", {
				active: field.boolean(),
			});

			type Result = InferSchema<typeof schema.schema>;
			type Expected = { active: boolean };

			const _typeCheck: ExpectEqual<Result, Expected> = true;
			expect(_typeCheck).toBe(true);
		});

		test("infers date type", () => {
			const schema = container("test", {
				createdAt: field.date(),
			});

			type Result = InferSchema<typeof schema.schema>;
			type Expected = { createdAt: Date };

			const _typeCheck: ExpectEqual<Result, Expected> = true;
			expect(_typeCheck).toBe(true);
		});

		test("infers array type", () => {
			const schema = container("test", {
				tags: field.array(field.string()),
			});

			type Result = InferSchema<typeof schema.schema>;
			type Expected = { tags: string[] };

			const _typeCheck: ExpectEqual<Result, Expected> = true;
			expect(_typeCheck).toBe(true);
		});

		test("infers nested object type", () => {
			const schema = container("test", {
				address: field.object({
					street: field.string(),
					city: field.string(),
				}),
			});

			type Result = InferSchema<typeof schema.schema>;
			type Expected = {
				address: {
					street: string;
					city: string;
				};
			};

			const _typeCheck: ExpectEqual<Result, Expected> = true;
			expect(_typeCheck).toBe(true);
		});
	});

	describe("Optional fields", () => {
		test("infers optional field as union with undefined", () => {
			const schema = container("test", {
				id: field.string(),
				email: field.string().optional(),
			});

			type Result = InferSchema<typeof schema.schema>;
			type Expected = {
				id: string;
				email: string | undefined;
			};

			const _typeCheck: ExpectEqual<Result, Expected> = true;
			expect(_typeCheck).toBe(true);
		});

		test("infers multiple optional fields", () => {
			const schema = container("test", {
				name: field.string(),
				email: field.string().optional(),
				phone: field.string().optional(),
			});

			type Result = InferSchema<typeof schema.schema>;
			type Expected = {
				name: string;
				email: string | undefined;
				phone: string | undefined;
			};

			const _typeCheck: ExpectEqual<Result, Expected> = true;
			expect(_typeCheck).toBe(true);
		});
	});

	describe("Fields with defaults", () => {
		test("infers field with default value", () => {
			const schema = container("test", {
				role: field.string().default("user"),
			});

			type Result = InferSchema<typeof schema.schema>;
			// Fields with defaults should be optional in CreateInput
			type Expected = {
				role: string | undefined;
			};

			const _typeCheck: ExpectEqual<Result, Expected> = true;
			expect(_typeCheck).toBe(true);
		});
	});

	describe("RequiredKeys and OptionalKeys", () => {
		test("identifies required keys correctly", () => {
			const schema = container("test", {
				id: field.string(),
				name: field.string(),
				email: field.string().optional(),
			});

			type SchemaType = typeof schema.schema;
			type Required = RequiredKeys<SchemaType>;
			type Expected = "id" | "name";

			const _typeCheck: ExpectEqual<Required, Expected> = true;
			expect(_typeCheck).toBe(true);
		});

		test("identifies optional keys correctly", () => {
			const schema = container("test", {
				id: field.string(),
				email: field.string().optional(),
				phone: field.string().optional(),
			});

			type SchemaType = typeof schema.schema;
			type Optional = OptionalKeys<SchemaType>;
			type Expected = "email" | "phone";

			const _typeCheck: ExpectEqual<Optional, Expected> = true;
			expect(_typeCheck).toBe(true);
		});

		test("identifies keys with defaults as optional", () => {
			const schema = container("test", {
				id: field.string(),
				role: field.string().default("user"),
			});

			type SchemaType = typeof schema.schema;
			type Optional = OptionalKeys<SchemaType>;
			type Expected = "role";

			const _typeCheck: ExpectEqual<Optional, Expected> = true;
			expect(_typeCheck).toBe(true);
		});
	});

	describe("CreateInput", () => {
		test("creates input type with required fields only", () => {
			const schema = container("test", {
				id: field.string(),
				name: field.string(),
				email: field.string().optional(),
			});

			type Input = CreateInput<typeof schema.schema>;
			type Expected = {
				id: string;
				name: string;
				email?: string | undefined;
			};

			const _typeCheck: ExpectEqual<Input, Expected> = true;
			expect(_typeCheck).toBe(true);
		});

		test("creates input type with fields with defaults as optional", () => {
			const schema = container("test", {
				id: field.string(),
				role: field.string().default("user"),
			});

			type Input = CreateInput<typeof schema.schema>;
			type Expected = {
				id: string;
				role?: string | undefined;
			};

			const _typeCheck: ExpectEqual<Input, Expected> = true;
			expect(_typeCheck).toBe(true);
		});
	});

	describe("UpdateInput", () => {
		test("creates update input with all fields optional", () => {
			const schema = container("test", {
				id: field.string(),
				name: field.string(),
				email: field.string().optional(),
			});

			type Input = UpdateInput<typeof schema.schema>;
			type Expected = {
				id?: string;
				name?: string;
				email?: string | undefined;
			};

			const _typeCheck: ExpectEqual<Input, Expected> = true;
			expect(_typeCheck).toBe(true);
		});
	});

	describe("Complex nested schemas", () => {
		test("infers deeply nested object schema", () => {
			const schema = container("test", {
				user: field.object({
					profile: field.object({
						name: field.string(),
						bio: field.string().optional(),
					}),
				}),
			});

			type Result = InferSchema<typeof schema.schema>;
			type Expected = {
				user: {
					profile: {
						name: string;
						bio: string | undefined;
					};
				};
			};

			const _typeCheck: ExpectEqual<Result, Expected> = true;
			expect(_typeCheck).toBe(true);
		});

		test("infers array of objects", () => {
			const schema = container("test", {
				items: field.array(
					field.object({
						name: field.string(),
						value: field.number(),
					}),
				),
			});

			type Result = InferSchema<typeof schema.schema>;
			type Expected = {
				items: Array<{
					name: string;
					value: number;
				}>;
			};

			const _typeCheck: ExpectEqual<Result, Expected> = true;
			expect(_typeCheck).toBe(true);
		});

		test("infers nested arrays", () => {
			const schema = container("test", {
				data: field.array(field.array(field.number())),
			});

			type Result = InferSchema<typeof schema.schema>;
			type Expected = {
				data: number[][];
			};

			const _typeCheck: ExpectEqual<Result, Expected> = true;
			expect(_typeCheck).toBe(true);
		});
	});
});
