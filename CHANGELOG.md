# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

