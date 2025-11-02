import { CosmosError, isCosmosError } from '../../src/errors/cosmos-error';

describe('CosmosError', () => {
  describe('constructor', () => {
    test('creates error with all properties', () => {
      const error = new CosmosError(404, 'NOT_FOUND', 'Resource not found', 1000);

      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
      expect(error.message).toBe('Resource not found');
      expect(error.retryAfter).toBe(1000);
      expect(error.name).toBe('CosmosError');
    });

    test('creates error without retryAfter', () => {
      const error = new CosmosError(500, 'SERVER_ERROR', 'Internal error');

      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('SERVER_ERROR');
      expect(error.message).toBe('Internal error');
      expect(error.retryAfter).toBeUndefined();
    });

    test('is instance of Error', () => {
      const error = new CosmosError(400, 'BAD_REQUEST', 'Invalid input');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(CosmosError);
    });

    test('has correct prototype chain', () => {
      const error = new CosmosError(429, 'RATE_LIMITED', 'Too many requests');

      expect(Object.getPrototypeOf(error)).toBe(CosmosError.prototype);
    });

    test('handles edge case status codes', () => {
      const error1 = new CosmosError(0, 'NETWORK', 'Network unreachable');
      const error2 = new CosmosError(999, 'UNKNOWN', 'Unknown status');

      expect(error1.statusCode).toBe(0);
      expect(error2.statusCode).toBe(999);
    });

    test('handles empty strings', () => {
      const error = new CosmosError(400, '', '');

      expect(error.code).toBe('');
      expect(error.message).toBe('');
    });

    test('handles special characters in message', () => {
      const message = 'Error: "test" with \'quotes\' and \nnewlines';
      const error = new CosmosError(500, 'TEST', message);

      expect(error.message).toBe(message);
    });
  });

  describe('fromResponse', () => {
    test('creates error from response with all fields', () => {
      const body = {
        code: 'CONFLICT',
        message: 'Document already exists',
        retryAfter: 500
      };

      const error = CosmosError.fromResponse(409, body);

      expect(error.statusCode).toBe(409);
      expect(error.code).toBe('CONFLICT');
      expect(error.message).toBe('Document already exists');
      expect(error.retryAfter).toBe(500);
    });

    test('handles missing code in response', () => {
      const body = {
        message: 'Something went wrong'
      };

      const error = CosmosError.fromResponse(500, body);

      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('UNKNOWN');
      expect(error.message).toBe('Something went wrong');
    });

    test('handles missing message in response', () => {
      const body = {
        code: 'ERROR'
      };

      const error = CosmosError.fromResponse(500, body);

      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('ERROR');
      expect(error.message).toBe('Unknown error');
    });

    test('handles empty response body', () => {
      const error = CosmosError.fromResponse(503, {});

      expect(error.statusCode).toBe(503);
      expect(error.code).toBe('UNKNOWN');
      expect(error.message).toBe('Unknown error');
    });

    test('handles null values in response', () => {
      const body = {
        code: null,
        message: null
      };

      const error = CosmosError.fromResponse(400, body);

      expect(error.code).toBe('UNKNOWN');
      expect(error.message).toBe('Unknown error');
    });

    test('handles response with extra fields', () => {
      const body = {
        code: 'TEST',
        message: 'Test message',
        extraField: 'ignored',
        anotherField: 123
      };

      const error = CosmosError.fromResponse(400, body);

      expect(error.code).toBe('TEST');
      expect(error.message).toBe('Test message');
    });
  });

  describe('isCosmosError', () => {
    test('returns true for CosmosError instance', () => {
      const error = new CosmosError(404, 'NOT_FOUND', 'Not found');

      expect(isCosmosError(error)).toBe(true);
    });

    test('returns false for regular Error', () => {
      const error = new Error('Regular error');

      expect(isCosmosError(error)).toBe(false);
    });

    test('returns false for null', () => {
      expect(isCosmosError(null)).toBe(false);
    });

    test('returns false for undefined', () => {
      expect(isCosmosError(undefined)).toBe(false);
    });

    test('returns false for string', () => {
      expect(isCosmosError('error string')).toBe(false);
    });

    test('returns false for number', () => {
      expect(isCosmosError(404)).toBe(false);
    });

    test('returns false for object with similar properties', () => {
      const fakeError = {
        statusCode: 404,
        code: 'NOT_FOUND',
        message: 'Not found',
        name: 'CosmosError'
      };

      expect(isCosmosError(fakeError)).toBe(false);
    });

    test('returns true for error from fromResponse', () => {
      const error = CosmosError.fromResponse(500, {
        code: 'SERVER_ERROR',
        message: 'Internal server error'
      });

      expect(isCosmosError(error)).toBe(true);
    });

    test('handles subclass instances', () => {
      class CustomCosmosError extends CosmosError {}
      const error = new CustomCosmosError(400, 'CUSTOM', 'Custom error');

      expect(isCosmosError(error)).toBe(true);
    });
  });

  describe('error handling scenarios', () => {
    test('can be thrown and caught', () => {
      expect(() => {
        throw new CosmosError(404, 'NOT_FOUND', 'Document not found');
      }).toThrow(CosmosError);
    });

    test('can be caught as Error', () => {
      expect(() => {
        throw new CosmosError(500, 'ERROR', 'Server error');
      }).toThrow(Error);
    });

    test('preserves stack trace', () => {
      const error = new CosmosError(500, 'ERROR', 'Test error');

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('CosmosError');
    });

    test('can be serialized to JSON', () => {
      const error = new CosmosError(404, 'NOT_FOUND', 'Not found', 1000);
      const json = JSON.parse(JSON.stringify(error));

      expect(json.statusCode).toBe(404);
      expect(json.code).toBe('NOT_FOUND');
      expect(json.retryAfter).toBe(1000);
      // Note: message is a non-enumerable property from Error, so it won't serialize
      // This is expected JavaScript behavior
    });
  });

  describe('common HTTP status codes', () => {
    test('handles 400 Bad Request', () => {
      const error = new CosmosError(400, 'BAD_REQUEST', 'Invalid request');
      expect(error.statusCode).toBe(400);
    });

    test('handles 401 Unauthorized', () => {
      const error = new CosmosError(401, 'UNAUTHORIZED', 'Authentication required');
      expect(error.statusCode).toBe(401);
    });

    test('handles 403 Forbidden', () => {
      const error = new CosmosError(403, 'FORBIDDEN', 'Access denied');
      expect(error.statusCode).toBe(403);
    });

    test('handles 404 Not Found', () => {
      const error = new CosmosError(404, 'NOT_FOUND', 'Resource not found');
      expect(error.statusCode).toBe(404);
    });

    test('handles 409 Conflict', () => {
      const error = new CosmosError(409, 'CONFLICT', 'Document already exists');
      expect(error.statusCode).toBe(409);
    });

    test('handles 429 Too Many Requests', () => {
      const error = new CosmosError(429, 'RATE_LIMITED', 'Rate limit exceeded', 2000);
      expect(error.statusCode).toBe(429);
      expect(error.retryAfter).toBe(2000);
    });

    test('handles 500 Internal Server Error', () => {
      const error = new CosmosError(500, 'SERVER_ERROR', 'Internal error');
      expect(error.statusCode).toBe(500);
    });

    test('handles 503 Service Unavailable', () => {
      const error = new CosmosError(503, 'UNAVAILABLE', 'Service temporarily unavailable');
      expect(error.statusCode).toBe(503);
    });
  });
});
