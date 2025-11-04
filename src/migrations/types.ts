import type { BulkProgressStats } from "../types/bulk-operations";

export interface MigrationDefinition {
	version: number; // Must be unique and sequential
	name: string; // Descriptive name (e.g., 'add-user-preferences')
	description?: string; // Optional detailed description

	up: (ctx: MigrationContext) => Promise<void>;
	down?: (ctx: MigrationContext) => Promise<void>;

	// Optional: Run before up()
	validate?: (ctx: MigrationContext) => Promise<{ valid: boolean; message?: string }>;
}

export interface MigrationContext {
	db: any; // CosmosClient (use any to avoid circular deps)
	logger: MigrationLogger;
	progress: ProgressTracker;
	dryRun: boolean; // If true, don't actually modify data
}

export interface MigrationLogger {
	info: (message: string) => void;
	warn: (message: string) => void;
	error: (message: string) => void;
	debug: (message: string) => void;
}

export interface ProgressTracker {
	track: (name: string) => (stats: BulkProgressStats) => void;
}

export interface MigrationRecord {
	id: string; // Same as version number
	version: number;
	name: string;
	description?: string;
	appliedAt: Date;
	ruConsumed: number;
	durationMs: number;
	checksum: string; // Hash of migration code (detect changes)
}

export interface MigrationStatus {
	current: {
		version: number;
		name: string;
		appliedAt: Date;
	} | null;
	applied: MigrationRecord[];
	pending: Array<{
		version: number;
		name: string;
		description?: string;
	}>;
	canRollback: boolean; // true if current migration has down()
}

export interface MigrationPlan {
	migrationsToApply: Array<{
		version: number;
		name: string;
		description?: string;
		estimatedRU: number; // Rough estimate
		estimatedDuration: string; // Human readable (e.g., '2m 30s')
	}>;
	totalEstimatedRU: number;
	totalEstimatedDuration: string;
	warnings: string[]; // e.g., ['Cross-partition queries will be used']
}

export interface MigrationResult {
	success: boolean;
	applied: Array<{
		version: number;
		name: string;
		ruConsumed: number;
		durationMs: number;
	}>;
	failed?: {
		version: number;
		name: string;
		error: string;
	};
	performance: {
		totalRuConsumed: number;
		totalDurationMs: number;
	};
}

export interface MigrationApplyOptions {
	target?: number | "latest"; // Apply up to this version (default: 'latest')
	confirm?: boolean; // Safety confirmation (default: false)
	dryRun?: boolean; // Simulate without applying (default: false)
	onProgress?: (progress: MigrationProgress) => void;
}

export interface MigrationProgress {
	migration: {
		version: number;
		name: string;
	};
	status: "validating" | "running" | "complete" | "failed";
	percentage: number; // 0-100
	ruConsumed: number;
	durationMs: number;
}

export interface RollbackOptions {
	to: number; // Roll back to this version
	confirm?: boolean; // Safety confirmation (default: false)
	onProgress?: (progress: MigrationProgress) => void;
}

