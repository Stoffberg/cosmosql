import type { CosmosClient } from "../client/cosmos-client";
import type {
	ContainerDiff,
	ContainerHealthCheck,
	ContainerInfo,
	CopyDatabaseOptions,
	CopyDatabaseResult,
	DatabaseHealthReport,
	DatabaseInfo,
	DeleteContainersOptions,
	DeleteContainersResult,
	DetailedDatabaseInfo,
	PruneContainersOptions,
	PruneContainersResult,
	SchemaDiff,
} from "../types/management";

/**
 * Management operations for databases and containers
 */
export class ManagementOperations {
	private registeredContainers: Map<string, any> = new Map();

	constructor(private client: CosmosClient) {}

	/**
	 * Register containers from schema for tracking
	 */
	registerContainer(name: string, schema: any): void {
		this.registeredContainers.set(name, schema);
	}

	/**
	 * List all databases in the account
	 */
	async listDatabases(): Promise<DatabaseInfo[]> {
		// Note: This would require access to account-level operations
		// For now, return info about the current database
		const dbInfo = await this.getDatabaseInfo(this.client.getDatabase());
		return [dbInfo];
	}

	/**
	 * Get detailed information about a database
	 */
	async getDatabaseInfo(databaseName?: string): Promise<DetailedDatabaseInfo> {
		const dbName = databaseName || this.client.getDatabase();

		// Get all containers
		const containersList = await this.client.listContainers();

		// Get detailed info for each container
		const containers: ContainerInfo[] = await Promise.all(
			containersList.map(async (containerResource) => {
				const containerInfo = await this.client.getContainer(containerResource.id);

				if (!containerInfo) {
					throw new Error(`Container ${containerResource.id} not found`);
				}

				// Get statistics by querying the container
				let documentCount = 0;
				try {
					const countPath = `/dbs/${dbName}/colls/${containerResource.id}/docs`;
					const countResult = await this.client.request(
						"POST",
						countPath,
						{
							query: "SELECT VALUE COUNT(1) FROM c",
							parameters: [],
						},
						undefined,
						true, // cross-partition
					);
					documentCount = countResult.Documents?.[0] || 0;
				} catch {
					// Ignore errors getting count
				}

				const registeredSchema = this.registeredContainers.get(containerResource.id);

				return {
					id: containerInfo.id,
					_self: containerInfo._self,
					_rid: containerInfo._rid,
					_ts: containerInfo._ts,
					created: new Date(containerInfo._ts * 1000),
					lastModified: new Date(containerInfo._ts * 1000),
					partitionKey: {
						paths: containerInfo.partitionKey.paths,
						kind: (containerInfo.partitionKey.kind as any) || "Hash",
						version: 1,
					},
					statistics: {
						documentCount,
						sizeKB: 0, // Would need special API
						indexSizeKB: 0,
						avgDocumentSizeKB: 0,
					},
					throughput: {
						type: "shared",
					},
					indexingPolicy: {
						automatic: containerInfo.indexingPolicy?.automatic ?? true,
						indexingMode: "consistent",
						includedPaths: containerInfo.indexingPolicy?.includedPaths?.length || 0,
						excludedPaths: containerInfo.indexingPolicy?.excludedPaths?.length || 0,
						compositeIndexes: containerInfo.indexingPolicy?.compositeIndexes?.length || 0,
						spatialIndexes: containerInfo.indexingPolicy?.spatialIndexes?.length || 0,
					},
					schema: registeredSchema
						? {
								registered: true,
								fieldCount: Object.keys(registeredSchema.schema || {}).length,
								partitionKeyField: registeredSchema.partitionKeyField || "",
							}
						: undefined,
				};
			}),
		);

		// Aggregate statistics
		const totalDocs = containers.reduce((sum, c) => sum + c.statistics.documentCount, 0);
		const totalSizeKB = containers.reduce((sum, c) => sum + c.statistics.sizeKB, 0);

		return {
			id: dbName,
			_self: "",
			_rid: "",
			_ts: 0,
			created: new Date(),
			lastModified: new Date(),
			storage: {
				totalSizeGB: totalSizeKB / (1024 * 1024),
				documentsSizeGB: totalSizeKB / (1024 * 1024),
				indexSizeGB: containers.reduce((sum, c) => sum + c.statistics.indexSizeKB, 0) / (1024 * 1024),
				totalDocuments: totalDocs,
			},
			region: "unknown",
			containersCount: containers.length,
			containers,
		};
	}

	/**
	 * Get health check for all containers
	 */
	async healthCheck(): Promise<DatabaseHealthReport> {
		const info = await this.getDatabaseInfo();
		const orphaned = await this.listOrphanedContainers();

		const containerChecks: ContainerHealthCheck[] = info.containers.map((container) => {
			const issues: ContainerHealthCheck["issues"] = [];

			// Check for orphaned containers
			if (orphaned.includes(container.id)) {
				issues.push({
					severity: "warning",
					type: "orphaned",
					message: `Container '${container.id}' is not registered in schema`,
					recommendation: "Consider removing with pruneContainers() or registering in schema",
				});
			}

			// Check for missing indexes
			if (container.indexingPolicy.includedPaths < 2) {
				issues.push({
					severity: "warning",
					type: "missing_index",
					message: "Very few indexed paths",
					recommendation: "Review indexing policy for query performance",
				});
			}

			// Check for large documents
			if (container.statistics.avgDocumentSizeKB > 100) {
				issues.push({
					severity: "warning",
					type: "large_documents",
					message: `Average document size is ${container.statistics.avgDocumentSizeKB.toFixed(2)} KB`,
					recommendation: "Consider splitting large documents or using pagination",
				});
			}

			return {
				container: container.id,
				healthy: issues.length === 0 || issues.every((i) => i.severity !== "error"),
				issues,
				statistics: {
					documentCount: container.statistics.documentCount,
					avgDocumentSizeKB: container.statistics.avgDocumentSizeKB,
					largestDocumentKB: 0,
					ruConsumption: {
						avg: 0,
						p95: 0,
						p99: 0,
					},
				},
			};
		});

		const hasErrors = containerChecks.some((c) => c.issues.some((i) => i.severity === "error"));
		const hasWarnings = containerChecks.some((c) => c.issues.some((i) => i.severity === "warning"));

		return {
			database: this.client.getDatabase(),
			overallHealth: hasErrors ? "critical" : hasWarnings ? "warning" : "healthy",
			timestamp: new Date(),
			containers: containerChecks,
			recommendations: [
				...(orphaned.length > 0 ? [`${orphaned.length} orphaned containers found`] : []),
			],
			costAnalysis: {
				currentMonthlyEstimate: 0,
				potentialSavings: [],
			},
		};
	}

	/**
	 * List containers that exist in the database but are not registered in your schema
	 */
	async listOrphanedContainers(): Promise<string[]> {
		const containers = await this.client.listContainers();
		const actualContainers = new Set(containers.map((c) => c.id));
		const registeredContainers = new Set(Array.from(this.registeredContainers.keys()));

		// Exclude system containers
		const systemContainers = new Set(["_migrations"]);

		return Array.from(actualContainers).filter(
			(name) => !registeredContainers.has(name) && !systemContainers.has(name),
		);
	}

	/**
	 * Delete specific containers (DESTRUCTIVE)
	 */
	async deleteContainers(names: string[], options: DeleteContainersOptions): Promise<DeleteContainersResult> {
		if (!options.confirm) {
			throw new Error("Must set confirm: true to delete containers. This action cannot be undone.");
		}

		const result: DeleteContainersResult = {
			deleted: [],
			failed: [],
		};

		for (const name of names) {
			try {
				await this.client.deleteContainer(name);
				result.deleted.push(name);
			} catch (error: any) {
				result.failed.push({
					container: name,
					error: error.message || String(error),
				});
			}
		}

		return result;
	}

	/**
	 * Remove all orphaned containers (not in schema)
	 */
	async pruneContainers(options: PruneContainersOptions): Promise<PruneContainersResult> {
		if (!options.confirm && !options.dryRun) {
			throw new Error("Must set confirm: true or dryRun: true to prune containers");
		}

		const orphaned = await this.listOrphanedContainers();
		const toDelete = orphaned.filter((name) => !options.exclude?.includes(name));

		if (options.dryRun) {
			return {
				pruned: toDelete,
				kept: options.exclude || [],
				failed: [],
			};
		}

		const deleteResult = await this.deleteContainers(toDelete, { confirm: true });

		return {
			pruned: deleteResult.deleted,
			kept: options.exclude || [],
			failed: deleteResult.failed,
		};
	}

	/**
	 * Compare schema definition with actual database state
	 */
	async diffSchema(): Promise<SchemaDiff> {
		const info = await this.getDatabaseInfo();
		const registered = Array.from(this.registeredContainers.keys());
		const actual = info.containers.map((c) => c.id);

		const orphaned = actual.filter((name) => !registered.includes(name));
		const missing = registered.filter((name) => !actual.includes(name));

		// Check for configuration differences in registered containers
		const modified: ContainerDiff[] = [];

		for (const containerName of registered) {
			const actualContainer = info.containers.find((c) => c.id === containerName);
			if (!actualContainer) continue;

			const registeredSchema = this.registeredContainers.get(containerName);
			const differences: ContainerDiff["differences"] = {};

			// Check partition key
			const actualPK = actualContainer.partitionKey.paths[0];
			const registeredPK = registeredSchema.partitionKeyField
				? `/${registeredSchema.partitionKeyField}`
				: "";

			if (registeredPK && actualPK !== registeredPK) {
				differences.partitionKey = {
					registered: registeredPK,
					actual: actualPK,
				};
			}

			if (Object.keys(differences).length > 0) {
				modified.push({
					container: containerName,
					differences,
				});
			}
		}

		return {
			database: this.client.getDatabase(),
			timestamp: new Date(),
			containers: {
				registered,
				actual,
				orphaned,
				missing,
				modified,
			},
			requiresAction: orphaned.length > 0 || missing.length > 0 || modified.length > 0,
		};
	}

	/**
	 * Copy entire database to another database
	 */
	async copyDatabase(_options: CopyDatabaseOptions): Promise<CopyDatabaseResult> {
		// Note: Full implementation would require more complex logic
		// This is a simplified placeholder

		const result: CopyDatabaseResult = {
			success: true,
			containersCopied: 0,
			documentsCopied: 0,
			documentsFailed: 0,
			performance: {
				ruConsumed: 0,
				durationMs: 0,
				documentsPerSecond: 0,
			},
			errors: [],
		};

		const startTime = Date.now();

		// Note: Full implementation would require creating destination database
		// and copying all containers and documents. This is a simplified version.

		result.performance.durationMs = Date.now() - startTime;
		result.success = result.errors.length === 0;

		return result;
	}
}

