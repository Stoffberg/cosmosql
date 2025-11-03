import type { OrderByInput, WhereInput } from "./operators";

// Utility type to extract keys where value type matches (including optional)
export type KeysOfType<T, U> = {
	[K in keyof T]: T[K] extends U ? K : T[K] extends U | undefined ? K : never;
}[keyof T];

// Aggregate operations type
export type AggregateOperations<T> = {
	_count?: true | { select?: Partial<Record<keyof T, true>> };
	_sum?: Partial<Record<KeysOfType<T, number>, true>>;
	_avg?: Partial<Record<KeysOfType<T, number>, true>>;
	_min?: Partial<Record<keyof T, true>>;
	_max?: Partial<Record<keyof T, true>>;
};

// Result type for aggregate operations
export type AggregateResult<T, Ops extends AggregateOperations<T>> = {
	[K in keyof Ops]: K extends "_count"
		? Ops[K] extends true
			? number
			: Ops[K] extends { select: infer S }
				? { [P in keyof S]: number }
				: never
		: K extends "_sum" | "_avg" | "_min" | "_max"
			? Ops[K] extends Record<string, true>
				? {
						[P in keyof Ops[K]]: K extends "_min" | "_max"
							? P extends keyof T
								? T[P] | null
								: never
							: number | null;
					}
				: never
			: never;
};

// Count options
export interface CountOptions<T> {
	partitionKey?: string | string[];
	enableCrossPartitionQuery?: boolean;
	where?: WhereInput<T>;
}

// Extract aggregate operations from an options object
export type ExtractAggregateOps<_T, Opts> = Pick<
	Opts,
	Extract<keyof Opts, "_count" | "_sum" | "_avg" | "_min" | "_max">
>;

// Aggregate options with operations inline
export type AggregateOptions<T> = {
	partitionKey?: string | string[];
	enableCrossPartitionQuery?: boolean;
	where?: WhereInput<T>;
	_count?: true | { select?: Partial<Record<keyof T, true>> };
	_sum?: Partial<Record<KeysOfType<T, number>, true>>;
	_avg?: Partial<Record<KeysOfType<T, number>, true>>;
	_min?: Partial<Record<keyof T, true>>;
	_max?: Partial<Record<keyof T, true>>;
};

// Group by options with operations inline
export type GroupByOptions<T, By extends keyof T | readonly (keyof T)[]> = {
	by: By;
	partitionKey?: string | string[];
	enableCrossPartitionQuery?: boolean;
	where?: WhereInput<T>;
	_count?: true | { select?: Partial<Record<keyof T, true>> };
	_sum?: Partial<Record<KeysOfType<T, number>, true>>;
	_avg?: Partial<Record<KeysOfType<T, number>, true>>;
	_min?: Partial<Record<keyof T, true>>;
	_max?: Partial<Record<keyof T, true>>;
	having?: Record<string, any>; // Deferred implementation
	orderBy?: OrderByInput<T> | Record<string, "asc" | "desc">; // Support aggregation fields
	take?: number;
	skip?: number;
};

// Helper type to convert readonly array to union
type TupleToUnion<T> = T extends readonly (infer U)[] ? U : never;

// Group by result type - using more explicit conditional
export type GroupByResult<
	T,
	By extends keyof T | readonly (keyof T)[],
	Ops extends AggregateOperations<T>,
> = By extends readonly any[]
	? TupleToUnion<By> extends keyof T
		? Array<Pick<T, TupleToUnion<By> & keyof T> & AggregateResult<T, Ops>>
		: never
	: By extends keyof T
		? Array<Pick<T, By> & AggregateResult<T, Ops>>
		: never;
