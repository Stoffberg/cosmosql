// Re-export from sub-modules
export type { InferSchema, InferSchemaType, InferFieldType, CreateInput, UpdateInput } from './inference';
export type { WhereInput, SelectInput, OrderByInput, SelectResult } from './operators';

// Base field types
export type FieldType = 
  | 'string' 
  | 'number' 
  | 'boolean' 
  | 'date' 
  | 'array' 
  | 'object';

export interface FieldConfig<T = any> {
  type: FieldType;
  optional?: boolean;
  default?: T;
  array?: FieldConfig;
  objectSchema?: Record<string, FieldConfig>;
}

// Custom type errors
export type ErrorMessage<T extends string> = {
  readonly __error: T;
  readonly __brand: 'CosmosQLError';
};

export type PartitionKeyMissingError = ErrorMessage<
  'PARTITION_KEY_REQUIRED: This query requires the partition key to avoid expensive cross-partition scans. Fix: Add the partition key to your where clause.'
>;

export type RequiredFieldMissingError<T extends string> = ErrorMessage<
  `REQUIRED_FIELD_MISSING: ${T}`
>;

