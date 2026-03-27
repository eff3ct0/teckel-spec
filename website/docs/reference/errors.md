# Error Catalog

This page lists all error codes defined by the Teckel specification. Implementations must use these codes in diagnostic messages. Implementations may define additional codes prefixed with `E-X-` for implementation-specific errors.

> **Formal reference:** [Section 25 — Error Catalog](https://github.com/eff3ct0/teckel-spec/blob/main/spec/v2.0/teckel-spec.md#25-error-catalog) in the Teckel Specification.

---

## Schema Errors

| Code | Description |
|------|-------------|
| `E-REQ-001` | Missing required field |
| `E-LIST-001` | Empty list where NonEmptyList required |
| `E-ENUM-001` | Invalid enum value |
| `E-SCHEMA-001` | Incompatible schemas in set operation (union, intersect, except) |
| `E-SCHEMA-002` | Operation would produce empty schema (e.g., dropping all columns) |
| `E-SCHEMA-003` | Unexpected extra columns in strict schema enforce mode |
| `E-SCHEMA-004` | Missing expected columns in strict schema enforce mode |

## Naming Errors

| Code | Description |
|------|-------------|
| `E-NAME-001` | Duplicate AssetRef (two assets share the same name) |
| `E-NAME-002` | Invalid AssetRef format (must start with a letter, ASCII alphanumeric plus underscore and hyphen, 1-128 characters) |
| `E-NAME-003` | Column name collision after rename |

## Reference Errors

| Code | Description |
|------|-------------|
| `E-REF-001` | Undefined asset reference (a `from`, `left`, `right`, `sources`, `views`, `current`, `incoming`, or output `name` references an asset that does not exist) |
| `E-REF-002` | Invalid output reference (output references another output, or a transformation references an output) |
| `E-CYCLE-001` | Circular dependency detected in the asset DAG |

## Format Errors

| Code | Description |
|------|-------------|
| `E-FMT-001` | Unknown data format |
| `E-MODE-001` | Unknown write mode (expected: `error`, `overwrite`, `append`, `ignore`) |

## Transformation Errors

| Code | Description |
|------|-------------|
| `E-OP-001` | Zero or multiple operation keys in a transformation entry |
| `E-OP-002` | Unknown operation key |

## Column Errors

| Code | Description |
|------|-------------|
| `E-COL-001` | Column not found in dataset |

## Join Errors

| Code | Description |
|------|-------------|
| `E-JOIN-001` | Ambiguous column reference in join condition (use qualified references like `a.id = b.id`) |

## Aggregation Errors

| Code | Description |
|------|-------------|
| `E-AGG-001` | Non-aggregate expression in group-by output (column not in `by` list and not an aggregate function) |

## Expression Errors

| Code | Description |
|------|-------------|
| `E-EXPR-001` | Expression type mismatch (e.g., a non-boolean expression used as a filter) |

## Type Errors

| Code | Description |
|------|-------------|
| `E-TYPE-001` | Incompatible types that cannot be widened |

## I/O Errors

| Code | Description |
|------|-------------|
| `E-IO-001` | Input path not found or unreadable |
| `E-IO-002` | Output destination already exists (when using `error` write mode) |

## Substitution Errors

| Code | Description |
|------|-------------|
| `E-VAR-001` | Unresolved variable with no default value |

## Secret Errors

| Code | Description |
|------|-------------|
| `E-SECRET-001` | Unresolved secret reference |

## Hook Errors

| Code | Description |
|------|-------------|
| `E-HOOK-001` | Pre-execution hook failed (non-zero exit code) |

## Custom Component Errors

| Code | Description |
|------|-------------|
| `E-COMP-001` | Unregistered custom component |

## Quality Errors

| Code | Description |
|------|-------------|
| `E-QUALITY-001` | Assertion or quality check failed (error severity) |
| `E-QUALITY-002` | Unknown quality check type |
| `E-QUALITY-003` | Invalid threshold value (must be between 0.0 and 1.0) |
| `E-QUALITY-004` | Freshness check failed — data exceeds maxAge |
| `E-QUALITY-005` | Referential integrity check failed — values not found in reference asset |

## Metadata Errors

| Code | Description |
|------|-------------|
| `E-META-001` | Invalid owner type (expected: `technical`, `business`, `steward`) |
| `E-META-002` | Invalid maturity value (expected: `high`, `medium`, `low`, `deprecated`) |
| `E-META-003` | Invalid freshness duration (expected ISO 8601 duration) |
| `E-META-004` | Column metadata references non-existent column |

## Exposure Errors

| Code | Description |
|------|-------------|
| `E-EXPOSE-001` | Exposure `depends_on` references undefined asset |
| `E-EXPOSE-002` | Unknown exposure type |

## Version Errors

| Code | Description |
|------|-------------|
| `E-VERSION-001` | Missing or unsupported version field |
