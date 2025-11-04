import type { BulkProgressStats } from "../types/bulk-operations";
import { MigrationTracker } from "./storage";
import type {
	MigrationApplyOptions,
	MigrationContext,
	MigrationDefinition,
	MigrationLogger,
	MigrationResult,
	ProgressTracker,
	RollbackOptions,
} from "./types";

/**
 * Migration runner executes migrations (up/down)
 */
export class MigrationRunner {
	constructor(
		private db: any, // CosmosClient
		private tracker: MigrationTracker,
	) {}

	/**
	 * Apply migrations
	 */
	async applyMigrations(
		migrations: MigrationDefinition[],
		options: Pick<MigrationApplyOptions, "dryRun" | "onProgress">,
	): Promise<MigrationResult> {
		const { dryRun = false, onProgress } = options;

		const result: MigrationResult = {
			success: true,
			applied: [],
			performance: {
				totalRuConsumed: 0,
				totalDurationMs: 0,
			},
		};

		for (const migration of migrations) {
			const startTime = Date.now();
			let ruConsumed = 0;

			try {
				// Report progress: validating
				if (onProgress) {
					onProgress({
						migration: {
							version: migration.version,
							name: migration.name,
						},
						status: "validating",
						percentage: 0,
						ruConsumed: 0,
						durationMs: 0,
					});
				}

				// Validate if validation function exists
				if (migration.validate) {
					const logger = this.createLogger(migration);
					const progressTracker = this.createProgressTracker((stats) => {
						ruConsumed += stats.ruConsumed;
					});

					const ctx: MigrationContext = {
						db: this.db,
						logger,
						progress: progressTracker,
						dryRun,
					};

					const validation = await migration.validate(ctx);
					if (!validation.valid) {
						throw new Error(`Migration validation failed: ${validation.message}`);
					}
				}

				// Report progress: running
				if (onProgress) {
					onProgress({
						migration: {
							version: migration.version,
							name: migration.name,
						},
						status: "running",
						percentage: 50,
						ruConsumed,
						durationMs: Date.now() - startTime,
					});
				}

				// Execute migration
				const logger = this.createLogger(migration);
				const progressTracker = this.createProgressTracker((stats) => {
					ruConsumed += stats.ruConsumed;

					// Forward progress to caller
					if (onProgress) {
						const progress = Math.min(50 + (stats.percentage / 2), 99);
						onProgress({
							migration: {
								version: migration.version,
								name: migration.name,
							},
							status: "running",
							percentage: progress,
							ruConsumed,
							durationMs: Date.now() - startTime,
						});
					}
				});

				const ctx: MigrationContext = {
					db: this.db,
					logger,
					progress: progressTracker,
					dryRun,
				};

				await migration.up(ctx);

				const durationMs = Date.now() - startTime;

				// Record migration (unless dry run)
				if (!dryRun) {
					await this.tracker.recordMigration(migration, ruConsumed, durationMs);
				}

				result.applied.push({
					version: migration.version,
					name: migration.name,
					ruConsumed,
					durationMs,
				});

				result.performance.totalRuConsumed += ruConsumed;
				result.performance.totalDurationMs += durationMs;

				// Report progress: complete
				if (onProgress) {
					onProgress({
						migration: {
							version: migration.version,
							name: migration.name,
						},
						status: "complete",
						percentage: 100,
						ruConsumed,
						durationMs,
					});
				}
			} catch (error) {
				result.success = false;
				result.failed = {
					version: migration.version,
					name: migration.name,
					error: error instanceof Error ? error.message : String(error),
				};

				// Report progress: failed
				if (onProgress) {
					onProgress({
						migration: {
							version: migration.version,
							name: migration.name,
						},
						status: "failed",
						percentage: 0,
						ruConsumed,
						durationMs: Date.now() - startTime,
					});
				}

				throw error;
			}
		}

		return result;
	}

	/**
	 * Rollback migrations
	 */
	async rollbackMigrations(
		migrations: MigrationDefinition[],
		options: Pick<RollbackOptions, "onProgress">,
	): Promise<MigrationResult> {
		const { onProgress } = options;

		const result: MigrationResult = {
			success: true,
			applied: [],
			performance: {
				totalRuConsumed: 0,
				totalDurationMs: 0,
			},
		};

		for (const migration of migrations) {
			const startTime = Date.now();
			let ruConsumed = 0;

			try {
				if (!migration.down) {
					throw new Error(`Migration ${migration.version} (${migration.name}) has no down() function`);
				}

				// Report progress: running
				if (onProgress) {
					onProgress({
						migration: {
							version: migration.version,
							name: migration.name,
						},
						status: "running",
						percentage: 0,
						ruConsumed: 0,
						durationMs: 0,
					});
				}

				// Execute rollback
				const logger = this.createLogger(migration);
				const progressTracker = this.createProgressTracker((stats) => {
					ruConsumed += stats.ruConsumed;

					// Forward progress to caller
					if (onProgress) {
						onProgress({
							migration: {
								version: migration.version,
								name: migration.name,
							},
							status: "running",
							percentage: stats.percentage,
							ruConsumed,
							durationMs: Date.now() - startTime,
						});
					}
				});

				const ctx: MigrationContext = {
					db: this.db,
					logger,
					progress: progressTracker,
					dryRun: false,
				};

				await migration.down(ctx);

				const durationMs = Date.now() - startTime;

				// Remove migration record
				await this.tracker.removeMigration(migration.version);

				result.applied.push({
					version: migration.version,
					name: migration.name,
					ruConsumed,
					durationMs,
				});

				result.performance.totalRuConsumed += ruConsumed;
				result.performance.totalDurationMs += durationMs;

				// Report progress: complete
				if (onProgress) {
					onProgress({
						migration: {
							version: migration.version,
							name: migration.name,
						},
						status: "complete",
						percentage: 100,
						ruConsumed,
						durationMs,
					});
				}
			} catch (error) {
				result.success = false;
				result.failed = {
					version: migration.version,
					name: migration.name,
					error: error instanceof Error ? error.message : String(error),
				};

				// Report progress: failed
				if (onProgress) {
					onProgress({
						migration: {
							version: migration.version,
							name: migration.name,
						},
						status: "failed",
						percentage: 0,
						ruConsumed,
						durationMs: Date.now() - startTime,
					});
				}

				throw error;
			}
		}

		return result;
	}

	/**
	 * Create a logger for migrations
	 */
	private createLogger(migration: MigrationDefinition): MigrationLogger {
		const prefix = `[Migration ${migration.version}: ${migration.name}]`;

		return {
			info: (message: string) => console.log(`${prefix} ${message}`),
			warn: (message: string) => console.warn(`${prefix} ⚠️  ${message}`),
			error: (message: string) => console.error(`${prefix} ❌ ${message}`),
			debug: (message: string) => {
				if (process.env.DEBUG) {
					console.log(`${prefix} 🔍 ${message}`);
				}
			},
		};
	}

	/**
	 * Create a progress tracker for bulk operations
	 */
	private createProgressTracker(onStats: (stats: BulkProgressStats) => void): ProgressTracker {
		return {
			track: (name: string) => {
				return (stats: BulkProgressStats) => {
					console.log(
						`  [${name}] ${stats.percentage}% - ${stats.processed}/${stats.total} documents (${stats.ruConsumed.toFixed(2)} RU)`,
					);
					onStats(stats);
				};
			},
		};
	}
}

