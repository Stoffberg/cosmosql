import type { FieldConfig, InferSchema } from '../types';

export class ContainerSchema<
  TName extends string,
  TSchema extends Record<string, FieldConfig>,
  TPartitionKey extends keyof InferSchema<TSchema> = never
> {
  constructor(
    public readonly name: TName,
    public readonly schema: TSchema,
    public readonly partitionKeyField?: TPartitionKey
  ) {}

  partitionKey<K extends keyof InferSchema<TSchema>>(
    key: K
  ): ContainerSchema<TName, TSchema, K> {
    return new ContainerSchema(this.name, this.schema, key);
  }

  get infer(): InferSchema<TSchema> {
    return null as any; // Type-only, never called at runtime
  }
}

export function container<
  TName extends string,
  TSchema extends Record<string, any>
>(
  name: TName,
  schema: TSchema
): ContainerSchema<
  TName,
  { [K in keyof TSchema]: ReturnType<TSchema[K]['getConfig']> }
> {
  const configs: Record<string, FieldConfig> = {};
  for (const [key, builder] of Object.entries(schema)) {
    configs[key] = builder.getConfig();
  }
  return new ContainerSchema(name, configs as any);
}

