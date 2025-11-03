// Re-export from sub-modules
export type {
	CreateInput,
	InferFieldType,
	InferSchema,
	InferSchemaType,
	OptionalKeys,
	RequiredKeys,
	UpdateInput,
} from "./inference";
export type {
	OrderByInput,
	SelectInput,
	SelectResult,
	WhereInput,
} from "./operators";

// Base field types
export type FieldType = "string" | "number" | "boolean" | "date" | "array" | "object";

// Type-level field definition that preserves literal types
export type FieldDef<
	TType extends FieldType,
	TOptional extends boolean = false,
	TDefault = undefined,
	TArray extends FieldDef<any, any, any> | undefined = undefined,
	TObjectSchema extends Record<string, FieldDef<any, any, any>> | undefined = undefined,
> = {
	readonly _type: TType;
	readonly _optional: TOptional;
	readonly _default: TDefault;
	readonly _array: TArray;
	readonly _objectSchema: TObjectSchema;
};

// Runtime field configuration (unchanged for backward compatibility)
export type FieldConfig<T = any> = {
	type: FieldType;
	optional?: boolean;
	default?: T;
	array?: FieldConfig;
	objectSchema?: Record<string, FieldConfig>;
} & (
	| { type: "string" }
	| { type: "number" }
	| { type: "boolean" }
	| { type: "date" }
	| { type: "array"; array: FieldConfig }
	| { type: "object"; objectSchema: Record<string, FieldConfig> }
);

// Custom type errors
export type ErrorMessage<T extends string> = {
	readonly __error: T;
	readonly __brand: "CosmosQLError";
};

export type PartitionKeyMissingError =
	ErrorMessage<"PARTITION_KEY_REQUIRED: This query requires the partition key to avoid expensive cross-partition scans. Fix: Add the partition key to your where clause.">;

export type RequiredFieldMissingError<T extends string> =
	ErrorMessage<`REQUIRED_FIELD_MISSING: ${T}`>;
