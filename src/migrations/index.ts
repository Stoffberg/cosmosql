import type { MigrationDefinition } from "./types";

/**
 * Define a migration
 * 
 * @example
 * export const migration = defineMigration({
 *   version: 1,
 *   name: 'add-user-preferences',
 *   
 *   async up({ db, logger, progress }) {
 *     logger.info('Adding preferences field to all users');
 *     
 *     await db.users.updateMany({
 *       where: {},
 *       data: (doc) => ({
 *         preferences: {
 *           theme: doc.oldTheme || 'light',
 *           notifications: true
 *         }
 *       }),
 *       enableCrossPartitionQuery: true,
 *       onProgress: progress.track('users')
 *     });
 *   },
 *   
 *   async down({ db }) {
 *     await db.users.updateMany({
 *       where: {},
 *       data: { preferences: undefined },
 *       enableCrossPartitionQuery: true
 *     });
 *   }
 * });
 */
export function defineMigration(definition: MigrationDefinition): MigrationDefinition {
	// Validate
	if (!Number.isInteger(definition.version) || definition.version < 1) {
		throw new Error("Migration version must be a positive integer");
	}

	if (!definition.name || !/^[a-z0-9-]+$/.test(definition.name)) {
		throw new Error("Migration name must be lowercase alphanumeric with hyphens");
	}

	if (!definition.up) {
		throw new Error("Migration must have an up() function");
	}

	return definition;
}

// Re-export types
export type {
	MigrationApplyOptions,
	MigrationContext,
	MigrationDefinition,
	MigrationLogger,
	MigrationPlan,
	MigrationProgress,
	MigrationRecord,
	MigrationResult,
	MigrationStatus,
	ProgressTracker,
	RollbackOptions,
} from "./types";

