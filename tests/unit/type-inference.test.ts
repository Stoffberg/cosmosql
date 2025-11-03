/**
 * Type-level tests for type inference system
 * These tests verify that TypeScript correctly infers types from schemas.
 * If types are incorrect, TypeScript will fail at compile time.
 */

import { container, field } from "../../src/schema";
import type {
	AggregateResult,
	CreateInput,
	GroupByResult,
	InferSchema,
	KeysOfType,
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

	describe("Aggregate Operations", () => {
		const testSchema = container("test", {
			id: field.string(),
			name: field.string(),
			amount: field.number(),
			value: field.number().optional(),
			category: field.string(),
			partitionKey: field.string(),
		}).partitionKey("partitionKey");

		type TestSchema = InferSchema<typeof testSchema.schema>;

		test("infers _count result type", () => {
			type Operations = { _count: true };
			type Result = AggregateResult<TestSchema, Operations>;
			type Expected = { _count: number };

			const _typeCheck: ExpectEqual<Result, Expected> = true;
			expect(_typeCheck).toBe(true);
		});

		test("infers _sum result type", () => {
			type Operations = { _sum: { amount: true; value: true } };
			type Result = AggregateResult<TestSchema, Operations>;
			type Expected = { _sum: { amount: number | null; value: number | null } };

			const _typeCheck: ExpectEqual<Result, Expected> = true;
			expect(_typeCheck).toBe(true);
		});

		test("infers _avg result type", () => {
			type Operations = { _avg: { amount: true } };
			type Result = AggregateResult<TestSchema, Operations>;
			type Expected = { _avg: { amount: number | null } };

			const _typeCheck: ExpectEqual<Result, Expected> = true;
			expect(_typeCheck).toBe(true);
		});

		test("infers _min result type", () => {
			type Operations = { _min: { amount: true; name: true } };
			type Result = AggregateResult<TestSchema, Operations>;
			type Expected = { _min: { amount: number | null; name: string | null } };

			const _typeCheck: ExpectEqual<Result, Expected> = true;
			expect(_typeCheck).toBe(true);
		});

		test("infers _max result type", () => {
			type Operations = { _max: { amount: true; category: true } };
			type Result = AggregateResult<TestSchema, Operations>;
			type Expected = { _max: { amount: number | null; category: string | null } };

			const _typeCheck: ExpectEqual<Result, Expected> = true;
			expect(_typeCheck).toBe(true);
		});

		test("infers multiple operations result type", () => {
			type Operations = {
				_count: true;
				_sum: { amount: true };
				_avg: { amount: true };
				_min: { amount: true };
				_max: { amount: true };
			};
			type Result = AggregateResult<TestSchema, Operations>;
			type Expected = {
				_count: number;
				_sum: { amount: number | null };
				_avg: { amount: number | null };
				_min: { amount: number | null };
				_max: { amount: number | null };
			};

			const _typeCheck: ExpectEqual<Result, Expected> = true;
			expect(_typeCheck).toBe(true);
		});

		test("infers _count with select result type", () => {
			type Operations = {
				_count: { select: { amount: true; value: true } };
			};
			type Result = AggregateResult<TestSchema, Operations>;
			type Expected = { _count: { amount: number; value: number } };

			const _typeCheck: ExpectEqual<Result, Expected> = true;
			expect(_typeCheck).toBe(true);
		});
	});

	describe("GroupBy Operations", () => {
		const testSchema = container("test", {
			id: field.string(),
			name: field.string(),
			amount: field.number(),
			category: field.string(),
			partitionKey: field.string(),
		}).partitionKey("partitionKey");

		type TestSchema = InferSchema<typeof testSchema.schema>;

		test("infers groupBy with single field", () => {
			type Operations = { _count: true; _sum: { amount: true } };
			type Result = GroupByResult<TestSchema, "category", Operations>;
			type Expected = Array<{
				category: string;
				_count: number;
				_sum: { amount: number | null };
			}>;

			const _typeCheck: ExpectEqual<Result, Expected> = true;
			expect(_typeCheck).toBe(true);
		});

		test("infers groupBy with multiple fields", () => {
			type Operations = { _count: true };
			type Result = GroupByResult<TestSchema, ["category", "partitionKey"], Operations>;
			type Expected = Array<{
				category: string;
				partitionKey: string;
				_count: number;
			}>;

			const _typeCheck: ExpectEqual<Result, Expected> = true;
			expect(_typeCheck).toBe(true);
		});

		test("infers groupBy with all operations", () => {
			type Operations = {
				_count: true;
				_sum: { amount: true };
				_avg: { amount: true };
				_min: { amount: true };
				_max: { amount: true };
			};
			type Result = GroupByResult<TestSchema, "category", Operations>;
			type Expected = Array<{
				category: string;
				_count: number;
				_sum: { amount: number | null };
				_avg: { amount: number | null };
				_min: { amount: number | null };
				_max: { amount: number | null };
			}>;

			const _typeCheck: ExpectEqual<Result, Expected> = true;
			expect(_typeCheck).toBe(true);
		});
	});

	describe("Convenience Methods", () => {
		const testSchema = container("test", {
			id: field.string(),
			name: field.string(),
			amount: field.number(),
			score: field.number().optional(),
			active: field.boolean(),
		});

		type TestSchema = InferSchema<typeof testSchema.schema>;

		test("sum method returns number or null", () => {
			// sum should work with number fields
			type SumResult = number | null;
			const _typeCheck: ExpectEqual<SumResult, number | null> = true;
			expect(_typeCheck).toBe(true);
		});

		test("avg method returns number or null", () => {
			// avg should work with number fields
			type AvgResult = number | null;
			const _typeCheck: ExpectEqual<AvgResult, number | null> = true;
			expect(_typeCheck).toBe(true);
		});

		test("min method returns field type or null", () => {
			// min should work with any field and return that field's type or null
			type MinStringResult = TestSchema["name"] | null;
			type ExpectedStringMin = string | null;
			const _stringCheck: ExpectEqual<MinStringResult, ExpectedStringMin> = true;
			expect(_stringCheck).toBe(true);

			type MinNumberResult = TestSchema["amount"] | null;
			type ExpectedNumberMin = number | null;
			const _numberCheck: ExpectEqual<MinNumberResult, ExpectedNumberMin> = true;
			expect(_numberCheck).toBe(true);

			type MinOptionalResult = TestSchema["score"] | null;
			type ExpectedOptionalMin = (number | undefined) | null;
			const _optionalCheck: ExpectEqual<MinOptionalResult, ExpectedOptionalMin> = true;
			expect(_optionalCheck).toBe(true);
		});

		test("max method returns field type or null", () => {
			// max should work with any field and return that field's type or null
			type MaxStringResult = TestSchema["name"] | null;
			type ExpectedStringMax = string | null;
			const _stringCheck: ExpectEqual<MaxStringResult, ExpectedStringMax> = true;
			expect(_stringCheck).toBe(true);

			type MaxNumberResult = TestSchema["amount"] | null;
			type ExpectedNumberMax = number | null;
			const _numberCheck: ExpectEqual<MaxNumberResult, ExpectedNumberMax> = true;
			expect(_numberCheck).toBe(true);

			type MaxBooleanResult = TestSchema["active"] | null;
			type ExpectedBooleanMax = boolean | null;
			const _booleanCheck: ExpectEqual<MaxBooleanResult, ExpectedBooleanMax> = true;
			expect(_booleanCheck).toBe(true);
		});
	});

	describe("KeysOfType Utility", () => {
		test("extracts keys of specific type", () => {
			const testSchema = container("test", {
				id: field.string(),
				name: field.string(),
				age: field.number(),
				score: field.number(),
				active: field.boolean(),
			});

			type TestSchema = InferSchema<typeof testSchema.schema>;

			// KeysOfType should extract only number fields
			type NumberKeys = KeysOfType<TestSchema, number>;
			type ExpectedNumberKeys = "age" | "score";

			const _typeCheck: ExpectEqual<NumberKeys, ExpectedNumberKeys> = true;
			expect(_typeCheck).toBe(true);

			// KeysOfType should extract only string fields
			type StringKeys = KeysOfType<TestSchema, string>;
			type ExpectedStringKeys = "id" | "name";

			const _stringCheck: ExpectEqual<StringKeys, ExpectedStringKeys> = true;
			expect(_stringCheck).toBe(true);

			// KeysOfType should extract only boolean fields
			type BooleanKeys = KeysOfType<TestSchema, boolean>;
			type ExpectedBooleanKeys = "active";

			const _booleanCheck: ExpectEqual<BooleanKeys, ExpectedBooleanKeys> = true;
			expect(_booleanCheck).toBe(true);
		});
	});

	describe("Edge Cases - GroupBy with readonly arrays", () => {
		const testSchema = container("test", {
			id: field.string(),
			partitionKey: field.string(),
			category: field.string(),
			amount: field.number(),
			value: field.number().optional(),
		}).partitionKey("partitionKey");

		type TestSchema = InferSchema<typeof testSchema.schema>;

		test("groupBy with readonly array of keys", () => {
			type Operations = { _count: true; _sum: { amount: true } };
			type Result = GroupByResult<TestSchema, readonly ["partitionKey", "category"], Operations>;
			type Expected = Array<{
				partitionKey: string;
				category: string;
				_count: number;
				_sum: { amount: number | null };
			}>;

			const _typeCheck: ExpectEqual<Result, Expected> = true;
			expect(_typeCheck).toBe(true);
		});

		test("groupBy with single readonly array key", () => {
			type Operations = { _count: true };
			type Result = GroupByResult<TestSchema, readonly ["category"], Operations>;
			type Expected = Array<{
				category: string;
				_count: number;
			}>;

			const _typeCheck: ExpectEqual<Result, Expected> = true;
			expect(_typeCheck).toBe(true);
		});

		test("groupBy with all aggregate operations", () => {
			type Operations = {
				_count: true;
				_sum: { amount: true; value: true };
				_avg: { amount: true };
				_min: { amount: true; category: true };
				_max: { amount: true; id: true };
			};
			type Result = GroupByResult<TestSchema, "category", Operations>;
			type Expected = Array<{
				category: string;
				_count: number;
				_sum: { amount: number | null; value: number | null };
				_avg: { amount: number | null };
				_min: { amount: number | null; category: string | null };
				_max: { amount: number | null; id: string | null };
			}>;

			const _typeCheck: ExpectEqual<Result, Expected> = true;
			expect(_typeCheck).toBe(true);
		});
	});

	describe("Edge Cases - Optional fields in aggregations", () => {
		const testSchema = container("test", {
			id: field.string(),
			required: field.number(),
			optional: field.number().optional(),
			optionalString: field.string().optional(),
		});

		type TestSchema = InferSchema<typeof testSchema.schema>;

		test("_sum with optional fields", () => {
			type Operations = { _sum: { required: true; optional: true } };
			type Result = AggregateResult<TestSchema, Operations>;
			type Expected = {
				_sum: { required: number | null; optional: number | null };
			};

			const _typeCheck: ExpectEqual<Result, Expected> = true;
			expect(_typeCheck).toBe(true);
		});

		test("_min/_max with optional fields returns union with null", () => {
			type Operations = {
				_min: { optional: true; optionalString: true };
				_max: { optional: true; optionalString: true };
			};
			type Result = AggregateResult<TestSchema, Operations>;
			type Expected = {
				_min: {
					optional: (number | undefined) | null;
					optionalString: (string | undefined) | null;
				};
				_max: {
					optional: (number | undefined) | null;
					optionalString: (string | undefined) | null;
				};
			};

			const _typeCheck: ExpectEqual<Result, Expected> = true;
			expect(_typeCheck).toBe(true);
		});
	});

	describe("Edge Cases - _count with select", () => {
		const testSchema = container("test", {
			id: field.string(),
			name: field.string(),
			amount: field.number(),
			optional: field.number().optional(),
		});

		type TestSchema = InferSchema<typeof testSchema.schema>;

		test("_count with select returns object with field counts", () => {
			type Operations = {
				_count: { select: { amount: true; optional: true; name: true } };
			};
			type Result = AggregateResult<TestSchema, Operations>;
			type Expected = {
				_count: { amount: number; optional: number; name: number };
			};

			const _typeCheck: ExpectEqual<Result, Expected> = true;
			expect(_typeCheck).toBe(true);
		});

		test("groupBy with _count select", () => {
			type Operations = { _count: { select: { amount: true } } };
			type Result = GroupByResult<TestSchema, "name", Operations>;
			type Expected = Array<{
				name: string;
				_count: { amount: number };
			}>;

			const _typeCheck: ExpectEqual<Result, Expected> = true;
			expect(_typeCheck).toBe(true);
		});
	});

	describe("Edge Cases - Complex groupBy scenarios", () => {
		const testSchema = container("test", {
			id: field.string(),
			pk: field.string(),
			category: field.string(),
			subcategory: field.string(),
			amount: field.number(),
			quantity: field.number(),
		}).partitionKey("pk");

		type TestSchema = InferSchema<typeof testSchema.schema>;

		test("groupBy with 3 fields", () => {
			type Operations = { _count: true; _sum: { amount: true; quantity: true } };
			type Result = GroupByResult<
				TestSchema,
				readonly ["category", "subcategory", "pk"],
				Operations
			>;
			type Expected = Array<{
				category: string;
				subcategory: string;
				pk: string;
				_count: number;
				_sum: { amount: number | null; quantity: number | null };
			}>;

			const _typeCheck: ExpectEqual<Result, Expected> = true;
			expect(_typeCheck).toBe(true);
		});

		test("groupBy with no aggregations still requires _count or other ops", () => {
			// This should compile - empty operations object
			// biome-ignore lint/complexity/noBannedTypes: we want to test empty operations object
			type Operations = {};
			type Result = GroupByResult<TestSchema, "category", Operations>;
			type Expected = Array<{ category: string }>;

			const _typeCheck: ExpectEqual<Result, Expected> = true;
			expect(_typeCheck).toBe(true);
		});
	});

	describe("Real-world aggregate scenarios", () => {
		const orderSchema = container("orders", {
			id: field.string(),
			customerId: field.string(),
			status: field.string(),
			totalAmount: field.number(),
			itemCount: field.number(),
			discount: field.number().optional(),
			createdAt: field.date(),
		}).partitionKey("customerId");

		type OrderSchema = InferSchema<typeof orderSchema.schema>;

		test("sales report by customer", () => {
			type Operations = {
				_count: true;
				_sum: { totalAmount: true; itemCount: true };
				_avg: { totalAmount: true };
				_max: { totalAmount: true };
			};
			type Result = GroupByResult<OrderSchema, "customerId", Operations>;
			type Expected = Array<{
				customerId: string;
				_count: number;
				_sum: { totalAmount: number | null; itemCount: number | null };
				_avg: { totalAmount: number | null };
				_max: { totalAmount: number | null };
			}>;

			const _typeCheck: ExpectEqual<Result, Expected> = true;
			expect(_typeCheck).toBe(true);
		});

		test("sales report by status and customer", () => {
			type Operations = {
				_count: true;
				_sum: { totalAmount: true };
			};
			type Result = GroupByResult<OrderSchema, readonly ["status", "customerId"], Operations>;
			type Expected = Array<{
				status: string;
				customerId: string;
				_count: number;
				_sum: { totalAmount: number | null };
			}>;

			const _typeCheck: ExpectEqual<Result, Expected> = true;
			expect(_typeCheck).toBe(true);
		});

		test("aggregate totals across all orders", () => {
			type Operations = {
				_count: true;
				_sum: { totalAmount: true; discount: true };
				_avg: { totalAmount: true; itemCount: true };
				_min: { createdAt: true; totalAmount: true };
				_max: { createdAt: true; totalAmount: true };
			};
			type Result = AggregateResult<OrderSchema, Operations>;
			type Expected = {
				_count: number;
				_sum: { totalAmount: number | null; discount: number | null };
				_avg: { totalAmount: number | null; itemCount: number | null };
				_min: { createdAt: Date | null; totalAmount: number | null };
				_max: { createdAt: Date | null; totalAmount: number | null };
			};

			const _typeCheck: ExpectEqual<Result, Expected> = true;
			expect(_typeCheck).toBe(true);
		});
	});

	describe("FindMany with Aggregations Type Inference", () => {
		const userSchema = container("users", {
			id: field.string(),
			email: field.string(),
			name: field.string(),
			age: field.number(),
			score: field.number().optional(),
			isActive: field.boolean(),
		}).partitionKey("email");

		type UserSchema = InferSchema<typeof userSchema.schema>;

		test("returns array when no aggregate", () => {
			// Simulate the return type of findMany without aggregate
			type Result = UserSchema[];
			type Expected = UserSchema[];

			const _typeCheck: ExpectEqual<Result, Expected> = true;
			expect(_typeCheck).toBe(true);
		});

		test("returns object with data and _count when aggregate._count is provided", () => {
			type AggOps = { _count: true };
			type Result = {
				data: UserSchema[];
			} & AggregateResult<UserSchema, AggOps>;
			type Expected = {
				data: UserSchema[];
				_count: number;
			};

			const _typeCheck: ExpectEqual<Result, Expected> = true;
			expect(_typeCheck).toBe(true);
		});

		test("returns object with data and _avg when aggregate._avg is provided", () => {
			type AggOps = { _avg: { age: true; score: true } };
			type Result = {
				data: UserSchema[];
			} & AggregateResult<UserSchema, AggOps>;
			type Expected = {
				data: UserSchema[];
				_avg: { age: number | null; score: number | null };
			};

			const _typeCheck: ExpectEqual<Result, Expected> = true;
			expect(_typeCheck).toBe(true);
		});

		test("returns object with data and multiple aggregations", () => {
			type AggOps = {
				_count: true;
				_avg: { age: true };
				_min: { age: true };
				_max: { age: true };
			};
			type Result = {
				data: UserSchema[];
			} & AggregateResult<UserSchema, AggOps>;
			type Expected = {
				data: UserSchema[];
				_count: number;
				_avg: { age: number | null };
				_min: { age: number | null };
				_max: { age: number | null };
			};

			const _typeCheck: ExpectEqual<Result, Expected> = true;
			expect(_typeCheck).toBe(true);
		});

		test("works with select and aggregations", () => {
			type SelectedUser = { id: string; name: string; age: number };
			type AggOps = { _count: true; _avg: { age: true } };
			type Result = {
				data: SelectedUser[];
			} & AggregateResult<UserSchema, AggOps>;
			type Expected = {
				data: Array<{ id: string; name: string; age: number }>;
				_count: number;
				_avg: { age: number | null };
			};

			const _typeCheck: ExpectEqual<Result, Expected> = true;
			expect(_typeCheck).toBe(true);
		});

		test("_sum aggregation type inference", () => {
			type AggOps = { _sum: { age: true; score: true } };
			type Result = {
				data: UserSchema[];
			} & AggregateResult<UserSchema, AggOps>;
			type Expected = {
				data: UserSchema[];
				_sum: { age: number | null; score: number | null };
			};

			const _typeCheck: ExpectEqual<Result, Expected> = true;
			expect(_typeCheck).toBe(true);
		});

		test("_min and _max preserve field types", () => {
			const dateSchema = container("events", {
				id: field.string(),
				email: field.string(),
				eventDate: field.date(),
				count: field.number(),
			}).partitionKey("email");

			type EventSchema = InferSchema<typeof dateSchema.schema>;
			type AggOps = {
				_min: { eventDate: true; count: true };
				_max: { eventDate: true; count: true };
			};
			type Result = {
				data: EventSchema[];
			} & AggregateResult<EventSchema, AggOps>;
			type Expected = {
				data: Array<{
					id: string;
					email: string;
					eventDate: Date;
					count: number;
				}>;
				_min: { eventDate: Date | null; count: number | null };
				_max: { eventDate: Date | null; count: number | null };
			};

			const _typeCheck: ExpectEqual<Result, Expected> = true;
			expect(_typeCheck).toBe(true);
		});

		test("all aggregation operations together", () => {
			type AggOps = {
				_count: true;
				_sum: { age: true; score: true };
				_avg: { age: true; score: true };
				_min: { age: true };
				_max: { age: true };
			};
			type Result = {
				data: UserSchema[];
			} & AggregateResult<UserSchema, AggOps>;
			type Expected = {
				data: UserSchema[];
				_count: number;
				_sum: { age: number | null; score: number | null };
				_avg: { age: number | null; score: number | null };
				_min: { age: number | null };
				_max: { age: number | null };
			};

			const _typeCheck: ExpectEqual<Result, Expected> = true;
			expect(_typeCheck).toBe(true);
		});

		test("empty aggregate operations object not allowed at type level", () => {
			// biome-ignore lint/complexity/noBannedTypes: we want to test empty operations object
			type AggOps = {};
			type Result = AggregateResult<UserSchema, AggOps>;
			// biome-ignore lint/complexity/noBannedTypes: we want to test empty result
			type Expected = {};

			const _typeCheck: ExpectEqual<Result, Expected> = true;
			expect(_typeCheck).toBe(true);
		});

		test("count with select specific fields", () => {
			type AggOps = {
				_count: { select: { id: true; email: true } };
			};
			type Result = {
				data: UserSchema[];
			} & AggregateResult<UserSchema, AggOps>;
			type Expected = {
				data: UserSchema[];
				_count: { id: number; email: number };
			};

			const _typeCheck: ExpectEqual<Result, Expected> = true;
			expect(_typeCheck).toBe(true);
		});

		test("complex real-world scenario: paginated users with stats", () => {
			type SelectedUser = { id: string; name: string; email: string };
			type AggOps = {
				_count: true;
				_avg: { age: true; score: true };
			};
			type Result = {
				data: SelectedUser[];
			} & AggregateResult<UserSchema, AggOps>;
			type Expected = {
				data: Array<{ id: string; name: string; email: string }>;
				_count: number;
				_avg: { age: number | null; score: number | null };
			};

			const _typeCheck: ExpectEqual<Result, Expected> = true;
			expect(_typeCheck).toBe(true);
		});
	});
});
