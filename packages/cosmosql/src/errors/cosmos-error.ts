export class CosmosError extends Error {
	constructor(
		public readonly statusCode: number,
		public readonly code: string,
		message: string,
		public readonly retryAfter?: number,
	) {
		super(message);
		this.name = "CosmosError";
		Object.setPrototypeOf(this, CosmosError.prototype);
	}

	static fromResponse(statusCode: number, body: any): CosmosError {
		return new CosmosError(
			statusCode,
			body.code || "UNKNOWN",
			body.message || "Unknown error",
			body.retryAfter,
		);
	}
}

export function isCosmosError(error: unknown): error is CosmosError {
	return error instanceof CosmosError;
}
