import type { CosmosClient } from "../client/cosmos-client";
import { QueryBuilder } from "../query/query-builder";
import type { ContainerSchema } from "../schema/container";
import type {
	InferSchema,
	OrderByInput,
	PartitionKeyMissingError,
	SelectInput,
	SelectResult,
	WhereInput,
} from "../types";

export interface FindUniqueArgs<
	T,
	PK extends keyof T,
	S extends SelectInput<T>,
> {
	where: { [K in PK]: T[K] } & Partial<T>;
	select?: S;
}

export interface FindManyArgs<
	T,
	S extends SelectInput<T>,
	PK extends keyof T = never,
> {
	where?: WhereInput<T>;
	select?: S;
	orderBy?: OrderByInput<T>;
	take?: number;
	skip?: number;
	partitionKey?: PK extends never ? never : T[PK];
	enableCrossPartitionQuery?: boolean;
}

export class FindOperations<
	TSchema extends Record<string, any>,
	TPartitionKey extends keyof InferSchema<TSchema>,
> {
	constructor(
		private client: CosmosClient,
		private schema: ContainerSchema<any, TSchema, TPartitionKey>,
	) {}

	async findUnique<S extends SelectInput<InferSchema<TSchema>>>(
		args: TPartitionKey extends never
			? PartitionKeyMissingError
			: FindUniqueArgs<InferSchema<TSchema>, TPartitionKey, S>,
	): Promise<
		S extends undefined
			? InferSchema<TSchema> | null
			: SelectResult<InferSchema<TSchema>, S> | null
	> {
		const { where, select } = args as any;

		if (!this.schema.partitionKeyField) {
			throw new Error("Container must have a partition key defined");
		}

		const partitionKeyValue = where[this.schema.partitionKeyField];
		const id = where.id;

		if (!id || !partitionKeyValue) {
			throw new Error("Both id and partition key are required for findUnique");
		}

		const path = `/dbs/${this.client.getDatabase()}/colls/${this.schema.name}/docs/${id}`;

		try {
			const result = await this.client.request(
				"GET",
				path,
				undefined,
				partitionKeyValue,
			);

			if (select) {
				return this.applySelect(result, select) as any;
			}

			return result as any;
		} catch (error: any) {
			if (error.statusCode === 404) {
				return null as any;
			}
			throw error;
		}
	}

	async findMany<S extends SelectInput<InferSchema<TSchema>>>(
		args: FindManyArgs<InferSchema<TSchema>, S, TPartitionKey> = {},
	) {
		const {
			where,
			select,
			orderBy,
			take,
			skip,
			partitionKey,
			enableCrossPartitionQuery,
		} = args;

		if (!partitionKey && !enableCrossPartitionQuery) {
			throw new Error(
				"Either partitionKey or enableCrossPartitionQuery must be provided",
			);
		}

		const builder = new QueryBuilder<InferSchema<TSchema>>();

		if (select) {
			const fields = Object.keys(select);
			builder.select(fields);
		}

		if (where) {
			builder.where(where);
		}

		if (orderBy) {
			builder.orderBy(orderBy);
		}

		if (take) {
			builder.take(take);
		}

		if (skip) {
			builder.skip(skip);
		}

		const { query, parameters } = builder.build();
		const path = `/dbs/${this.client.getDatabase()}/colls/${this.schema.name}/docs`;

		const result = await this.client.request(
			"POST",
			path,
			{
				query,
				parameters,
			},
			partitionKey,
		);

		return result.Documents || [];
	}

	async query<TResult = InferSchema<TSchema>>(args: {
		sql: string;
		parameters?: Array<{ name: string; value: unknown }>;
		partitionKey?: InferSchema<TSchema>[TPartitionKey];
	}): Promise<TResult[]> {
		const { sql, parameters = [], partitionKey } = args;

		const path = `/dbs/${this.client.getDatabase()}/colls/${this.schema.name}/docs`;

		const result = await this.client.request(
			"POST",
			path,
			{ query: sql, parameters },
			partitionKey,
		);

		return result.Documents || [];
	}

	private applySelect<T, S extends SelectInput<T>>(
		data: T,
		select: S,
	): SelectResult<T, S> {
		const result: any = {};

		for (const [key, value] of Object.entries(select)) {
			if (value === true) {
				result[key] = (data as any)[key];
			} else if (typeof value === "object" && value !== null) {
				result[key] = this.applySelect((data as any)[key], value);
			}
		}

		return result as SelectResult<T, S>;
	}
}
