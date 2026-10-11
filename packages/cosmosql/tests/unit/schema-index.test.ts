import { ContainerSchema, container, field } from "../../src/schema";

describe("Schema Index Exports", () => {
	test("exports field builder", () => {
		expect(field).toBeDefined();
		expect(typeof field.string).toBe("function");
		expect(typeof field.number).toBe("function");
		expect(typeof field.boolean).toBe("function");
	});

	test("exports container function", () => {
		expect(container).toBeDefined();
		expect(typeof container).toBe("function");
	});

	test("exports ContainerSchema class", () => {
		expect(ContainerSchema).toBeDefined();
		const schema = container("test", {
			id: field.string(),
		});
		expect(schema).toBeInstanceOf(ContainerSchema);
	});

	test("exports work together", () => {
		const users = container("users", {
			id: field.string(),
			name: field.string(),
		});

		expect(users.name).toBe("users");
		expect(users.schema.id.type).toBe("string");
		expect(users.schema.name.type).toBe("string");
	});
});
