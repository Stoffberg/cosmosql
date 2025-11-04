import { MigrationPlanner } from "./planner";
import { MigrationRunner } from "./runner";
import { MigrationTracker } from "./storage";
import type {
	MigrationApplyOptions,
	MigrationDefinition,
	MigrationPlan,
	MigrationResult,
	MigrationStatus,
	RollbackOptions,
} from "./types";

/**
 * Migration client - main API for managing migrations
 */
export class MigrationClient {
	private tracker: MigrationTracker;
	private runner: MigrationRunner;
	private planner: MigrationPlanner;
	private migrations: Map<number, MigrationDefinition>;

	constructor(
		db: any, // CosmosClient
		migrations: MigrationDefinition[],
	) {
		// Validate migrations are sequential
		this.migrations = new Map();
		const sorted = [...migrations].sort((a, b) => a.version - b.version);

		for (let i = 0; i < sorted.length; i++) {
			const migration = sorted[i];
			const expectedVersion = i + 1;

			if (migration.version !== expectedVersion) {
				throw new Error(
					`Migrations must be sequential. Expected version ${expectedVersion}, got ${migration.version}`,
				);
			}

			this.migrations.set(migration.version, migration);
		}

		this.tracker = new MigrationTracker(db);
		this.runner = new MigrationRunner(db, this.tracker);
		this.planner = new MigrationPlanner();
	}

	/**
	 * Get current migration status
	 * 
	 * @example
	 * const status = await db.migrations.status();
	 * console.log(`Current version: ${status.current?.version}`);
	 * console.log(`Pending: ${status.pending.length}`);
	 */
	async status(): Promise<MigrationStatus> {
		const applied = await this.tracker.getApplied();
		const current = applied[applied.length - 1] || null;

		const pending = Array.from(this.migrations.values())
			.filter((m) => !applied.some((a) => a.version === m.version))
			.map((m) => ({
				version: m.version,
				name: m.name,
				description: m.description,
			}));

		const canRollback = current ? this.migrations.get(current.version)?.down !== undefined : false;

		return {
			current: current
				? {
						version: current.version,
						name: current.name,
						appliedAt: current.appliedAt,
					}
				: null,
			applied,
			pending,
			canRollback,
		};
	}

	/**
	 * Plan migrations (dry-run)
	 * 
	 * @example
	 * const plan = await db.migrations.plan({ target: 'latest', dryRun: true });
	 * console.log(`Will apply ${plan.migrationsToApply.length} migrations`);
	 * console.log(`Estimated cost: ${plan.totalEstimatedRU} RU`);
	 */
	async plan(options: { target?: number | "latest"; dryRun?: boolean } = {}): Promise<MigrationPlan> {
		const { target = "latest" } = options;
		const status = await this.status();

		let targetVersion: number;
		if (target === "latest") {
			const versions = Array.from(this.migrations.keys());
			targetVersion = versions.length > 0 ? Math.max(...versions) : 0;
		} else {
			targetVersion = target;
		}

		const toApply = status.pending
			.filter((m) => m.version <= targetVersion)
			.map((m) => this.migrations.get(m.version)!);

		return this.planner.createPlan(toApply);
	}

	/**
	 * Apply pending migrations
	 * 
	 * @example
	 * const result = await db.migrations.apply({
	 *   target: 'latest',
	 *   confirm: true,
	 *   onProgress: (p) => {
	 *     console.log(`[${p.migration.name}] ${p.status} - ${p.percentage}%`);
	 *   }
	 * });
	 */
	async apply(options: MigrationApplyOptions = {}): Promise<MigrationResult> {
		const { target = "latest", confirm = false, dryRun = false, onProgress } = options;

		if (!confirm && !dryRun) {
			throw new Error("Must set confirm: true or dryRun: true to apply migrations");
		}

		const plan = await this.plan({ target, dryRun });

		if (plan.migrationsToApply.length === 0) {
			return {
				success: true,
				applied: [],
				performance: {
					totalRuConsumed: 0,
					totalDurationMs: 0,
				},
			};
		}

		const migrations = plan.migrationsToApply.map((m) => this.migrations.get(m.version)!);

		return this.runner.applyMigrations(migrations, { dryRun, onProgress });
	}

	/**
	 * Rollback to a specific version
	 * 
	 * @example
	 * await db.migrations.rollback({
	 *   to: 3,
	 *   confirm: true
	 * });
	 */
	async rollback(options: RollbackOptions): Promise<MigrationResult> {
		const { to, confirm = false, onProgress } = options;

		if (!confirm) {
			throw new Error("Must set confirm: true to rollback migrations");
		}

		const status = await this.status();

		if (!status.current || status.current.version <= to) {
			throw new Error(
				`Cannot rollback to version ${to}. Current version is ${status.current?.version || 0}`,
			);
		}

		const toRollback = status.applied
			.filter((m) => m.version > to)
			.reverse() // rollback in reverse order
			.map((m) => this.migrations.get(m.version)!)
			.filter((m) => m !== undefined);

		// Validate all have down()
		const missingDown = toRollback.find((m) => !m.down);
		if (missingDown) {
			throw new Error(
				`Cannot rollback: migration ${missingDown.version} (${missingDown.name}) has no down() function`,
			);
		}

		return this.runner.rollbackMigrations(toRollback, { onProgress });
	}
}

