import { describe, expect, test } from "bun:test";
import {
	chunkArray,
	getPartitionKeyValue,
	isRetriableError,
	processBatchesWithConcurrency,
	retryOperation,
	sleep,
} from "../../src/operations/batch-processor";
import { CosmosError } from "../../src/errors/cosmos-error";

describe("Batch Processor Utilities", () => {
	describe("chunkArray", () => {
		test("should split array into chunks of specified size", () => {
			const array = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
			const chunks = chunkArray(array, 3);

			expect(chunks).toEqual([[1, 2, 3], [4, 5, 6], [7, 8, 9], [10]]);
		});

		test("should handle array smaller than chunk size", () => {
			const array = [1, 2];
			const chunks = chunkArray(array, 5);

			expect(chunks).toEqual([[1, 2]]);
		});

		test("should handle empty array", () => {
			const array: number[] = [];
			const chunks = chunkArray(array, 3);

			expect(chunks).toEqual([]);
		});

		test("should handle chunk size of 1", () => {
			const array = [1, 2, 3];
			const chunks = chunkArray(array, 1);

			expect(chunks).toEqual([[1], [2], [3]]);
		});
	});

	describe("processBatchesWithConcurrency", () => {
		test("should process all batches", async () => {
			const batches = [[1, 2], [3, 4], [5, 6]];
			const processed: number[] = [];

			await processBatchesWithConcurrency(batches, 2, async (batch) => {
				await sleep(10);
				processed.push(...batch);
			});

			expect(processed.sort()).toEqual([1, 2, 3, 4, 5, 6]);
		});

		test("should respect max concurrency", async () => {
			const batches = [[1], [2], [3], [4], [5]];
			let maxConcurrent = 0;
			let currentConcurrent = 0;

			await processBatchesWithConcurrency(batches, 2, async () => {
				currentConcurrent++;
				maxConcurrent = Math.max(maxConcurrent, currentConcurrent);
				await sleep(50);
				currentConcurrent--;
			});

			expect(maxConcurrent).toBeLessThanOrEqual(2);
		});

		test("should handle processor errors", async () => {
			const batches = [[1], [2], [3]];

			await expect(
				processBatchesWithConcurrency(batches, 2, async (batch) => {
					if (batch[0] === 2) {
						throw new Error("Test error");
					}
				}),
			).rejects.toThrow("Test error");
		});
	});

	describe("retryOperation", () => {
		test("should succeed on first attempt", async () => {
			let attempts = 0;
			const result = await retryOperation(
				async () => {
					attempts++;
					return "success";
				},
				3,
				10,
			);

			expect(result).toBe("success");
			expect(attempts).toBe(1);
		});

		test("should retry on retriable errors", async () => {
			let attempts = 0;
			const result = await retryOperation(
				async () => {
					attempts++;
					if (attempts < 3) {
						throw new CosmosError(429, "TooManyRequests", "Rate limited");
					}
					return "success";
				},
				3,
				10,
			);

			expect(result).toBe("success");
			expect(attempts).toBe(3);
		});

		test("should not retry on non-retriable errors", async () => {
			let attempts = 0;

			await expect(
				retryOperation(
					async () => {
						attempts++;
						throw new CosmosError(400, "BadRequest", "Invalid request");
					},
					3,
					10,
				),
			).rejects.toThrow("Invalid request");

			expect(attempts).toBe(1);
		});

		test("should give up after max retries", async () => {
			let attempts = 0;

			await expect(
				retryOperation(
					async () => {
						attempts++;
						throw new CosmosError(429, "TooManyRequests", "Rate limited");
					},
					2,
					10,
				),
			).rejects.toThrow("Rate limited");

			expect(attempts).toBe(3); // Initial + 2 retries
		});
	});

	describe("isRetriableError", () => {
		test("should identify retriable status codes", () => {
			expect(isRetriableError(new CosmosError(429, "TooManyRequests", "Rate limited"))).toBe(true);
			expect(isRetriableError(new CosmosError(449, "RetryWith", "Retry"))).toBe(true);
			expect(isRetriableError(new CosmosError(500, "InternalServerError", "Error"))).toBe(true);
			expect(isRetriableError(new CosmosError(503, "ServiceUnavailable", "Unavailable"))).toBe(true);
		});

		test("should identify non-retriable status codes", () => {
			expect(isRetriableError(new CosmosError(400, "BadRequest", "Invalid"))).toBe(false);
			expect(isRetriableError(new CosmosError(404, "NotFound", "Not found"))).toBe(false);
			expect(isRetriableError(new CosmosError(403, "Forbidden", "Forbidden"))).toBe(false);
		});

		test("should handle generic errors with statusCode property", () => {
			const error = { statusCode: 429, message: "Rate limited" };
			expect(isRetriableError(error)).toBe(true);
		});

		test("should return false for errors without statusCode", () => {
			const error = new Error("Generic error");
			expect(isRetriableError(error)).toBe(false);
		});
	});

	describe("getPartitionKeyValue", () => {
		test("should extract simple field", () => {
			const doc = { id: "123", email: "user@example.com", name: "John" };
			expect(getPartitionKeyValue(doc, "email")).toBe("user@example.com");
		});

		test("should handle leading slash", () => {
			const doc = { id: "123", email: "user@example.com" };
			expect(getPartitionKeyValue(doc, "/email")).toBe("user@example.com");
		});

		test("should extract nested field with dot notation", () => {
			const doc = { id: "123", metadata: { userId: "user-456" } };
			expect(getPartitionKeyValue(doc, "metadata.userId")).toBe("user-456");
		});

		test("should extract nested field with slash notation", () => {
			const doc = { id: "123", metadata: { userId: "user-456" } };
			expect(getPartitionKeyValue(doc, "/metadata/userId")).toBe("user-456");
		});

		test("should return undefined for missing field", () => {
			const doc = { id: "123" };
			expect(getPartitionKeyValue(doc, "email")).toBeUndefined();
		});

		test("should return undefined for null document", () => {
			expect(getPartitionKeyValue(null, "email")).toBeUndefined();
		});
	});

	describe("sleep", () => {
		test("should sleep for specified duration", async () => {
			const start = Date.now();
			await sleep(100);
			const duration = Date.now() - start;

			expect(duration).toBeGreaterThanOrEqual(90); // Allow some variance
			expect(duration).toBeLessThan(150);
		});
	});
});

