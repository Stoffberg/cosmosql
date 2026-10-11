import type { CosmosClient } from "../client/cosmos-client";
import type { MigrationDefinition, MigrationRecord } from "./types";

const MIGRATIONS_CONTAINER = "_migrations";

/**
 * Migration tracker handles storing and retrieving migration records
 */
export class MigrationTracker {
	constructor(private client: CosmosClient) {}

	/**
	 * Initialize the migrations container if it doesn't exist
	 */
	async initialize(): Promise<void> {
		const exists = await this.client.containerExists(MIGRATIONS_CONTAINER);

		if (!exists) {
			await this.client.createContainer({
				id: MIGRATIONS_CONTAINER,
				partitionKey: {
					paths: ["/id"],
					kind: "Hash",
				},
			});
		}
	}

	/**
	 * Get all applied migrations, ordered by version
	 */
	async getApplied(): Promise<MigrationRecord[]> {
		await this.initialize();

		const path = `/dbs/${this.client.getDatabase()}/colls/${MIGRATIONS_CONTAINER}/docs`;

		try {
			const result = await this.client.request(
				"POST",
				path,
				{
					query: "SELECT * FROM c ORDER BY c.version ASC",
					parameters: [],
				},
				undefined,
				true, // cross-partition query
			);

			const documents = result.Documents || [];

			return documents.map((doc: any) => ({
				id: doc.id,
				version: doc.version,
				name: doc.name,
				description: doc.description,
				appliedAt: new Date(doc.appliedAt),
				ruConsumed: doc.ruConsumed,
				durationMs: doc.durationMs,
				checksum: doc.checksum,
			}));
		} catch (error) {
			// If container doesn't exist yet or query fails, return empty array
			return [];
		}
	}

	/**
	 * Get a specific migration record
	 */
	async getMigration(version: number): Promise<MigrationRecord | null> {
		await this.initialize();

		const id = version.toString();
		const path = `/dbs/${this.client.getDatabase()}/colls/${MIGRATIONS_CONTAINER}/docs/${id}`;

		try {
			const doc = await this.client.request("GET", path, undefined, id);

			return {
				id: doc.id,
				version: doc.version,
				name: doc.name,
				description: doc.description,
				appliedAt: new Date(doc.appliedAt),
				ruConsumed: doc.ruConsumed,
				durationMs: doc.durationMs,
				checksum: doc.checksum,
			};
		} catch (error: any) {
			if (error.statusCode === 404) {
				return null;
			}
			throw error;
		}
	}

	/**
	 * Record that a migration was applied
	 */
	async recordMigration(
		migration: MigrationDefinition,
		ruConsumed: number,
		durationMs: number,
	): Promise<void> {
		await this.initialize();

		const id = migration.version.toString();
		const checksum = this.calculateChecksum(migration);

		const doc = {
			id,
			version: migration.version,
			name: migration.name,
			description: migration.description,
			appliedAt: new Date().toISOString(),
			ruConsumed,
			durationMs,
			checksum,
		};

		const path = `/dbs/${this.client.getDatabase()}/colls/${MIGRATIONS_CONTAINER}/docs`;

		await this.client.request("POST", path, doc, id);
	}

	/**
	 * Remove a migration record (used during rollback)
	 */
	async removeMigration(version: number): Promise<void> {
		await this.initialize();

		const id = version.toString();
		const path = `/dbs/${this.client.getDatabase()}/colls/${MIGRATIONS_CONTAINER}/docs/${id}`;

		await this.client.request("DELETE", path, undefined, id);
	}

	/**
	 * Calculate a checksum for a migration to detect if it has changed
	 */
	private calculateChecksum(migration: MigrationDefinition): string {
		// Simple checksum: hash the function code
		const upCode = migration.up.toString();
		const downCode = migration.down?.toString() || "";

		// Simple hash function (not cryptographic, just for change detection)
		let hash = 0;
		const str = `${migration.version}:${migration.name}:${upCode}:${downCode}`;

		for (let i = 0; i < str.length; i++) {
			const char = str.charCodeAt(i);
			hash = (hash << 5) - hash + char;
			hash = hash & hash; // Convert to 32bit integer
		}

		return hash.toString(36);
	}

	/**
	 * Verify that a migration hasn't changed since it was applied
	 */
	async verifyChecksum(migration: MigrationDefinition): Promise<boolean> {
		const record = await this.getMigration(migration.version);

		if (!record) {
			return true; // Not applied yet, so it's fine
		}

		const currentChecksum = this.calculateChecksum(migration);
		return currentChecksum === record.checksum;
	}
}
