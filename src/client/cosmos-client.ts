import https from "node:https";
import { CosmosError } from "../errors/cosmos-error";
import { CosmosAuth } from "./auth";

export interface CosmosClientConfig {
	endpoint?: string;
	key?: string;
	connectionString?: string;
	database: string;
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
	private agent: https.Agent;
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

		// Connection pooling
		this.agent = new https.Agent({
			keepAlive: true,
			keepAliveMsecs: 30000,
			maxSockets: 50,
			maxFreeSockets: 10,
		});
	}

	async request<T = any>(
		method: string,
		path: string,
		body?: any,
		partitionKey?: any,
		enableCrossPartitionQuery?: boolean,
	): Promise<T> {
		return this.requestWithRetry<T>(method, path, body, partitionKey, enableCrossPartitionQuery, 0);
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
			Authorization: `${token}`,
			"x-ms-date": date.toUTCString(),
			"x-ms-version": "2018-12-31",
			"Content-Type": "application/json",
			Accept: "application/json",
		};

		if (partitionKey !== undefined) {
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
				// @ts-expect-error - agent works in Node.js
				agent: this.agent,
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

			return (await response.json()) as T;
		} catch (error) {
			if (error instanceof CosmosError) {
				throw error;
			}
			throw new CosmosError(500, "NETWORK_ERROR", (error as Error).message);
		}
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
		let message = response.statusText;
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

	private sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	getDatabase(): string {
		return this.database;
	}

	close(): void {
		this.agent.destroy();
	}
}
