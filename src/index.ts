import { ContainerClient } from "./client/container-client";
import {
	type ContainerMode,
	CosmosClient,
	type CosmosClientConfig,
	type CreateContainerBody,
} from "./client/cosmos-client";
import type { ContainerSchema, IndexingPolicy } from "./schema/container";

export { CosmosError, isCosmosError } from "./errors/cosmos-error";
export { container, type IndexingPolicy } from "./schema/container";
export { field } from "./schema/field";
export type { ContainerMode };

export type {
	CreateInput,
	InferSchema,
	OrderByInput,
	SelectInput,
	SelectResult,
	UpdateInput,
	WhereInput,
} from "./types";

export function createClient(config: CosmosClientConfig) {
	const client = new CosmosClient(config);
	const mode = config.mode ?? "verify";

	return {
		async withContainers<
			T extends Record<string, ContainerSchema<any, any, any>>,
		>(
			containers: T,
		): Promise<
			{
				[K in keyof T]: T[K] extends ContainerSchema<any, infer S, infer PK>
					? ContainerClient<S, PK>
					: never;
			} & {
				listOrphanedContainers: () => Promise<string[]>;
				deleteContainers: (names: string[]) => Promise<void>;
				pruneContainers: (options?: { confirm: boolean }) => Promise<string[]>;
			}
		> {
			// Step 1: Verify/create database
			if (mode === "skip") {
				// Skip all checks
			} else {
				const dbExists = await client.databaseExists();
				if (!dbExists) {
					if (mode === "auto-create") {
						await client.createDatabase();
					} else {
						throw new Error(
							`Database "${client.getDatabase()}" does not exist. Use mode: "auto-create" to create it automatically.`,
						);
					}
				}
			}

			// Step 2: Verify/create/update containers
			const containerNames = new Set<string>();

			if (mode !== "skip") {
				for (const [name, schema] of Object.entries(containers)) {
					containerNames.add(name);
					await ensureContainer(
						client,
						name,
						schema as ContainerSchema<any, any, any>,
						mode,
					);
				}
			}

			// Step 3: Build result with container clients
			const result: any = {};

			for (const [name, schema] of Object.entries(containers)) {
				result[name] = new ContainerClient(client, schema);
			}

			// Step 4: Add container management methods
			result.listOrphanedContainers = async () => {
				const allContainers = await client.listContainers();
				return allContainers
					.map((c) => c.id)
					.filter((id) => !containerNames.has(id));
			};

			result.deleteContainers = async (names: string[]) => {
				for (const name of names) {
					await client.deleteContainer(name);
				}
			};

			result.pruneContainers = async (options?: { confirm: boolean }) => {
				if (!options?.confirm) {
					throw new Error(
						"pruneContainers requires confirm: true to prevent accidental deletion",
					);
				}
				const orphaned = await result.listOrphanedContainers();
				await result.deleteContainers(orphaned);
				return orphaned;
			};

			return result;
		},
	};
}

async function ensureContainer(
	client: CosmosClient,
	name: string,
	schema: ContainerSchema<any, any, any>,
	mode: "auto-create" | "verify" | "skip",
): Promise<void> {
	const exists = await client.containerExists(name);

	if (!exists) {
		if (mode === "auto-create") {
			await client.createContainer(buildContainerBody(name, schema));
		} else {
			throw new Error(
				`Container "${name}" does not exist. Use mode: "auto-create" to create it automatically.`,
			);
		}
		return;
	}

	// Container exists, verify configuration
	const containerInfo = await client.getContainer(name);
	if (!containerInfo) {
		throw new Error(`Container "${name}" exists but could not be retrieved`);
	}

	// Check partition key
	const expectedPkField = schema.partitionKeyField;
	if (expectedPkField) {
		const expectedPath = `/${expectedPkField}`;
		const actualPaths = containerInfo.partitionKey.paths;
		const actualPath = actualPaths[0];

		if (actualPath !== expectedPath) {
			throw new Error(
				`Partition key mismatch for container "${name}": expected "${expectedPath}", found "${actualPath}". ` +
					"Cannot modify partition key. Delete container or use different name.",
			);
		}
	}

	// In auto-create mode, update indexing policy if configured
	if (mode === "auto-create" && schema.config?.indexing) {
		const currentPolicy = containerInfo.indexingPolicy;
		const expectedPolicy = schema.config.indexing;
		// Simple comparison - can be enhanced
		if (!arePoliciesEqual(currentPolicy, expectedPolicy)) {
			const body = buildContainerBody(name, schema);
			await client.updateContainer(name, {
				...body,
				_rid: containerInfo._rid,
				_ts: containerInfo._ts,
				_self: containerInfo._self,
			});
		}
	}

	// In verify mode, warn about indexing differences
	if (mode === "verify" && schema.config?.indexing) {
		const currentPolicy = containerInfo.indexingPolicy;
		const expectedPolicy = schema.config.indexing;
		if (!arePoliciesEqual(currentPolicy, expectedPolicy)) {
			// eslint-disable-next-line no-console
			console.warn(
				`Indexing policy mismatch for container "${name}". Update manually or use mode: "auto-create"`,
			);
		}
	}
}

function buildContainerBody(
	name: string,
	schema: ContainerSchema<any, any, any>,
): CreateContainerBody {
	const pkField = schema.partitionKeyField;

	if (!pkField) {
		throw new Error(`Container "${name}" must have a partition key defined`);
	}

	const body: CreateContainerBody = {
		id: name,
		partitionKey: {
			paths: [`/${pkField}`],
			kind: "Hash",
		},
	};

	if (schema.config?.indexing) {
		body.indexingPolicy = schema.config.indexing;
	}

	return body;
}

function arePoliciesEqual(
	policy1?: { automatic?: boolean; excludedPaths?: Array<{ path: string }> },
	policy2?: IndexingPolicy,
): boolean {
	if (!policy1 && !policy2) return true;
	if (!policy1 || !policy2) return false;
	if (policy1.automatic !== policy2.automatic) return false;

	const excluded1 = policy1.excludedPaths?.map((p) => p.path).sort() || [];
	const excluded2 = policy2.excludedPaths?.map((p) => p.path).sort() || [];
	if (JSON.stringify(excluded1) !== JSON.stringify(excluded2)) return false;

	return true;
}
