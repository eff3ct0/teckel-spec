# Transformations Overview

Teckel provides 31 transformation types for building data pipelines declaratively in YAML. Each transformation is an asset with a unique name and exactly one operation key.

> **Formal reference:** [Section 8 — Transformations](https://github.com/eff3ct0/teckel-spec/blob/main/spec/v2.0/teckel-spec.md#8-transformations) in the Teckel Specification.

```yaml
transformation:
  - name: myTransformation
    <operation_key>:
      ...
```

Every transformation entry must have exactly one operation key. Unless otherwise stated, transformations consume one upstream asset via a `from` field and produce one output dataset.

---

## Transformation Categories

### Filtering and Row Selection

| YAML Key    | Section | Description                               |
|-------------|---------|-------------------------------------------|
| `select`    | 8.1     | Project specific columns or expressions   |
| `where`     | 8.2     | Filter rows by a boolean condition        |
| `distinct`  | 8.9     | Remove duplicate rows                     |
| `limit`     | 8.10    | Return at most N rows                     |
| `sample`    | 8.19    | Return a random sample of rows            |

### Aggregation and Sorting

| YAML Key    | Section | Description                               |
|-------------|---------|-------------------------------------------|
| `group`     | 8.3     | Group rows and apply aggregate functions  |
| `orderBy`   | 8.4     | Sort rows by one or more columns          |
| `rollup`    | 8.23    | Hierarchical aggregation with subtotals   |
| `cube`      | 8.24    | Multi-dimensional aggregation (all combos)|

### Joins

| YAML Key    | Section | Description                               |
|-------------|---------|-------------------------------------------|
| `join`      | 8.5     | Join datasets (7 types including cross)   |

### Set Operations

| YAML Key    | Section | Description                               |
|-------------|---------|-------------------------------------------|
| `union`     | 8.6     | Combine rows from multiple datasets       |
| `intersect` | 8.7     | Rows present in all source datasets       |
| `except`    | 8.8     | Rows in the first source but not the second|

### Column Operations

| YAML Key        | Section | Description                           |
|-----------------|---------|---------------------------------------|
| `addColumns`    | 8.11    | Add computed columns                  |
| `dropColumns`   | 8.12    | Remove columns                        |
| `renameColumns` | 8.13    | Rename columns via a mapping          |
| `castColumns`   | 8.14    | Change column data types              |

### Window Functions

| YAML Key    | Section | Description                               |
|-------------|---------|-------------------------------------------|
| `window`    | 8.15    | Apply window functions over partitions    |

### Reshaping

| YAML Key      | Section | Description                             |
|---------------|---------|------------------------------------------|
| `pivot`       | 8.16    | Rotate rows into columns (long to wide)  |
| `unpivot`     | 8.17    | Rotate columns into rows (wide to long)  |
| `flatten`     | 8.18    | Flatten nested structures                |
| `conditional` | 8.20    | Add a column with CASE WHEN logic        |
| `split`       | 8.21    | Split dataset into two based on condition|

### Advanced

| YAML Key        | Section | Description                           |
|-----------------|---------|---------------------------------------|
| `sql`           | 8.22    | Execute a raw SQL query               |
| `scd2`          | 8.25    | Slowly Changing Dimension Type 2      |
| `enrich`        | 8.26    | Enrich records via external HTTP API  |
| `schemaEnforce` | 8.27    | Validate or evolve dataset schema     |
| `assertion`     | 8.28    | Validate data quality rules           |
| `repartition`   | 8.29    | Change partition count (with shuffle) |
| `coalesce`      | 8.30    | Reduce partitions (no full shuffle)   |
| `custom`        | 8.31    | Invoke a user-registered component    |

---

## General Rules

- Each transformation entry must have exactly **one** operation key.
- Unknown operation keys produce an error.
- The pipeline forms a DAG — execution order is determined by data dependencies, not YAML order.
- Asset names must be unique across all inputs and transformations.
