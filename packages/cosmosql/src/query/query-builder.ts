import type { OrderByInput, WhereInput } from "../types";

export class QueryBuilder<T> {
	private selectFields: string[] = [];
	private whereConditions: string[] = [];
	private parameters: Array<{ name: string; value: any }> = [];
	private orderByFields: Array<{ field: string; direction: "ASC" | "DESC" }> = [];
	private limitValue?: number;
	private offsetValue?: number;
	private paramCounter = 0;

	select(fields: string[]): this {
		this.selectFields = fields;
		return this;
	}

	where(conditions: WhereInput<T>): this {
		this.buildWhereClause(conditions, "c");
		return this;
	}

	private buildWhereClause(obj: any, prefix: string): void {
		for (const [key, value] of Object.entries(obj)) {
			// Use bracket notation to avoid reserved word issues
			const fieldPath = `${prefix}["${key}"]`;

			if (value === null || value === undefined) {
				continue;
			}

			if (typeof value === "object" && !Array.isArray(value) && !(value instanceof Date)) {
				// Operator object
				for (const [op, val] of Object.entries(value)) {
					const paramName = `@param${this.paramCounter++}`;

					switch (op) {
						case "equals":
							this.whereConditions.push(`${fieldPath} = ${paramName}`);
							break;
						case "gt":
							this.whereConditions.push(`${fieldPath} > ${paramName}`);
							break;
						case "gte":
							this.whereConditions.push(`${fieldPath} >= ${paramName}`);
							break;
						case "lt":
							this.whereConditions.push(`${fieldPath} < ${paramName}`);
							break;
						case "lte":
							this.whereConditions.push(`${fieldPath} <= ${paramName}`);
							break;
						case "contains":
							this.whereConditions.push(`CONTAINS(${fieldPath}, ${paramName})`);
							break;
						case "startsWith":
							this.whereConditions.push(`STARTSWITH(${fieldPath}, ${paramName})`);
							break;
						case "endsWith":
							this.whereConditions.push(`ENDSWITH(${fieldPath}, ${paramName})`);
							break;
					}

					this.parameters.push({ name: paramName, value: val });
				}
			} else {
				// Direct value
				const paramName = `@param${this.paramCounter++}`;
				this.whereConditions.push(`${fieldPath} = ${paramName}`);
				this.parameters.push({ name: paramName, value });
			}
		}
	}

	orderBy(fields: OrderByInput<T>): this {
		for (const [field, direction] of Object.entries(fields)) {
			this.orderByFields.push({
				field: field as string,
				direction: direction === "desc" ? "DESC" : "ASC",
			});
		}
		return this;
	}

	take(limit: number): this {
		this.limitValue = limit;
		return this;
	}

	skip(offset: number): this {
		this.offsetValue = offset;
		return this;
	}

	build(): { query: string; parameters: Array<{ name: string; value: any }> } {
		let query = "SELECT ";

		// Add TOP if we have a limit but no offset
		if (this.limitValue !== undefined && this.offsetValue === undefined) {
			query += `TOP ${this.limitValue} `;
		}

		if (this.selectFields.length > 0) {
			query += this.selectFields.map((f) => `c["${f}"]`).join(", ");
		} else {
			query += "*";
		}

		query += " FROM c";

		if (this.whereConditions.length > 0) {
			query += ` WHERE ${this.whereConditions.join(" AND ")}`;
		}

		if (this.orderByFields.length > 0) {
			query += ` ORDER BY ${this.orderByFields.map((f) => `c["${f.field}"] ${f.direction}`).join(", ")}`;
		}

		// Use OFFSET/LIMIT together when both are present
		if (this.offsetValue !== undefined) {
			query += ` OFFSET ${this.offsetValue}`;
			if (this.limitValue !== undefined) {
				query += ` LIMIT ${this.limitValue}`;
			}
		}

		return {
			query,
			parameters: this.parameters,
		};
	}
}
