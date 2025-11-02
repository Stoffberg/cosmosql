import type { FieldConfig, FieldDef } from "./index";

// Extract TypeScript type from FieldDef based on field type
type InferFieldTypeFromDef<TDef extends FieldDef<any, any, any, any, any>> =
	TDef["_type"] extends "string"
		? string
		: TDef["_type"] extends "number"
			? number
			: TDef["_type"] extends "boolean"
				? boolean
				: TDef["_type"] extends "date"
					? Date
					: TDef["_type"] extends "array"
						? TDef["_array"] extends FieldDef<any, any, any, any, any>
							? Array<InferFieldTypeFromDef<TDef["_array"]>>
							: never
						: TDef["_type"] extends "object"
							? TDef["_objectSchema"] extends Record<
									string,
									FieldDef<any, any, any, any, any>
								>
								? {
										[K in keyof TDef["_objectSchema"]]: InferSchemaTypeFromDef<
											TDef["_objectSchema"][K]
										>;
									}
								: never
							: never;

// Handle optional and default fields from FieldDef
type InferSchemaTypeFromDef<TDef extends FieldDef<any, any, any, any, any>> =
	TDef["_optional"] extends true
		? InferFieldTypeFromDef<TDef> | undefined
		: TDef["_default"] extends undefined
			? InferFieldTypeFromDef<TDef>
			: InferFieldTypeFromDef<TDef> | undefined;

// Infer TypeScript type from field config (backward compatibility - tries FieldDef first, falls back to FieldConfig)
export type InferFieldType<T extends FieldConfig> = T extends {
	readonly _def: infer D extends FieldDef<any, any, any, any, any>;
}
	? InferFieldTypeFromDef<D>
	: T["type"] extends "string"
		? string
		: T["type"] extends "number"
			? number
			: T["type"] extends "boolean"
				? boolean
				: T["type"] extends "date"
					? Date
					: T["type"] extends "array"
						? T["array"] extends FieldConfig
							? Array<InferFieldType<T["array"]>>
							: never
						: T["type"] extends "object"
							? T["objectSchema"] extends Record<string, FieldConfig>
								? {
										[K in keyof T["objectSchema"]]: InferSchemaType<
											T["objectSchema"][K]
										>;
									}
								: never
							: never;

// Handle optional and default fields
export type InferSchemaType<T extends FieldConfig> = T extends {
	readonly _def: infer D extends FieldDef<any, any, any, any, any>;
}
	? InferSchemaTypeFromDef<D>
	: T["optional"] extends true
		? InferFieldType<T> | undefined
		: T["default"] extends undefined
			? InferFieldType<T>
			: InferFieldType<T> | undefined;

// Infer full schema type from builders
export type InferSchema<
	S extends Record<
		string,
		FieldConfig | { readonly _def: FieldDef<any, any, any, any, any> }
	>,
> = {
	[K in keyof S]: S[K] extends {
		readonly _def: infer D extends FieldDef<any, any, any, any, any>;
	}
		? InferSchemaTypeFromDef<D>
		: S[K] extends FieldConfig
			? InferSchemaType<S[K]>
			: never;
};

// Required vs optional fields
export type RequiredKeys<
	S extends Record<
		string,
		FieldConfig | { readonly _def: FieldDef<any, any, any, any, any> }
	>,
> = {
	[K in keyof S]: S[K] extends {
		readonly _def: infer D extends FieldDef<any, any, any, any, any>;
	}
		? D["_optional"] extends true
			? never
			: D["_default"] extends undefined
				? K
				: never
		: S[K] extends FieldConfig
			? S[K]["optional"] extends true
				? never
				: S[K]["default"] extends undefined
					? K
					: never
			: never;
}[keyof S];

export type OptionalKeys<
	S extends Record<
		string,
		FieldConfig | { readonly _def: FieldDef<any, any, any, any, any> }
	>,
> = {
	[K in keyof S]: S[K] extends {
		readonly _def: infer D extends FieldDef<any, any, any, any, any>;
	}
		? D["_optional"] extends true
			? K
			: D["_default"] extends undefined
				? never
				: K
		: S[K] extends FieldConfig
			? S[K]["optional"] extends true
				? K
				: S[K]["default"] extends undefined
					? never
					: K
			: never;
}[keyof S];

// Create/Update input types
export type CreateInput<
	S extends Record<
		string,
		FieldConfig | { readonly _def: FieldDef<any, any, any, any, any> }
	>,
> = {
	[K in RequiredKeys<S>]: InferSchema<S>[K];
} & {
	[K in OptionalKeys<S>]?: InferSchema<S>[K];
};

export type UpdateInput<
	S extends Record<
		string,
		FieldConfig | { readonly _def: FieldDef<any, any, any, any, any> }
	>,
> = Partial<InferSchema<S>>;
