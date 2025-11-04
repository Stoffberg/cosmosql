import type { MigrationDefinition, MigrationPlan } from "./types";

/**
 * Migration planner creates execution plans and estimates costs
 */
export class MigrationPlanner {
	/**
	 * Create a plan for applying migrations
	 */
	async createPlan(migrations: MigrationDefinition[]): Promise<MigrationPlan> {
		const warnings: string[] = [];

		// Estimate costs for each migration
		const migrationsToApply = migrations.map((migration) => {
			// Simple heuristic estimates
			// In a real implementation, you might analyze the migration code
			// or use historical data
			const estimatedRU = 100; // Base cost
			const estimatedDurationMs = 5000; // Base duration

			return {
				version: migration.version,
				name: migration.name,
				description: migration.description,
				estimatedRU,
				estimatedDuration: this.formatDuration(estimatedDurationMs),
			};
		});

		// Calculate totals
		const totalEstimatedRU = migrationsToApply.reduce((sum, m) => sum + m.estimatedRU, 0);
		const totalEstimatedDurationMs = migrationsToApply.length * 5000; // Rough estimate

		// Add warnings
		if (migrations.length > 5) {
			warnings.push(`${migrations.length} migrations will be applied. This may take some time.`);
		}

		if (totalEstimatedRU > 10000) {
			warnings.push(`Estimated RU consumption: ${totalEstimatedRU}. This may incur significant costs.`);
		}

		// Check for missing down() methods
		const withoutDown = migrations.filter((m) => !m.down);
		if (withoutDown.length > 0) {
			warnings.push(
				`${withoutDown.length} migration(s) do not have down() methods and cannot be rolled back: ${withoutDown.map((m) => m.name).join(", ")}`,
			);
		}

		return {
			migrationsToApply,
			totalEstimatedRU,
			totalEstimatedDuration: this.formatDuration(totalEstimatedDurationMs),
			warnings,
		};
	}

	/**
	 * Format duration in milliseconds to human-readable string
	 */
	private formatDuration(ms: number): string {
		if (ms < 1000) {
			return `${ms}ms`;
		}

		const seconds = Math.floor(ms / 1000);
		if (seconds < 60) {
			return `${seconds}s`;
		}

		const minutes = Math.floor(seconds / 60);
		const remainingSeconds = seconds % 60;

		if (remainingSeconds === 0) {
			return `${minutes}m`;
		}

		return `${minutes}m ${remainingSeconds}s`;
	}
}

