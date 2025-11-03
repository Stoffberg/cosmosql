import type { FieldConfig, FieldDef } from "../types";

export class FieldBuilder<
	TDef extends FieldDef<any, any, any, any, any> = FieldDef<any, any, any, any, any>,
> {
	readonly _def: TDef;

	constructor(
		private config: FieldConfig,
		def: TDef,
	) {
		this._def = def;
	}

	optional(): FieldBuilder<
		FieldDef<TDef["_type"], true, TDef["_default"], TDef["_array"], TDef["_objectSchema"]>
	> {
		return new FieldBuilder({ ...this.config, optional: true }, {
			_type: this._def._type,
			_optional: true as const,
			_default: this._def._default,
			_array: this._def._array,
			_objectSchema: this._def._objectSchema,
		} as FieldDef<TDef["_type"], true, TDef["_default"], TDef["_array"], TDef["_objectSchema"]>);
	}

	default<TValue>(
		value: TValue,
	): FieldBuilder<
		FieldDef<TDef["_type"], TDef["_optional"], TValue, TDef["_array"], TDef["_objectSchema"]>
	> {
		return new FieldBuilder({ ...this.config, default: value }, {
			_type: this._def._type,
			_optional: this._def._optional,
			_default: value,
			_array: this._def._array,
			_objectSchema: this._def._objectSchema,
		} as FieldDef<TDef["_type"], TDef["_optional"], TValue, TDef["_array"], TDef["_objectSchema"]>);
	}

	getConfig(): FieldConfig {
		return this.config;
	}
}

// Helper to extract FieldDef from a schema of FieldBuilders
type InferSchemaFromBuilders<S extends Record<string, FieldBuilder<any>>> = {
	[K in keyof S]: S[K] extends FieldBuilder<infer D extends FieldDef<any, any, any, any, any>>
		? D
		: never;
};

export const field = {
	string: () =>
		new FieldBuilder({ type: "string" as const }, {
			_type: "string" as const,
			_optional: false as const,
			_default: undefined,
			_array: undefined,
			_objectSchema: undefined,
		} as FieldDef<"string", false, undefined>),

	number: () =>
		new FieldBuilder({ type: "number" as const }, {
			_type: "number" as const,
			_optional: false as const,
			_default: undefined,
			_array: undefined,
			_objectSchema: undefined,
		} as FieldDef<"number", false, undefined>),

	boolean: () =>
		new FieldBuilder({ type: "boolean" as const }, {
			_type: "boolean" as const,
			_optional: false as const,
			_default: undefined,
			_array: undefined,
			_objectSchema: undefined,
		} as FieldDef<"boolean", false, undefined>),

	date: () =>
		new FieldBuilder({ type: "date" as const }, {
			_type: "date" as const,
			_optional: false as const,
			_default: undefined,
			_array: undefined,
			_objectSchema: undefined,
		} as FieldDef<"date", false, undefined>),

	array: <TItemDef extends FieldDef<any, any, any, any, any>>(itemType: FieldBuilder<TItemDef>) => {
		const itemConfig = itemType.getConfig();
		return new FieldBuilder(
			{
				type: "array" as const,
				array: itemConfig,
			},
			{
				_type: "array" as const,
				_optional: false as const,
				_default: undefined,
				_array: itemType._def,
				_objectSchema: undefined,
			} as FieldDef<"array", false, undefined, TItemDef>,
		);
	},

	object: <S extends Record<string, FieldBuilder<any>>>(schema: S) => {
		const objectSchema: Record<string, FieldConfig> = {};
		for (const [key, builder] of Object.entries(schema)) {
			objectSchema[key] = builder.getConfig();
		}
		// Build the object schema FieldDef map at type level
		type ObjectSchemaDef = InferSchemaFromBuilders<S>;
		// Create FieldDef with proper type assertion - the _objectSchema is type-only
		const def = {
			_type: "object" as const,
			_optional: false as const,
			_default: undefined,
			_array: undefined,
			_objectSchema: undefined as unknown as ObjectSchemaDef,
		} as FieldDef<"object", false, undefined, undefined, ObjectSchemaDef>;
		return new FieldBuilder(
			{
				type: "object" as const,
				objectSchema,
			},
			def,
		);
	},
};
