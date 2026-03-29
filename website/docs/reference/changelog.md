---
sidebar_position: 7
---

# Changelog

## v3.0 (2026-03-29)

Full alignment with Apache Spark Connect protocol (`expressions.proto`, `types.proto`, `relations.proto`).

### Expression Language

- **Lambda expressions** for higher-order functions: `x -> x + 1`, `(acc, x) -> acc + x`.
- **Star/wildcard** expressions: `*`, `asset.*`.
- **Nested value access**: `struct.field`, `map['key']`, `array[0]` — composable to arbitrary depth.
- **Inline window expressions**: `func() OVER (PARTITION BY ... ORDER BY ... ROWS BETWEEN ...)`.
- **`TRY_CAST`**: returns `NULL` on failure instead of error.
- **String concatenation** operator: `||`.
- **Null-safe equality** operator: `<=>`.
- **`RLIKE`** for regex matching.
- **Named function arguments**: `func(key => value)`.
- **Typed literals**: `DATE '2025-01-01'`, `TIMESTAMP '...'`, `TIMESTAMP_NTZ '...'`, `X'hex'`.
- **Complex literals**: `ARRAY(...)`, `MAP(...)`, `STRUCT(...)`, `NAMED_STRUCT(...)`.
- **`INTERVAL` literals**: `INTERVAL 30 DAYS`, `INTERVAL 1 YEAR 6 MONTHS`.

:::caution Breaking Change
`CAST` now follows ANSI SQL — it raises an error on failure. Pipelines using `CAST` for lenient parsing should migrate to `TRY_CAST`.
:::

### Data Types

| Type | Description |
|------|-------------|
| `byte` / `tinyint` | 8-bit signed integer |
| `short` / `smallint` | 16-bit signed integer |
| `bigint` | Alias for `long` |
| `char(n)` | Fixed-length string |
| `varchar(n)` | Variable-length string with max length |
| `timestamp_ntz` | Timestamp without timezone |
| `time` / `time(p)` | Time of day |
| `interval year to month` | Year-month interval |
| `interval day to second` | Day-time interval |
| `variant` | Semi-structured data |

### Core Functions (7 new categories, 90+ functions)

| Category | Count | Examples |
|----------|-------|---------|
| Collection | 24 | `size`, `array_contains`, `explode`, `map_keys`, `array_sort` |
| Higher-order | 9 | `transform`, `filter`, `aggregate`, `exists`, `forall` |
| Struct | 4 | `struct`, `named_struct`, `with_field`, `drop_fields` |
| JSON | 6 | `from_json`, `to_json`, `get_json_object`, `parse_json` |
| Interval / temporal | 13 | `make_interval`, `extract`, `date_trunc`, `current_time` |
| Statistical | 15 | `stddev`, `corr`, `percentile`, `skewness`, `grouping` |
| Variant | 6 | `variant_get`, `try_variant_get`, `is_variant_null` |

### New Transformations (14)

| Transform | Section | Description |
|-----------|---------|-------------|
| `offset` | 8.32 | Skip first N rows |
| `tail` | 8.33 | Return last N rows |
| `fillNa` | 8.34 | Replace NULL values |
| `dropNa` | 8.35 | Drop rows with NULLs |
| `replace` | 8.36 | Replace specific values |
| `merge` | 8.37 | MERGE INTO / upsert |
| `parse` | 8.38 | Parse JSON/CSV columns |
| `asOfJoin` | 8.39 | Temporal join |
| `lateralJoin` | 8.40 | Correlated join |
| `transpose` | 8.41 | Swap rows and columns |
| `groupingSets` | 8.42 | Arbitrary grouping sets |
| `describe` | 8.43 | Descriptive statistics |
| `crosstab` | 8.44 | Frequency cross-tabulation |
| `hint` | 8.45 | Optimizer hints |

### Enhanced Existing Transformations

- **union / intersect / except**: `byName` (match columns by name) and `allowMissingColumns` (fill missing with NULL).
- **sample**: `lowerBound` / `upperBound` (range-based sampling) and `deterministicOrder`.

---

## v2.0 (2026-03-27)

Initial formal specification. Highlights:

- RFC 2119 requirement levels, EBNF grammar, operator precedence.
- 31 transformation types covering core SQL operations, reshaping, quality, and custom components.
- SQL-like expression language with CASE, CAST, IS NULL, IN, BETWEEN, LIKE.
- SQL three-valued null semantics.
- Data quality suites with 10 check types and severity escalation.
- Pipeline metadata, asset metadata, column-level metadata.
- Exposures for downstream consumer declarations.
- Variables (`${VAR}`), secrets (`{{secrets.alias}}`), config merging.
- Streaming inputs/outputs with trigger and watermark support.
- Lifecycle hooks (pre/post execution).
- Error catalog with 30+ standardized error codes.
- `x-` extension mechanism for forward compatibility.
- JSON Schema (draft 2020-12) for document validation.
