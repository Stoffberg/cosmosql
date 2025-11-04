import { CosmosError } from "../errors/cosmos-error";
import { CosmosAuth } from "./auth";

/**
 * Container creation/verification mode.
 * - `auto-create`: Automatically create containers if they don't exist
 * - `verify`: Verify containers exist but don't create them
 * - `skip`: Skip container checks entirely
 */
export type ContainerMode = "auto-create" | "verify" | "skip";

/**
 * Configuration options for CosmosClient.
 */
export interface CosmosClientConfig {
	/** Azure Cosmos DB endpoint URL (e.g., https://myaccount.documents.azure.com) */
	endpoint?: string;
	/** Azure Cosmos DB account key */
	key?: string;
	/** Connection string (alternative to endpoint + key) */
	connectionString?: string;
	/** Database name to connect to */
	database: string;
	/** Container creation/verification mode */
	mode?: ContainerMode;
	/** Retry configuration for rate-limited requests */
	retryOptions?: {
		/** Maximum number of retry attempts (default: 3) */
		maxRetries?: number;
		/** Initial retry delay in milliseconds (default: 100) */
		initialDelay?: number;
		/** Maximum retry delay in milliseconds (default: 5000) */
		maxDelay?: number;
	};
	/** Migration definitions for database schema management */
	migrations?: any[]; // MigrationDefinition[] (avoid circular dep)
}

/**
 * Main client for interacting with Azure Cosmos DB.
 *
 * This client handles authentication, HTTP requests, and provides methods
 * for database and container management. It implements automatic retry logic
 * for rate-limited requests and supports both connection string and
 * endpoint/key authentication.
 *
 * @example
 * ```typescript
 * // Using connection string
 * const client = new CosmosClient({
 *   connectionString: process.env.COSMOS_CONNECTION_STRING,
 *   database: 'mydb'
 * });
 *
 * // Using endpoint and key
 * const client = new CosmosClient({
 *   endpoint: 'https://myaccount.documents.azure.com',
 *   key: process.env.COSMOS_KEY,
 *   database: 'mydb',
 *   retryOptions: {
 *     maxRetries: 5,
 *     initialDelay: 200
 *   }
 * });
 * ```
 */
export class CosmosClient {
	private auth: CosmosAuth;
	private endpoint: string;
	private database: string;
	private retryOptions: Required<NonNullable<CosmosClientConfig["retryOptions"]>>;

	/**
	 * Creates a new CosmosClient instance.
	 *
	 * @param config - Client configuration
	 * @throws {Error} If neither connectionString nor (endpoint + key) is provided
	 */
	constructor(config: CosmosClientConfig) {
		if (config.connectionString) {
			const parsed = new CosmosAuth("").parseConnectionString(config.connectionString);
			this.endpoint = this.normalizeEndpoint(parsed.endpoint);
			this.auth = new CosmosAuth(parsed.key);
		} else if (config.endpoint && config.key) {
			this.endpoint = this.normalizeEndpoint(config.endpoint);
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
	}

	/**
	 * Normalizes the endpoint URL by removing trailing slashes and default ports.
	 *
	 * @param endpoint - The raw endpoint URL
	 * @returns The normalized endpoint URL
	 * @internal
	 */
	private normalizeEndpoint(endpoint: string): string {
		// Remove trailing slash
		let normalized = endpoint.replace(/\/$/, "");

		// Remove default ports (:443 for https, :80 for http)
		// These can cause issues with Cosmos DB authentication
		normalized = normalized.replace(/:443$/, "").replace(/^(http:\/\/[^:]+):80$/, "$1");

		if (process.env.DEBUG_COSMOS_AUTH) {
			console.log(`[CosmosClient] Normalized endpoint: ${normalized}`);
		}

		return normalized;
	}

	/**
	 * Executes an HTTP request to the Cosmos DB REST API.
	 *
	 * Handles authentication, header generation, and automatic retries for rate-limited requests.
	 *
	 * @template T - The expected response type
	 * @param method - HTTP method (GET, POST, PUT, DELETE, etc.)
	 * @param path - API path (e.g., /dbs/mydb/colls/mycoll/docs)
	 * @param body - Optional request body
	 * @param partitionKey - Optional partition key value
	 * @param enableCrossPartitionQuery - Whether to enable cross-partition queries
	 * @param extraHeaders - Additional headers to include in the request
	 * @returns The parsed response
	 * @throws {CosmosError} If the request fails
	 */
	async request<T = any>(
		method: string,
		path: string,
		body?: any,
		partitionKey?: any,
		enableCrossPartitionQuery?: boolean,
		extraHeaders?: Record<string, string>,
	): Promise<T> {
		return this.requestWithRetry<T>(
			method,
			path,
			body,
			partitionKey,
			enableCrossPartitionQuery,
			extraHeaders,
			0,
		);
	}

	/**
	 * Internal method that implements request retry logic.
	 *
	 * Automatically retries rate-limited requests (429) with exponential backoff.
	 *
	 * @template T - The expected response type
	 * @param method - HTTP method
	 * @param path - API path
	 * @param body - Request body
	 * @param partitionKey - Partition key value
	 * @param enableCrossPartitionQuery - Enable cross-partition queries
	 * @param extraHeaders - Additional headers
	 * @param attempt - Current retry attempt number
	 * @returns The parsed response
	 * @throws {CosmosError} If the request fails after all retries
	 * @internal
	 */
	private async requestWithRetry<T>(
		method: string,
		path: string,
		body: any,
		partitionKey: any,
		enableCrossPartitionQuery: boolean | undefined,
		extraHeaders: Record<string, string> | undefined,
		attempt: number,
	): Promise<T> {
		const date = new Date();
		const [resourceType, resourceId] = this.parseResourcePath(path);

		const token = this.auth.generateAuthToken(method, resourceType, resourceId, date);

		// Use plain object for headers instead of Headers instance
		const headers: Record<string, string> = {
			authorization: token,
			"x-ms-date": date.toUTCString(),
			"x-ms-version": "2018-12-31",
			accept: "application/json",
		};

		// Only add Content-Type for requests with body
		if (body) {
			// If the body has a 'query' property, this is a query request
			if (typeof body === "object" && body !== null && "query" in body) {
				headers["content-type"] = "application/query+json";
				headers["x-ms-documentdb-isquery"] = "true";
			} else {
				headers["content-type"] = "application/json";
			}
		}

		if (partitionKey !== undefined && partitionKey !== null) {
			headers["x-ms-documentdb-partitionkey"] = JSON.stringify(
				Array.isArray(partitionKey) ? partitionKey : [partitionKey],
			);
		}

		if (enableCrossPartitionQuery === true) {
			headers["x-ms-documentdb-query-enablecrosspartition"] = "true";
		}

		// Apply any extra headers
		if (extraHeaders) {
			Object.assign(headers, extraHeaders);
		}

		const url = `${this.endpoint}${path}`;

		// Debug logging
		if (process.env.DEBUG_COSMOS_AUTH) {
			console.log("\n=== CosmosQL Request Debug ===");
			console.log(`URL: ${url}`);
			console.log(`Method: ${method}`);
			console.log(`ResourceType: ${resourceType}`);
			console.log(`ResourceId: ${resourceId}`);
			console.log("Auth string for signature:");
			console.log(
				`  "${method.toLowerCase()}\\n${resourceType.toLowerCase()}\\n${resourceId}\\n${date.toUTCString().toLowerCase()}\\n\\n"`,
			);
			console.log("Headers:");
			for (const [key, value] of Object.entries(headers)) {
				if (key === "authorization") {
					console.log(`  ${key}: ${value.substring(0, 60)}...`);
				} else {
					console.log(`  ${key}: ${value}`);
				}
			}
			if (body) {
				console.log("Body:");
				console.log(`  ${JSON.stringify(body).substring(0, 200)}`);
			}
			console.log("=============================\n");
		}

		try {
			const response = await fetch(url, {
				method,
				headers,
				body: body ? JSON.stringify(body) : undefined,
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
						extraHeaders,
						attempt + 1,
					);
				}

				throw await this.handleErrorResponse(response);
			}

			// HEAD and DELETE requests may not have body
			if (method === "HEAD" || (method === "DELETE" && response.status === 204)) {
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

	/**
	 * Sleeps for the specified duration.
	 *
	 * @param ms - Duration in milliseconds
	 * @returns Promise that resolves after the duration
	 * @internal
	 */
	private sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	/**
	 * Parses a Cosmos DB REST API path to extract resource type and ID.
	 *
	 * This is used for generating proper authentication signatures.
	 *
	 * @param path - The API path to parse
	 * @returns Tuple of [resourceType, resourceId]
	 * @internal
	 */
	private parseResourcePath(path: string): [string, string] {
		const parts = path.split("/").filter(Boolean);

		if (parts.length === 0) {
			return ["", ""];
		}

		// Known resource types in Azure Cosmos DB REST API
		const resourceTypes = [
			"dbs",
			"colls",
			"docs",
			"sprocs",
			"udfs",
			"triggers",
			"users",
			"permissions",
			"attachments",
			"conflicts",
			"offers",
			"clientencryptionkeys",
			"schemacollections",
		];

		// Azure Cosmos DB REST API auth format (corrected based on server error messages):
		// For /dbs/{dbname}: resourceType="dbs", resourceId="dbs/{dbname}"
		// For /dbs/{dbname}/colls/{collname}: resourceType="colls", resourceId="dbs/{dbname}/colls/{collname}"
		// For /dbs/{dbname}/colls/{collname}/docs/{docid}: resourceType="docs", resourceId="dbs/{dbname}/colls/{collname}/docs/{docid}"
		// Rule: resourceType is the LAST resource type in the path, resourceId is the FULL path

		// Special case: if first part is a resource type and it's the only segment, resourceId is empty
		// e.g., /dbs -> resourceType="dbs", resourceId=""
		if (parts.length === 1 && resourceTypes.includes(parts[0])) {
			return [parts[0], ""];
		}

		// Find the last occurrence of a known resource type
		let resourceTypeIndex = -1;
		let resourceType = "";
		for (let i = parts.length - 1; i >= 0; i--) {
			if (resourceTypes.includes(parts[i])) {
				resourceTypeIndex = i;
				resourceType = parts[i];
				break;
			}
		}

		if (resourceTypeIndex >= 0) {
			// ResourceId is the full path BEFORE the resource type
			// For /dbs/dbname: resourceType="dbs", resourceId="dbs/dbname"
			// For /dbs/dbname/colls: resourceType="colls", resourceId="dbs/dbname"
			// For /dbs/dbname/colls/collname: resourceType="colls", resourceId="dbs/dbname/colls/collname"
			// For /dbs/dbname/colls/collname/docs/docid: resourceType="docs", resourceId="dbs/dbname/colls/collname/docs/docid"

			// Special case: if resourceType is at index 0 and there's a value after it
			if (resourceTypeIndex === 0 && parts.length > 1) {
				// /dbs/dbname -> resourceId = "dbs/dbname"
				const resourceId = parts.slice(0, 2).join("/");
				return [resourceType, resourceId];
			}

			// If there's a value after the resource type, include it in the resourceId
			// /dbs/dbname/colls/collname -> resourceType="colls", resourceId="dbs/dbname/colls/collname"
			if (resourceTypeIndex < parts.length - 1) {
				const resourceId = parts.join("/");
				return [resourceType, resourceId];
			}

			// If resource type is at the end with no value after
			// /dbs/dbname/colls -> resourceType="colls", resourceId="dbs/dbname"
			const resourceId = parts.slice(0, resourceTypeIndex).join("/");
			return [resourceType, resourceId];
		}

		// Fallback: treat last segment as resource type (for backwards compatibility with tests)
		const resourceTypeFallback = parts[parts.length - 1];
		const resourceIdFallback = parts.length > 1 ? parts.slice(0, -1).join("/") : "";
		return [resourceTypeFallback, resourceIdFallback];
	}

	/**
	 * Handles error responses from the Cosmos DB API.
	 *
	 * Parses error details and creates appropriate CosmosError instances.
	 *
	 * @param response - The error response from fetch
	 * @returns A CosmosError instance
	 * @internal
	 */
	private async handleErrorResponse(response: globalThis.Response): Promise<CosmosError> {
		let message = response.statusText || "Unknown error";
		let code = "UNKNOWN_ERROR";
		let bodyText = "";

		try {
			bodyText = await response.text();

			// Debug: log full error response (only in debug mode)
			if (process.env.DEBUG_COSMOS_AUTH) {
				console.log("\n=== Cosmos DB Error Response ===");
				console.log(`Status: ${response.status} ${response.statusText}`);
				console.log(`Response headers:`);
				response.headers.forEach((value, key) => {
					console.log(`  ${key}: ${value}`);
				});
				console.log(`Raw body: ${bodyText}`);
				console.log("================================\n");
			}

			// Try to parse as JSON
			if (bodyText) {
				const body = JSON.parse(bodyText);
				message = body.message || message;
				code = body.code || code;

				// Detect specific error types for better error messages
				if (
					code === "BadRequest" &&
					(message.includes("cross partition") ||
						message.includes("cannot be directly served by the gateway"))
				) {
					code = "CROSS_PARTITION_QUERY_ERROR";
					message =
						"Cross-partition queries cannot be served by the gateway, especially on empty containers. " +
						"Use a partition key in your query or ensure the container has data before performing cross-partition queries.";
				}
			}
		} catch {
			// Ignore JSON parse errors
		}

		return new CosmosError(response.status, code, message);
	}

	/**
	 * Gets the current database name.
	 *
	 * @returns The database name
	 */
	getDatabase(): string {
		return this.database;
	}

	/**
	 * Checks if the configured database exists.
	 *
	 * @returns True if the database exists, false otherwise
	 * @throws {CosmosError} If the check fails for reasons other than 404
	 */
	async databaseExists(): Promise<boolean> {
		try {
			// Instead of HEAD /dbs/{db}, list containers to verify database exists
			// This works around an auth issue with direct database HEAD requests
			await this.request("GET", `/dbs/${this.database}/colls`);
			return true;
		} catch (error) {
			if (error instanceof CosmosError && error.statusCode === 404) {
				return false;
			}
			throw error;
		}
	}

	/**
	 * Creates the configured database.
	 *
	 * @throws {CosmosError} If the database already exists or creation fails
	 */
	async createDatabase(): Promise<void> {
		await this.request("POST", "/dbs", {
			id: this.database,
		});
	}

	/**
	 * Checks if a container exists in the database.
	 *
	 * @param name - The container name to check
	 * @returns True if the container exists, false otherwise
	 * @throws {CosmosError} If the check fails for reasons other than 404
	 */
	async containerExists(name: string): Promise<boolean> {
		try {
			// Use GET instead of HEAD because HEAD returns 403 Forbidden
			// instead of 404 for non-existent containers
			await this.request("GET", `/dbs/${this.database}/colls/${name}`);
			return true;
		} catch (error) {
			if (error instanceof CosmosError && error.statusCode === 404) {
				return false;
			}
			throw error;
		}
	}

	/**
	 * Gets detailed information about a container.
	 *
	 * @param name - The container name
	 * @returns Container information, or null if not found
	 * @throws {CosmosError} If the request fails for reasons other than 404
	 */
	async getContainer(name: string): Promise<ContainerInfo | null> {
		try {
			return await this.request<ContainerInfo>("GET", `/dbs/${this.database}/colls/${name}`);
		} catch (error) {
			if (error instanceof CosmosError && error.statusCode === 404) {
				return null;
			}
			throw error;
		}
	}

	/**
	 * Creates a new container in the database.
	 *
	 * @param body - Container creation configuration
	 * @throws {CosmosError} If the container already exists or creation fails
	 */
	async createContainer(body: CreateContainerBody): Promise<void> {
		await this.request("POST", `/dbs/${this.database}/colls`, body);
	}

	/**
	 * Updates an existing container's configuration.
	 *
	 * @param name - The container name
	 * @param body - Updated container configuration
	 * @throws {CosmosError} If the container doesn't exist or update fails
	 */
	async updateContainer(name: string, body: UpdateContainerBody): Promise<void> {
		await this.request("PUT", `/dbs/${this.database}/colls/${name}`, body);
	}

	/**
	 * Lists all containers in the database.
	 *
	 * @returns Array of container information
	 * @throws {CosmosError} If the request fails
	 */
	async listContainers(): Promise<ContainerListItem[]> {
		const response = await this.request<{
			DocumentCollections: ContainerListItem[];
		}>("GET", `/dbs/${this.database}/colls`);
		return response.DocumentCollections || [];
	}

	/**
	 * Deletes a container from the database.
	 *
	 * This operation is permanent and cannot be undone.
	 *
	 * @param name - The container name to delete
	 * @throws {CosmosError} If the container doesn't exist or deletion fails
	 */
	async deleteContainer(name: string): Promise<void> {
		await this.request("DELETE", `/dbs/${this.database}/colls/${name}`);
	}
}

/**
 * Detailed container information from Cosmos DB.
 */
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

/**
 * Basic container information from list operations.
 */
export interface ContainerListItem {
	id: string;
}

/**
 * Configuration for creating a new container.
 */
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

/**
 * Configuration for updating an existing container.
 *
 * Extends CreateContainerBody with additional Cosmos DB metadata fields.
 */
export interface UpdateContainerBody extends CreateContainerBody {
	_rid: string;
	_ts: number;
	_self: string;
}
