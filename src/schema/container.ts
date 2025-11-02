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

export interface IndexingPolicy {
	automatic?: boolean;
	includedPaths?: Array<{ path: string }>;
	excludedPaths?: Array<{ path: string }>;
	compositeIndexes?: Array<
		Array<{ path: string; order?: "ascending" | "descending" }>
	>;
	spatialIndexes?: Array<{ path: string; types: string[] }>;
}

export interface ContainerConfig {
	throughput?: number;
	indexing?: IndexingPolicy;
}

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
		public readonly config?: ContainerConfig,
	) {}

	partitionKey<K extends keyof InferSchema<TSchema>>(
		key: K,
	): ContainerSchema<TName, TSchema, K> {
		return new ContainerSchema(this.name, this.schema, key, this.config);
	}

	throughput(ru: number): ContainerSchema<TName, TSchema, TPartitionKey> {
		return new ContainerSchema(this.name, this.schema, this.partitionKeyField, {
			...this.config,
			throughput: ru,
		});
	}

	indexing(
		policy: IndexingPolicy,
	): ContainerSchema<TName, TSchema, TPartitionKey> {
		return new ContainerSchema(this.name, this.schema, this.partitionKeyField, {
			...this.config,
			indexing: policy,
		});
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
