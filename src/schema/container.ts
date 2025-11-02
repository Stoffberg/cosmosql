import type { FieldConfig, InferSchema } from "../types";
import type { FieldBuilder } from "./field";

// Helper type to extract FieldConfig from FieldBuilder for runtime access
type ExtractFieldConfig<
	TSchema extends Record<string, FieldBuilder<any> | FieldConfig>,
> = {
	[K in keyof TSchema]: TSchema[K] extends FieldBuilder<any>
		? FieldConfig
		: TSchema[K] extends FieldConfig
			? TSchema[K]
			: never;
};

export class ContainerSchema<
	TName extends string,
	TSchema extends Record<string, FieldConfig | FieldBuilder<any>>,
	TPartitionKey extends keyof InferSchema<TSchema> = never,
> {
	constructor(
		public readonly name: TName,
		// Runtime schema is FieldConfig, but type parameter preserves FieldBuilder for inference
		public readonly schema: ExtractFieldConfig<TSchema> & TSchema,
		public readonly partitionKeyField?: TPartitionKey,
	) {}

	partitionKey<K extends keyof InferSchema<TSchema>>(
		key: K,
	): ContainerSchema<TName, TSchema, K> {
		return new ContainerSchema(this.name, this.schema, key);
	}

	get infer(): InferSchema<TSchema> {
		return null as any; // Type-only, never called at runtime
	}
}

export function container<
	TName extends string,
	TSchema extends Record<string, FieldBuilder<any>>,
>(name: TName, schema: TSchema): ContainerSchema<TName, TSchema> {
	// At runtime, convert FieldBuilders to FieldConfigs
	const configs: Record<string, FieldConfig> = {};
	for (const [key, builder] of Object.entries(schema)) {
		configs[key] = builder.getConfig();
	}
	// Intersection type allows both FieldConfig property access and FieldBuilder type inference
	return new ContainerSchema(
		name,
		configs as ExtractFieldConfig<TSchema> & TSchema,
	);
}
