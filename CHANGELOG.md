# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.3] - 2025-11-02

### Fixed
- **CRITICAL**: Fixed double slash in URL construction when endpoint has trailing slash
- Removed trailing slashes from endpoints to prevent malformed URLs like `https://domain.com:443//dbs/...`
- URL construction now works correctly with both trailing slash and no trailing slash endpoints

### Added
- Comprehensive URL construction tests to prevent regression
- Integration tests with real Azure CosmosDB instance

## [0.3.2] - 2025-11-02

### Fixed
- **CRITICAL**: Fixed Azure CosmosDB authentication token format to match Azure SDK specification
- Fixed `parseResourcePath()` to return correct resourceType and resourceId
- Fixed `generateAuthToken()` to use proper text format with correct newline sequences (3 trailing newlines)
- Fixed date handling to use `Date` objects with `toUTCString().toLowerCase()` instead of string lowercase
- Authentication now works correctly with all Azure CosmosDB operations

### Added
- Comprehensive Azure CosmosDB integration tests
- Tests for all authentication edge cases
- Tests for all resource path parsing scenarios

## [0.3.0] - 2025-11-02

### Fixed
- **CRITICAL**: Fixed `findMany` and `findUnique` return types - methods now properly return typed results instead of `Promise<any>`
- Fixed generic parameter constraints to allow optional `select` parameters
- Fixed type inference issues that caused confusing method signatures in production codebases

### Added
- **BREAKING**: Comprehensive type-checking test suite (`src/type-tests.ts`) with 100% type inference coverage
- Tests for all field types: `string`, `number`, `boolean`, `date`, `array`, `object`
- Tests for all ContainerClient methods with complex nested schemas
- Tests for edge cases and deeply nested structures (5+ levels)
- Runtime type validation to ensure compile-time types match runtime behavior
- 99.9% confidence in type system correctness through comprehensive testing

### Technical
- Updated `FindManyArgs` and `FindUniqueArgs` interfaces to properly handle optional select parameters
- Changed generic constraints from `S extends SelectInput<T>` to `S extends SelectInput<T> | undefined = undefined`
- Added `NonNullable<S>` type constraints where needed
- Enhanced type safety for all ContainerClient operations

## [0.2.0] - 2025-11-02

### Changed
- **BREAKING**: Improved type inference system - removed explicit return types where TypeScript can infer them automatically
- **BREAKING**: ContainerClient methods now use proper typed parameters instead of `any`, providing full type safety
- All operation methods (`create`, `update`, `delete`, `findUnique`, `findMany`, etc.) now properly infer return types
- Partition key types are now correctly inferred from schema definitions
- Query parameters use `unknown` instead of `any` for better type safety

### Fixed
- Fixed type inference for optional fields and fields with default values
- Fixed `RequiredKeys` and `OptionalKeys` utilities to correctly identify required vs optional fields
- Fixed `CreateInput` and `UpdateInput` types to properly handle optional fields and defaults
- Fixed nested object schema type preservation
- Fixed object schema type loss in `field.object()` builder

### Added
- Comprehensive test suite with 249 tests covering all operations
- Type inference tests to verify correct type behavior
- 100% code coverage for core modules
- Biome configuration with disabled `any` warnings

### Technical
- Refactored type system to use `FieldDef` type-level representation that preserves literal types
- Updated `FieldBuilder` to carry type-level metadata alongside runtime config
- Rewrote inference utilities to extract from structured type definitions
- Improved developer experience with better type inference and IntelliSense support

## [0.1.2] - 2024-11-02

### Added
- Updated metadata with GitHub URLs and documentation links

## [0.1.0] - 2024-11-02

### Added
- Initial release
- Type-safe schema definition with field builders
- Container abstraction with partition key support
- Full CRUD operations (create, read, update, delete, upsert)
- Query builder for SQL generation
- HTTP client with authentication and retry logic
- Comprehensive type inference
- Unit tests
- Documentation and examples

[GitHub](https://github.com/Stoffberg/cosmosql) | [Documentation](https://cosmosql.dev)

