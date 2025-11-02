import { fetch, Pool, type Response } from "undici";
import { CosmosError } from "../errors/cosmos-error";
import { CosmosAuth } from "./auth";

export type ContainerMode = "auto-create" | "verify" | "skip";

export interface CosmosClientConfig {
	endpoint?: string;
	key?: string;
	connectionString?: string;
	database: string;
	mode?: ContainerMode;
	retryOptions?: {
		maxRetries?: number;
		initialDelay?: number;
		maxDelay?: number;
	};
}

export class CosmosClient {
	private auth: CosmosAuth;
	private endpoint: string;
	private database: string;
	private pool: Pool;
	private retryOptions: Required<
		NonNullable<CosmosClientConfig["retryOptions"]>
	>;

	constructor(config: CosmosClientConfig) {
		if (config.connectionString) {
			const parsed = new CosmosAuth("").parseConnectionString(
				config.connectionString,
			);
			this.endpoint = parsed.endpoint.replace(/\/$/, "");
			this.auth = new CosmosAuth(parsed.key);
		} else if (config.endpoint && config.key) {
			this.endpoint = config.endpoint.replace(/\/$/, "");
			this.auth = new CosmosAuth(config.key);
		} else {
			throw new Error("Must provide either connectionString or endpoint + key");
		}

		this.database = config.database;
		this.retryOptions = {
			maxRetries: config.retryOptions?.maxRetries ?? 3,
			initialDelay: config.retryOptions?.initialDelay ?? 100,
			maxDelay: config.retryOptions?.maxDelay ?? 5000,
		};

		// Connection pooling with undici
		this.pool = new Pool(this.endpoint, {
			connections: 50,
			keepAliveTimeout: 30000,
		});
	}

	async request<T = any>(
		method: string,
		path: string,
		body?: any,
		partitionKey?: any,
		enableCrossPartitionQuery?: boolean,
	): Promise<T> {
		return this.requestWithRetry<T>(
			method,
			path,
			body,
			partitionKey,
			enableCrossPartitionQuery,
			0,
		);
	}

	private async requestWithRetry<T>(
		method: string,
		path: string,
		body: any,
		partitionKey: any,
		enableCrossPartitionQuery: boolean | undefined,
		attempt: number,
	): Promise<T> {
		const date = new Date();
		const [resourceType, resourceId] = this.parseResourcePath(path);

		const token = this.auth.generateAuthToken(
			method,
			resourceType,
			resourceId,
			date,
		);

		const headers: Record<string, string> = {
			Authorization: token,
			"x-ms-date": date.toUTCString(),
			"x-ms-version": "2018-12-31",
			"Content-Type": "application/json",
			Accept: "application/json",
		};

		if (partitionKey !== undefined && partitionKey !== null) {
			headers["x-ms-documentdb-partitionkey"] = JSON.stringify(
				Array.isArray(partitionKey) ? partitionKey : [partitionKey],
			);
		}

		if (enableCrossPartitionQuery === true) {
			headers["x-ms-documentdb-query-enablecrosspartition"] = "true";
		}

		const url = `${this.endpoint}${path}`;

		try {
			const response = await fetch(url, {
				method,
				headers,
				body: body ? JSON.stringify(body) : undefined,
				dispatcher: this.pool,
			});

			if (!response.ok) {
				if (response.status === 429 && attempt < this.retryOptions.maxRetries) {
					// Rate limited, retry with backoff
					const delay = Math.min(
						this.retryOptions.initialDelay * 2 ** attempt,
						this.retryOptions.maxDelay,
					);
					await this.sleep(delay);
					return this.requestWithRetry<T>(
						method,
						path,
						body,
						partitionKey,
						enableCrossPartitionQuery,
						attempt + 1,
					);
				}

				throw await this.handleErrorResponse(response);
			}

			// HEAD and DELETE requests may not have body
			if (
				method === "HEAD" ||
				(method === "DELETE" && response.status === 204)
			) {
				return {} as T;
			}

			return (await response.json()) as T;
		} catch (error) {
			if (error instanceof CosmosError) {
				throw error;
			}
			throw new CosmosError(500, "NETWORK_ERROR", (error as Error).message);
		}
	}

	private sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	private parseResourcePath(path: string): [string, string] {
		const parts = path.split("/").filter(Boolean);

		if (parts.length >= 1) {
			const resourceType = parts[parts.length - 1];
			const resourceId = parts.length > 1 ? parts.slice(0, -1).join("/") : "";
			return [resourceType, resourceId];
		}

		return ["", ""];
	}

	private async handleErrorResponse(response: Response): Promise<CosmosError> {
		let message = response.statusText || "Unknown error";
		let code = "UNKNOWN_ERROR";

		try {
			const body: any = await response.json();
			message = body.message || message;
			code = body.code || code;
		} catch {
			// Ignore JSON parse errors
		}

		return new CosmosError(response.status, code, message);
	}

	getDatabase(): string {
		return this.database;
	}

	close(): void {
		this.pool.close();
	}

	// Container management methods
	async databaseExists(): Promise<boolean> {
		try {
			await this.request("HEAD", `/dbs/${this.database}`);
			return true;
		} catch (error) {
			if (error instanceof CosmosError && error.statusCode === 404) {
				return false;
			}
			throw error;
		}
	}

	async createDatabase(): Promise<void> {
		await this.request("POST", "/dbs", {
			id: this.database,
		});
	}

	async containerExists(name: string): Promise<boolean> {
		try {
			await this.request("HEAD", `/dbs/${this.database}/colls/${name}`);
			return true;
		} catch (error) {
			if (error instanceof CosmosError && error.statusCode === 404) {
				return false;
			}
			throw error;
		}
	}

	async getContainer(name: string): Promise<ContainerInfo | null> {
		try {
			return await this.request<ContainerInfo>(
				"GET",
				`/dbs/${this.database}/colls/${name}`,
			);
		} catch (error) {
			if (error instanceof CosmosError && error.statusCode === 404) {
				return null;
			}
			throw error;
		}
	}

	async createContainer(body: CreateContainerBody): Promise<void> {
		await this.request("POST", `/dbs/${this.database}/colls`, body);
	}

	async updateContainer(
		name: string,
		body: UpdateContainerBody,
	): Promise<void> {
		await this.request("PUT", `/dbs/${this.database}/colls/${name}`, body);
	}

	async listContainers(): Promise<ContainerListItem[]> {
		const response = await this.request<{
			DocumentCollections: ContainerListItem[];
		}>("GET", `/dbs/${this.database}/colls`);
		return response.DocumentCollections || [];
	}

	async deleteContainer(name: string): Promise<void> {
		await this.request("DELETE", `/dbs/${this.database}/colls/${name}`);
	}
}

export interface ContainerInfo {
	id: string;
	partitionKey: {
		paths: string[];
		kind: string;
	};
	indexingPolicy?: {
		automatic?: boolean;
		includedPaths?: Array<{ path: string }>;
		excludedPaths?: Array<{ path: string }>;
		compositeIndexes?: Array<Array<{ path: string; order?: string }>>;
		spatialIndexes?: Array<{ path: string; types: string[] }>;
	};
	_rid: string;
	_ts: number;
	_self: string;
}

export interface ContainerListItem {
	id: string;
}

export interface CreateContainerBody {
	id: string;
	partitionKey: {
		paths: string[];
		kind: string;
	};
	indexingPolicy?: {
		automatic?: boolean;
		includedPaths?: Array<{ path: string }>;
		excludedPaths?: Array<{ path: string }>;
		compositeIndexes?: Array<Array<{ path: string; order?: string }>>;
		spatialIndexes?: Array<{ path: string; types: string[] }>;
	};
}

export interface UpdateContainerBody extends CreateContainerBody {
	_rid: string;
	_ts: number;
	_self: string;
}
