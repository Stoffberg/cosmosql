import type { AggregateOperations, AggregateResult, GroupByOptions, GroupByResult } from "../types";

export class AggregateResultParser {
	/**
	 * Parse aggregate result into typed object
	 */
	parseAggregateResult<T, Ops extends AggregateOperations<T>>(
		rawResult: any,
		options: Ops,
	): AggregateResult<T, Ops> {
		const result: any = {};

		// Parse count
		if (options._count) {
			if (options._count === true) {
				result._count = rawResult._count ?? 0;
			} else if (options._count.select) {
				result._count = {};
				for (const field of Object.keys(options._count.select)) {
					result._count[field] = rawResult[`_count_${field}`] ?? 0;
				}
			}
		}

		// Parse sum
		if (options._sum) {
			result._sum = {};
			for (const field of Object.keys(options._sum)) {
				result._sum[field] = rawResult[`_sum_${field}`] ?? null;
			}
		}

		// Parse avg
		if (options._avg) {
			result._avg = {};
			for (const field of Object.keys(options._avg)) {
				result._avg[field] = rawResult[`_avg_${field}`] ?? null;
			}
		}

		// Parse min
		if (options._min) {
			result._min = {};
			for (const field of Object.keys(options._min)) {
				result._min[field] = rawResult[`_min_${field}`] ?? null;
			}
		}

		// Parse max
		if (options._max) {
			result._max = {};
			for (const field of Object.keys(options._max)) {
				result._max[field] = rawResult[`_max_${field}`] ?? null;
			}
		}

		return result as AggregateResult<T, Ops>;
	}

	/**
	 * Parse group by results
	 */
	parseGroupByResults<
		T,
		By extends keyof T | readonly (keyof T)[],
		Ops extends AggregateOperations<T>,
	>(rawResults: any[], options: GroupByOptions<T, By> & Ops): GroupByResult<T, By, Ops> {
		return rawResults.map((raw) => {
			const result: any = {};

			// Copy grouped fields
			const byFields = Array.isArray(options.by) ? options.by : [options.by];
			for (const field of byFields) {
				const fieldStr = String(field);
				result[field] = raw[fieldStr] ?? null;
			}

			// Parse aggregations
			if (options._count) {
				result._count = raw._count ?? 0;
			}

			if (options._sum) {
				result._sum = {};
				for (const field of Object.keys(options._sum)) {
					result._sum[field] = raw[`_sum_${field}`] ?? null;
				}
			}

			if (options._avg) {
				result._avg = {};
				for (const field of Object.keys(options._avg)) {
					result._avg[field] = raw[`_avg_${field}`] ?? null;
				}
			}

			if (options._min) {
				result._min = {};
				for (const field of Object.keys(options._min)) {
					result._min[field] = raw[`_min_${field}`] ?? null;
				}
			}

			if (options._max) {
				result._max = {};
				for (const field of Object.keys(options._max)) {
					result._max[field] = raw[`_max_${field}`] ?? null;
				}
			}

			return result;
		}) as GroupByResult<T, By, Ops>;
	}
}
