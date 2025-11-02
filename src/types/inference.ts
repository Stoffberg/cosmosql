import type { FieldConfig } from './index';

// Infer TypeScript type from field config
export type InferFieldType<T extends FieldConfig> = 
  T['type'] extends 'string' ? string :
  T['type'] extends 'number' ? number :
  T['type'] extends 'boolean' ? boolean :
  T['type'] extends 'date' ? Date :
  T['type'] extends 'array' 
    ? T['array'] extends FieldConfig 
      ? Array<InferFieldType<T['array']>>
      : never
    : T['type'] extends 'object'
      ? T['objectSchema'] extends Record<string, FieldConfig>
        ? { [K in keyof T['objectSchema']]: InferSchemaType<T['objectSchema'][K]> }
        : never
      : never;

// Handle optional and default fields
export type InferSchemaType<T extends FieldConfig> = 
  T['optional'] extends true 
    ? InferFieldType<T> | undefined
    : T['default'] extends infer D
      ? D extends undefined 
        ? InferFieldType<T>
        : InferFieldType<T>
      : InferFieldType<T>;

// Infer full schema type
export type InferSchema<S extends Record<string, FieldConfig>> = {
  [K in keyof S]: InferSchemaType<S[K]>
};

// Required vs optional fields
export type RequiredKeys<S extends Record<string, FieldConfig>> = {
  [K in keyof S]: S[K]['optional'] extends true 
    ? never 
    : S[K]['default'] extends undefined
      ? K
      : never
}[keyof S];

export type OptionalKeys<S extends Record<string, FieldConfig>> = {
  [K in keyof S]: S[K]['optional'] extends true 
    ? K
    : S[K]['default'] extends undefined
      ? never
      : K
}[keyof S];

// Create/Update input types
export type CreateInput<S extends Record<string, FieldConfig>> = 
  { [K in RequiredKeys<S>]: InferSchemaType<S[K]> } &
  { [K in OptionalKeys<S>]?: InferSchemaType<S[K]> };

export type UpdateInput<S extends Record<string, FieldConfig>> = 
  Partial<InferSchema<S>>;

