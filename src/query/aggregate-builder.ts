import type { OrderByInput, WhereInput } from "../types";

export interface AggregateQuery {
	sql: string;
	parameters: Array<{ name: string; value: any }>;
}

export class AggregateQueryBuilder<T> {
	private paramCounter = 0;

	/**
	 * Build COUNT query
	 */
	buildCount(options: { where?: WhereInput<T> }): AggregateQuery {
		const parameters: Array<{ name: string; value: any }> = [];
		this.paramCounter = 0;

		const whereClause = this.buildWhereClause(options.where, parameters);

		// Use SELECT VALUE for single count result
		const sql = `SELECT VALUE COUNT(1) FROM c${whereClause}`;

		return { sql, parameters };
	}

	/**
	 * Build AGGREGATE query
	 */
	buildAggregate(options: {
		where?: WhereInput<T>;
		_count?: true | { select?: Partial<Record<keyof T, true>> };
		_sum?: Partial<Record<string, true>>;
		_avg?: Partial<Record<string, true>>;
		_min?: Partial<Record<string, true>>;
		_max?: Partial<Record<string, true>>;
	}): AggregateQuery {
		const parameters: Array<{ name: string; value: any }> = [];
		const selections: string[] = [];
		this.paramCounter = 0;

		// Build aggregation selections
		if (options._count) {
			if (options._count === true) {
				selections.push("COUNT(1) as _count");
			} else if (options._count.select) {
				// Count specific fields (count non-null values)
				for (const [field] of Object.entries(options._count.select)) {
					selections.push(`COUNT(c["${field}"]) as _count_${field}`);
				}
			}
		}

		if (options._sum) {
			for (const [field] of Object.entries(options._sum)) {
				selections.push(`SUM(c["${field}"]) as _sum_${field}`);
			}
		}

		if (options._avg) {
			for (const [field] of Object.entries(options._avg)) {
				selections.push(`AVG(c["${field}"]) as _avg_${field}`);
			}
		}

		if (options._min) {
			for (const [field] of Object.entries(options._min)) {
				selections.push(`MIN(c["${field}"]) as _min_${field}`);
			}
		}

		if (options._max) {
			for (const [field] of Object.entries(options._max)) {
				selections.push(`MAX(c["${field}"]) as _max_${field}`);
			}
		}

		if (selections.length === 0) {
			throw new Error(
				"At least one aggregation operation (_count, _sum, _avg, _min, _max) must be specified",
			);
		}

		// Build WHERE clause
		const whereClause = this.buildWhereClause(options.where, parameters);

		// Combine into SQL
		const sql = `SELECT ${selections.join(", ")} FROM c${whereClause}`;

		return { sql, parameters };
	}

	/**
	 * Build GROUP BY query
	 */
	buildGroupBy<By extends keyof T | readonly (keyof T)[]>(options: {
		by: By;
		where?: WhereInput<T>;
		_count?: true | { select?: Partial<Record<keyof T, true>> };
		_sum?: Partial<Record<string, true>>;
		_avg?: Partial<Record<string, true>>;
		_min?: Partial<Record<string, true>>;
		_max?: Partial<Record<string, true>>;
		orderBy?: OrderByInput<T> | Record<string, "asc" | "desc">;
		take?: number;
		skip?: number;
	}): AggregateQuery {
		const parameters: Array<{ name: string; value: any }> = [];
		const selections: string[] = [];
		this.paramCounter = 0;

		// Group by fields (use dot notation for GROUP BY)
		const byFields = Array.isArray(options.by) ? options.by : [options.by];
		for (const field of byFields) {
			const fieldStr = String(field);
			selections.push(`c["${fieldStr}"] as ${fieldStr}`);
		}

		// Aggregations
		if (options._count) {
			if (options._count === true) {
				selections.push("COUNT(1) as _count");
			} else if (options._count.select) {
				// Count specific fields (count non-null values)
				for (const [field] of Object.entries(options._count.select)) {
					selections.push(`COUNT(c["${field}"]) as _count_${field}`);
				}
			}
		}

		if (options._sum) {
			for (const [field] of Object.entries(options._sum)) {
				selections.push(`SUM(c["${field}"]) as _sum_${field}`);
			}
		}

		if (options._avg) {
			for (const [field] of Object.entries(options._avg)) {
				selections.push(`AVG(c["${field}"]) as _avg_${field}`);
			}
		}

		if (options._min) {
			for (const [field] of Object.entries(options._min)) {
				selections.push(`MIN(c["${field}"]) as _min_${field}`);
			}
		}

		if (options._max) {
			for (const [field] of Object.entries(options._max)) {
				selections.push(`MAX(c["${field}"]) as _max_${field}`);
			}
		}

		// WHERE clause
		const whereClause = this.buildWhereClause(options.where, parameters);

		// GROUP BY clause
		const groupByClause = ` GROUP BY ${byFields.map((f) => `c["${String(f)}"]`).join(", ")}`;

		// ORDER BY clause
		let orderByClause = "";
		if (options.orderBy) {
			orderByClause = this.buildOrderByClause(options.orderBy);
		}

		// OFFSET/LIMIT
		let paginationClause = "";
		if (options.skip !== undefined || options.take !== undefined) {
			if (options.skip !== undefined) {
				paginationClause += ` OFFSET ${options.skip}`;
			}
			if (options.take !== undefined) {
				paginationClause += ` LIMIT ${options.take}`;
			}
		}

		const sql = `SELECT ${selections.join(", ")} FROM c${whereClause}${groupByClause}${orderByClause}${paginationClause}`;

		return { sql, parameters };
	}

	/**
	 * Build WHERE clause from where input (duplicated from QueryBuilder pattern)
	 */
	private buildWhereClause(
		where: WhereInput<T> | undefined,
		parameters: Array<{ name: string; value: any }>,
	): string {
		if (!where || Object.keys(where).length === 0) {
			return "";
		}

		const conditions: string[] = [];

		for (const [key, value] of Object.entries(where)) {
			// Use bracket notation to avoid reserved word issues
			const fieldPath = `c["${key}"]`;

			if (value === null || value === undefined) {
				continue;
			}

			if (typeof value === "object" && !Array.isArray(value) && !(value instanceof Date)) {
				// Operator object
				for (const [op, val] of Object.entries(value)) {
					const paramName = `@param${this.paramCounter++}`;

					switch (op) {
						case "equals":
							conditions.push(`${fieldPath} = ${paramName}`);
							break;
						case "gt":
							conditions.push(`${fieldPath} > ${paramName}`);
							break;
						case "gte":
							conditions.push(`${fieldPath} >= ${paramName}`);
							break;
						case "lt":
							conditions.push(`${fieldPath} < ${paramName}`);
							break;
						case "lte":
							conditions.push(`${fieldPath} <= ${paramName}`);
							break;
						case "contains":
							conditions.push(`CONTAINS(${fieldPath}, ${paramName})`);
							break;
						case "startsWith":
							conditions.push(`STARTSWITH(${fieldPath}, ${paramName})`);
							break;
						case "endsWith":
							conditions.push(`ENDSWITH(${fieldPath}, ${paramName})`);
							break;
					}

					parameters.push({ name: paramName, value: val });
				}
			} else {
				// Direct value
				const paramName = `@param${this.paramCounter++}`;
				conditions.push(`${fieldPath} = ${paramName}`);
				parameters.push({ name: paramName, value });
			}
		}

		return conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : "";
	}

	/**
	 * Build ORDER BY clause
	 */
	private buildOrderByClause(orderBy: OrderByInput<T> | Record<string, "asc" | "desc">): string {
		const parts: string[] = [];

		for (const [key, direction] of Object.entries(orderBy)) {
			const dir = direction === "desc" ? "DESC" : "ASC";

			if (key.startsWith("_")) {
				// Aggregation field (e.g., _count, _sum_amount)
				parts.push(`${key} ${dir}`);
			} else {
				// Regular field
				parts.push(`c["${key}"] ${dir}`);
			}
		}

		return parts.length > 0 ? ` ORDER BY ${parts.join(", ")}` : "";
	}
}
