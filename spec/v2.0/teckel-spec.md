# Teckel Specification v2.0

**Status:** Draft
**Date:** 2026-03-27
**Authors:** Rafael Fernández (eff3ct0)

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Document Structure](#2-document-structure)
3. [Naming and References](#3-naming-and-references)
4. [Input](#4-input)
5. [Output](#5-output)
6. [Transformations](#6-transformations)
   - 6.1 [Select](#61-select)
   - 6.2 [Where](#62-where)
   - 6.3 [Group By](#63-group-by)
   - 6.4 [Order By](#64-order-by)
   - 6.5 [Join](#65-join)
   - 6.6 [Union](#66-union)
   - 6.7 [Intersect](#67-intersect)
   - 6.8 [Except](#68-except)
   - 6.9 [Distinct](#69-distinct)
   - 6.10 [Limit](#610-limit)
   - 6.11 [Add Columns](#611-add-columns)
   - 6.12 [Drop Columns](#612-drop-columns)
   - 6.13 [Rename Columns](#613-rename-columns)
   - 6.14 [Cast Columns](#614-cast-columns)
   - 6.15 [Window](#615-window)
   - 6.16 [Pivot](#616-pivot)
   - 6.17 [Unpivot](#617-unpivot)
   - 6.18 [Flatten](#618-flatten)
   - 6.19 [Sample](#619-sample)
   - 6.20 [Conditional](#620-conditional)
   - 6.21 [Split](#621-split)
   - 6.22 [SQL](#622-sql)
   - 6.23 [Rollup](#623-rollup)
   - 6.24 [Cube](#624-cube)
   - 6.25 [SCD Type 2](#625-scd-type-2)
   - 6.26 [Enrich](#626-enrich)
   - 6.27 [Schema Enforce](#627-schema-enforce)
   - 6.28 [Assertion](#628-assertion)
   - 6.29 [Repartition](#629-repartition)
   - 6.30 [Coalesce](#630-coalesce)
   - 6.31 [Custom](#631-custom)
7. [Expression Language](#7-expression-language)
8. [Data Types](#8-data-types)
9. [Variable Substitution](#9-variable-substitution)
10. [Secrets](#10-secrets)
11. [Configuration](#11-configuration)
12. [Streaming](#12-streaming)
13. [Hooks](#13-hooks)
14. [Templates](#14-templates)
15. [Config Merging](#15-config-merging)
16. [Validation Rules](#16-validation-rules)
17. [Conformance](#17-conformance)

---

## 1. Introduction

Teckel is a declarative language for describing data transformation pipelines. A Teckel document is a YAML file that defines:

- **Inputs**: data sources to read from.
- **Transformations**: operations to apply on the data.
- **Outputs**: destinations to write the results.

The pipeline forms a **directed acyclic graph** (DAG) where each node is an **asset** — a named reference to either an input, a transformation result, or an output. Assets reference other assets by name, and the runtime resolves these references to build the execution plan.

This specification is **language-agnostic**. It defines the format, semantics, and expression language independently of any runtime or execution engine. Implementations MAY target Apache Spark, Apache DataFusion, DuckDB, Polars, pandas, or any other data processing framework.

### 1.1 Terminology

| Term | Definition |
|------|-----------|
| **Asset** | A named node in the pipeline DAG. Every input, transformation, and output is an asset. |
| **AssetRef** | A string identifier that uniquely names an asset within a document. |
| **Expression** | A SQL-like string that evaluates to a value, column reference, or boolean condition. |
| **Condition** | An expression that evaluates to a boolean value. |
| **Column** | A string identifying a column by name, optionally qualified with a table prefix (`table.column`). |

### 1.2 Notation

- **REQUIRED** fields MUST be present. Omitting them is a validation error.
- **OPTIONAL** fields MAY be omitted. When omitted, the documented default applies.
- `NonEmptyList[T]` denotes a YAML list with at least one element.

---

## 2. Document Structure

A Teckel document is a YAML file with the following top-level keys:

```yaml
version: "2.0"                    # OPTIONAL — spec version

config:                            # OPTIONAL — pipeline configuration
  ...

secrets:                           # OPTIONAL — secret key mappings
  ...

hooks:                             # OPTIONAL — lifecycle hooks
  ...

templates:                         # OPTIONAL — reusable templates
  ...

input:                             # REQUIRED — at least one input
  - ...

streamingInput:                    # OPTIONAL — streaming sources
  - ...

transformation:                    # OPTIONAL — transformation steps
  - ...

output:                            # REQUIRED — at least one output
  - ...

streamingOutput:                   # OPTIONAL — streaming sinks
  - ...
```

### 2.1 Processing Order

1. Variable substitution is applied to the raw YAML text.
2. Secret placeholders are resolved.
3. The YAML is parsed into the document model.
4. Config merging is applied (if multiple files).
5. Asset references are validated (no cycles, all refs resolve).
6. The DAG is built and executed in topological order.

---

## 3. Naming and References

Every asset has a **name** (its `AssetRef`). Names MUST:

- Be unique within the document across all sections (`input`, `transformation`, `output`).
- Contain only alphanumeric characters, underscores, and hyphens: `[a-zA-Z][a-zA-Z0-9_-]*`.
- Be case-sensitive.

Transformations reference upstream assets via a `from` field (or `left`/`right` for joins, `sources` for unions). The referenced name MUST resolve to an asset defined earlier in the pipeline (input or prior transformation).

Outputs reference the asset to write via their `name` field, which MUST match the `name` of an input or transformation asset.

---

## 4. Input

An input defines a data source to read.

```yaml
input:
  - name: <AssetRef>              # REQUIRED — unique asset name
    format: <string>              # REQUIRED — data format
    path: <string>                # REQUIRED — source path or URI
    options:                      # OPTIONAL — format-specific options
      <key>: <value>
```

### 4.1 Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Unique asset identifier. |
| `format` | string | Yes | Data format identifier. See [4.2](#42-formats). |
| `path` | string | Yes | File path, URI, or connection string. |
| `options` | map[string, primitive] | No | Key-value pairs for format-specific settings. |

### 4.2 Formats

Implementations MUST support at least these formats:

| Format | Description |
|--------|-------------|
| `csv` | Comma-separated values. Common options: `header`, `sep`, `encoding`, `inferSchema`. |
| `json` | JSON or JSON Lines. |
| `parquet` | Apache Parquet columnar format. |

Implementations MAY support additional formats:

| Format | Description |
|--------|-------------|
| `delta` | Delta Lake format. |
| `orc` | Apache ORC format. |
| `avro` | Apache Avro format. |
| `jdbc` | Database connection. Options: `url`, `dbtable`, `user`, `password`, `driver`. |

### 4.3 Options

Option values are **primitives**: strings, booleans, integers, or doubles. Implementations MUST handle type coercion from YAML's native types.

```yaml
options:
  header: true          # boolean
  sep: "|"              # string
  maxPartitionBytes: 128000000  # integer
```

---

## 5. Output

An output defines a data destination to write to.

```yaml
output:
  - name: <AssetRef>              # REQUIRED — references an existing asset
    format: <string>              # REQUIRED — output format
    path: <string>                # REQUIRED — destination path or URI
    mode: <string>                # OPTIONAL — write mode (default: "error")
    options:                      # OPTIONAL — format-specific options
      <key>: <value>
```

### 5.1 Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | MUST match the name of an input or transformation asset. |
| `format` | string | Yes | Output data format. Same values as input formats. |
| `path` | string | Yes | Destination path or URI. |
| `mode` | string | No | Write mode. Default: `"error"`. |
| `options` | map[string, primitive] | No | Format-specific options. |

### 5.2 Write Modes

| Mode | Description |
|------|-------------|
| `error` | Fail if the destination already exists. |
| `overwrite` | Replace existing data. |
| `append` | Add to existing data. |
| `ignore` | Do nothing if the destination already exists. |

---

## 6. Transformations

Transformations define operations on assets. Each transformation is an asset with a unique name and exactly one operation.

```yaml
transformation:
  - name: <AssetRef>
    <operation>:
      ...
```

The `<operation>` key determines the type. Only **one** operation key is allowed per transformation entry.

---

### 6.1 Select

Projects specific columns from an asset.

```yaml
- name: result
  select:
    from: <AssetRef>                    # REQUIRED
    columns:                            # REQUIRED — NonEmptyList
      - <column_or_expression>
```

Each entry in `columns` is a column name or an expression (see [Section 7](#7-expression-language)).

**Examples:**
```yaml
columns:
  - id
  - name
  - "amount * 1.1"
  - "UPPER(name) as upper_name"
```

---

### 6.2 Where

Filters rows based on a condition.

```yaml
- name: result
  where:
    from: <AssetRef>                    # REQUIRED
    filter: <condition>                 # REQUIRED
```

The `filter` value is a boolean expression. See [Section 7](#7-expression-language).

**Examples:**
```yaml
filter: "col1 > 10"
filter: "status = 'active' AND amount >= 100"
filter: "event_date IS NOT NULL"
```

---

### 6.3 Group By

Groups rows and applies aggregate functions.

```yaml
- name: result
  group:
    from: <AssetRef>                    # REQUIRED
    by:                                 # REQUIRED — NonEmptyList
      - <column>
    agg:                                # REQUIRED — NonEmptyList
      - <aggregate_expression>
```

Each entry in `agg` is an aggregate expression, optionally aliased with `as`.

**Examples:**
```yaml
agg:
  - "sum(amount)"
  - "count(1)"
  - "max(price) as max_price"
  - "avg(salary) as avg_salary"
```

---

### 6.4 Order By

Sorts rows by one or more columns.

```yaml
- name: result
  order:
    from: <AssetRef>                    # REQUIRED
    by:                                 # REQUIRED — NonEmptyList
      - <column>
    order: <Asc|Desc>                   # OPTIONAL — default: "Asc"
```

| Value | Description |
|-------|-------------|
| `Asc` | Ascending order (default). |
| `Desc` | Descending order. |

The `order` applies uniformly to all columns in `by`. For mixed ordering, implementations SHOULD support expression syntax like `col1 ASC, col2 DESC` within a single `by` entry or via SQL expressions.

---

### 6.5 Join

Joins an asset with one or more other assets.

```yaml
- name: result
  join:
    left: <AssetRef>                    # REQUIRED — left side asset
    right:                              # REQUIRED — NonEmptyList of join targets
      - name: <AssetRef>               # REQUIRED — right side asset
        type: <join_type>               # REQUIRED — join type
        on:                             # REQUIRED — join conditions
          - <condition>
```

### 6.5.1 Join Types

| Type | Description |
|------|-------------|
| `inner` | Only matching rows from both sides. |
| `left` | All rows from left, matching from right (nulls for non-matches). |
| `right` | All rows from right, matching from left (nulls for non-matches). |
| `outer` | All rows from both sides (nulls for non-matches). |
| `cross` | Cartesian product. `on` MUST be an empty list `[]`. |
| `left_semi` | Rows from left that have at least one match in right. Only left columns are returned. |
| `left_anti` | Rows from left that have no match in right. Only left columns are returned. |

### 6.5.2 Join Conditions

Each condition is an expression comparing columns from the left and right assets, using comparison operators (`==`, `!=`, `<`, `>`, `<=`, `>=`).

```yaml
on:
  - "employees.dept_id == departments.dept_id"
  - "orders.amount >= thresholds.min_amount"
```

Column references in join conditions SHOULD be qualified with the asset name to avoid ambiguity.

### 6.5.3 Multi-way Joins

Multiple joins are applied sequentially. Each entry in `right` joins against the accumulated result of previous joins.

```yaml
join:
  left: table1
  right:
    - name: table2
      type: inner
      on:
        - "table1.id == table2.t1_id"
    - name: table3
      type: left
      on:
        - "table1.id == table3.t1_id"
```

---

### 6.6 Union

Combines rows from multiple assets with compatible schemas.

```yaml
- name: result
  union:
    sources:                            # REQUIRED — NonEmptyList (min 2)
      - <AssetRef>
      - <AssetRef>
    all: <boolean>                      # OPTIONAL — default: true
```

| Field | Description |
|-------|-------------|
| `all: true` | Keep all rows including duplicates (UNION ALL). |
| `all: false` | Remove duplicate rows (UNION DISTINCT). |

All referenced assets MUST have compatible schemas (same number of columns, compatible types).

---

### 6.7 Intersect

Returns rows present in all referenced assets.

```yaml
- name: result
  intersect:
    sources:                            # REQUIRED — NonEmptyList (min 2)
      - <AssetRef>
      - <AssetRef>
    all: <boolean>                      # OPTIONAL — default: false
```

---

### 6.8 Except

Returns rows from the left asset that are not in the right asset.

```yaml
- name: result
  except:
    left: <AssetRef>                    # REQUIRED
    right: <AssetRef>                   # REQUIRED
    all: <boolean>                      # OPTIONAL — default: false
```

---

### 6.9 Distinct

Removes duplicate rows.

```yaml
- name: result
  distinct:
    from: <AssetRef>                    # REQUIRED
    columns:                            # OPTIONAL — subset of columns to consider
      - <column>
```

If `columns` is omitted, all columns are used for deduplication.

---

### 6.10 Limit

Returns at most N rows.

```yaml
- name: result
  limit:
    from: <AssetRef>                    # REQUIRED
    count: <integer>                    # REQUIRED — must be > 0
```

---

### 6.11 Add Columns

Adds one or more computed columns to an asset.

```yaml
- name: result
  addColumns:
    from: <AssetRef>                    # REQUIRED
    columns:                            # REQUIRED — NonEmptyList
      - name: <column_name>            # REQUIRED
        expression: <expression>        # REQUIRED
```

**Examples:**
```yaml
columns:
  - name: full_name
    expression: "concat(first_name, ' ', last_name)"
  - name: processed_at
    expression: "current_timestamp()"
  - name: tax
    expression: "amount * 0.21"
```

---

### 6.12 Drop Columns

Removes columns from an asset.

```yaml
- name: result
  dropColumns:
    from: <AssetRef>                    # REQUIRED
    columns:                            # REQUIRED — NonEmptyList
      - <column_name>
```

---

### 6.13 Rename Columns

Renames columns using a mapping.

```yaml
- name: result
  renameColumns:
    from: <AssetRef>                    # REQUIRED
    mappings:                           # REQUIRED — at least one entry
      <old_name>: <new_name>
```

**Example:**
```yaml
mappings:
  col1: first_column
  col2: second_column
```

---

### 6.14 Cast Columns

Changes the data type of columns.

```yaml
- name: result
  castColumns:
    from: <AssetRef>                    # REQUIRED
    columns:                            # REQUIRED — NonEmptyList
      - name: <column_name>            # REQUIRED
        targetType: <data_type>         # REQUIRED
```

See [Section 8](#8-data-types) for supported data types.

---

### 6.15 Window

Applies window functions with partitioning and ordering.

```yaml
- name: result
  window:
    from: <AssetRef>                    # REQUIRED
    partitionBy:                        # REQUIRED — NonEmptyList
      - <column>
    orderBy:                            # OPTIONAL
      - <column>
    functions:                          # REQUIRED — NonEmptyList
      - expression: <expression>        # REQUIRED — window function
        alias: <column_name>            # REQUIRED — output column name
```

**Examples:**
```yaml
functions:
  - expression: "row_number()"
    alias: row_num
  - expression: "rank()"
    alias: salary_rank
  - expression: "sum(salary)"
    alias: running_total
  - expression: "lag(value, 1)"
    alias: prev_value
```

---

### 6.16 Pivot

Rotates rows into columns.

```yaml
- name: result
  pivot:
    from: <AssetRef>                    # REQUIRED
    groupBy:                            # REQUIRED — NonEmptyList
      - <column>
    pivotColumn: <column>               # REQUIRED — column whose values become new columns
    values:                             # OPTIONAL — specific values to pivot on
      - <value>
    agg:                                # REQUIRED — NonEmptyList
      - <aggregate_expression>
```

If `values` is omitted, all distinct values of `pivotColumn` are used.

---

### 6.17 Unpivot

Rotates columns into rows (inverse of pivot).

```yaml
- name: result
  unpivot:
    from: <AssetRef>                    # REQUIRED
    ids:                                # REQUIRED — NonEmptyList — columns to keep
      - <column>
    values:                             # REQUIRED — NonEmptyList — columns to unpivot
      - <column>
    variableColumn: <string>            # REQUIRED — name for the new key column
    valueColumn: <string>               # REQUIRED — name for the new value column
```

---

### 6.18 Flatten

Flattens nested structures (e.g., JSON objects, structs) into a flat schema.

```yaml
- name: result
  flatten:
    from: <AssetRef>                    # REQUIRED
    separator: <string>                 # OPTIONAL — default: "_"
    explodeArrays: <boolean>            # OPTIONAL — default: false
```

| Field | Description |
|-------|-------------|
| `separator` | Character(s) to join parent and child field names. |
| `explodeArrays` | If `true`, array fields are exploded into multiple rows. |

---

### 6.19 Sample

Returns a random sample of rows.

```yaml
- name: result
  sample:
    from: <AssetRef>                    # REQUIRED
    fraction: <double>                  # REQUIRED — value in (0.0, 1.0]
    withReplacement: <boolean>          # OPTIONAL — default: false
    seed: <integer>                     # OPTIONAL — random seed for reproducibility
```

---

### 6.20 Conditional

Adds a column with values determined by conditional logic (equivalent to SQL `CASE WHEN`).

```yaml
- name: result
  conditional:
    from: <AssetRef>                    # REQUIRED
    outputColumn: <column_name>         # REQUIRED
    branches:                           # REQUIRED — NonEmptyList
      - condition: <condition>          # REQUIRED
        value: <expression>             # REQUIRED
    otherwise: <expression>             # OPTIONAL — default value if no branch matches
```

**Example:**
```yaml
conditional:
  from: orders
  outputColumn: size_category
  branches:
    - condition: "amount > 1000"
      value: "'large'"
    - condition: "amount > 100"
      value: "'medium'"
  otherwise: "'small'"
```

Branches are evaluated in order. The first matching condition determines the value.

---

### 6.21 Split

Splits an asset into two named outputs based on a condition.

```yaml
- name: splitResult
  split:
    from: <AssetRef>                    # REQUIRED
    condition: <condition>              # REQUIRED
    pass: <AssetRef>                    # REQUIRED — name for rows matching condition
    fail: <AssetRef>                    # REQUIRED — name for rows not matching
```

This transformation produces **two** named assets (`pass` and `fail`), both available for downstream references.

---

### 6.22 SQL

Executes a raw SQL query. The upstream asset is registered as a temporary view.

```yaml
- name: result
  sql:
    from: <AssetRef>                    # REQUIRED — registered as a temp view
    query: <string>                     # REQUIRED — SQL query
```

The `from` asset and any other assets referenced in the query MUST be registered as temporary views by the runtime. The SQL dialect is implementation-dependent.

**Example:**
```yaml
sql:
  from: customers
  query: >
    SELECT c.*, o.order_id, o.amount
    FROM customers c
    LEFT JOIN orders o ON c.id = o.customer_id
    WHERE o.amount > 100
```

---

### 6.23 Rollup

Hierarchical aggregation that produces subtotals for each combination of grouping columns, progressing from the most detailed level to the grand total.

```yaml
- name: result
  rollup:
    from: <AssetRef>                    # REQUIRED
    by:                                 # REQUIRED — NonEmptyList
      - <column>
    agg:                                # REQUIRED — NonEmptyList
      - <aggregate_expression>
```

For `by: [A, B]`, produces aggregations for: `(A, B)`, `(A)`, and `()` (grand total).

---

### 6.24 Cube

Multi-dimensional aggregation that produces subtotals for **all combinations** of grouping columns.

```yaml
- name: result
  cube:
    from: <AssetRef>                    # REQUIRED
    by:                                 # REQUIRED — NonEmptyList
      - <column>
    agg:                                # REQUIRED — NonEmptyList
      - <aggregate_expression>
```

For `by: [A, B]`, produces aggregations for: `(A, B)`, `(A)`, `(B)`, and `()` (grand total).

---

### 6.25 SCD Type 2

Slowly Changing Dimension Type 2. Tracks historical changes by maintaining validity date ranges and a current flag.

```yaml
- name: result
  scd2:
    from: <AssetRef>                    # REQUIRED
    keyColumns:                         # REQUIRED — NonEmptyList — business key
      - <column>
    trackColumns:                       # REQUIRED — NonEmptyList — columns to track changes
      - <column>
    startDateColumn: <string>           # REQUIRED — name for valid-from column
    endDateColumn: <string>             # REQUIRED — name for valid-to column
    currentFlagColumn: <string>         # REQUIRED — name for is-current column
```

The implementation MUST:
- Compare incoming records with existing records by `keyColumns`.
- When `trackColumns` values change, close the old record (set `endDateColumn`) and insert a new record with `currentFlagColumn = true`.
- New records get `startDateColumn = now`, `endDateColumn = null`, `currentFlagColumn = true`.

---

### 6.26 Enrich

Enriches records by calling an external HTTP API.

```yaml
- name: result
  enrich:
    from: <AssetRef>                    # REQUIRED
    url: <string>                       # REQUIRED — API endpoint URL
    method: <string>                    # OPTIONAL — HTTP method (default: "GET")
    keyColumn: <column>                 # REQUIRED — column whose value is sent to the API
    responseColumn: <string>            # REQUIRED — name for the response column
    headers:                            # OPTIONAL — HTTP headers
      <key>: <value>
```

The API is called once per distinct value of `keyColumn`. The response body is stored as a string in `responseColumn`.

---

### 6.27 Schema Enforce

Validates and/or evolves the schema of an asset.

```yaml
- name: result
  schemaEnforce:
    from: <AssetRef>                    # REQUIRED
    mode: <strict|evolve>               # OPTIONAL — default: "strict"
    columns:                            # REQUIRED — NonEmptyList
      - name: <column_name>            # REQUIRED
        dataType: <data_type>           # REQUIRED
        nullable: <boolean>             # OPTIONAL — default: true
        default: <expression>           # OPTIONAL — default value expression
```

| Mode | Description |
|------|-------------|
| `strict` | The asset MUST contain exactly these columns with these types. Extra columns are an error. |
| `evolve` | Missing columns are added with default values. Extra columns are preserved. |

---

### 6.28 Assertion

Validates data quality rules. Does not modify the data.

```yaml
- name: result
  assertion:
    from: <AssetRef>                    # REQUIRED
    checks:                             # REQUIRED — NonEmptyList
      - column: <column>               # OPTIONAL — column to check
        rule: <string>                  # REQUIRED — validation rule
        description: <string>           # OPTIONAL — human-readable description
    onFailure: <fail|warn|drop>         # OPTIONAL — default: "fail"
```

### 6.28.1 Built-in Rules

| Rule | Description |
|------|-------------|
| `not_null` | Column must not contain null values. |
| `unique` | Column must contain unique values. |
| Any expression | Evaluated as a boolean condition per row. |

### 6.28.2 Failure Modes

| Mode | Description |
|------|-------------|
| `fail` | Abort the pipeline with an error. |
| `warn` | Log a warning and continue. |
| `drop` | Remove rows that fail the check. |

---

### 6.29 Repartition

Changes the number of partitions, optionally by specific columns.

```yaml
- name: result
  repartition:
    from: <AssetRef>                    # REQUIRED
    numPartitions: <integer>            # REQUIRED — must be > 0
    columns:                            # OPTIONAL — partition by these columns
      - <column>
```

---

### 6.30 Coalesce

Reduces the number of partitions without a full shuffle.

```yaml
- name: result
  coalesce:
    from: <AssetRef>                    # REQUIRED
    numPartitions: <integer>            # REQUIRED — must be > 0
```

---

### 6.31 Custom

Invokes a user-registered component by name.

```yaml
- name: result
  custom:
    from: <AssetRef>                    # REQUIRED
    component: <string>                 # REQUIRED — registered component name
    options:                            # OPTIONAL
      <key>: <value>
```

Custom components are registered via the implementation's plugin/registry API. The specification does not prescribe the registration mechanism.

---

## 7. Expression Language

Expressions are SQL-like strings used in filters, column definitions, aggregations, and conditions throughout a Teckel document.

### 7.1 Column References

```
column_name                    -- unqualified
asset_name.column_name         -- qualified with asset name
```

Qualified references are REQUIRED in join conditions and RECOMMENDED whenever ambiguity is possible.

### 7.2 Literals

| Type | Syntax | Examples |
|------|--------|---------|
| String | Single quotes | `'hello'`, `'it''s'` |
| Integer | Digits | `42`, `-1`, `0` |
| Double | Digits with decimal | `3.14`, `-0.5` |
| Boolean | Keywords | `true`, `false` |
| Null | Keyword | `null` |

### 7.3 Operators

#### Comparison Operators

| Operator | Description |
|----------|-------------|
| `=` or `==` | Equal. |
| `!=` or `<>` | Not equal. |
| `<` | Less than. |
| `>` | Greater than. |
| `<=` | Less than or equal. |
| `>=` | Greater than or equal. |

#### Logical Operators

| Operator | Description |
|----------|-------------|
| `AND` | Logical AND. |
| `OR` | Logical OR. |
| `NOT` | Logical negation. |

#### Arithmetic Operators

| Operator | Description |
|----------|-------------|
| `+` | Addition. |
| `-` | Subtraction. |
| `*` | Multiplication. |
| `/` | Division. |
| `%` | Modulo. |

#### Special Operators

| Operator | Description |
|----------|-------------|
| `IS NULL` | Tests for null. |
| `IS NOT NULL` | Tests for non-null. |
| `IN (...)` | Membership test. |
| `BETWEEN ... AND ...` | Range test (inclusive). |
| `LIKE` | Pattern matching (`%` any chars, `_` single char). |

### 7.4 Functions

Implementations MUST support these core functions:

#### Aggregate Functions

| Function | Description |
|----------|-------------|
| `count(expr)` | Number of rows / non-null values. |
| `sum(expr)` | Sum of values. |
| `avg(expr)` | Average of values. |
| `min(expr)` | Minimum value. |
| `max(expr)` | Maximum value. |
| `count(1)` | Total row count. |

#### String Functions

| Function | Description |
|----------|-------------|
| `concat(expr, ...)` | Concatenate strings. |
| `upper(expr)` | Convert to uppercase. |
| `lower(expr)` | Convert to lowercase. |
| `trim(expr)` | Remove leading/trailing whitespace. |
| `length(expr)` | String length. |
| `substring(expr, start, len)` | Extract substring. |

#### Date/Time Functions

| Function | Description |
|----------|-------------|
| `current_date()` | Current date. |
| `current_timestamp()` | Current timestamp. |
| `year(expr)` | Extract year. |
| `month(expr)` | Extract month. |
| `day(expr)` | Extract day. |

#### Window Functions

| Function | Description |
|----------|-------------|
| `row_number()` | Sequential row number within partition. |
| `rank()` | Rank with gaps for ties. |
| `dense_rank()` | Rank without gaps. |
| `lag(expr, offset)` | Value from a preceding row. |
| `lead(expr, offset)` | Value from a following row. |

#### Other Functions

| Function | Description |
|----------|-------------|
| `coalesce(expr, ...)` | First non-null value. |
| `cast(expr AS type)` | Type conversion. |
| `abs(expr)` | Absolute value. |
| `round(expr, scale)` | Round to scale decimal places. |

Implementations MAY support additional functions beyond this core set.

### 7.5 Aliasing

Expressions can be aliased using `as`:

```
sum(amount) as total_amount
UPPER(name) as upper_name
```

---

## 8. Data Types

The following abstract data types are used in `castColumns`, `schemaEnforce`, and type expressions:

| Type | Description |
|------|-------------|
| `string` | Variable-length text. |
| `integer` or `int` | 32-bit signed integer. |
| `long` | 64-bit signed integer. |
| `float` | 32-bit floating point. |
| `double` | 64-bit floating point. |
| `boolean` | `true` or `false`. |
| `date` | Calendar date (no time). |
| `timestamp` | Date with time. |
| `decimal(precision, scale)` | Fixed-point decimal. |
| `binary` | Binary data. |
| `array<T>` | Array of type T. |
| `map<K, V>` | Key-value map. |
| `struct<fields...>` | Nested structure. |

Type names are case-insensitive.

---

## 9. Variable Substitution

Variables allow parameterization of Teckel documents.

### 9.1 Syntax

```
${VARIABLE_NAME}                 -- required variable
${VARIABLE_NAME:default_value}   -- variable with default
```

### 9.2 Resolution Order

1. Explicit variables map (passed by the runtime).
2. Environment variables.
3. Default value (if specified).
4. Error (if no default and variable is unresolved).

### 9.3 Scope

Variable substitution is applied to the **raw YAML text** before parsing. Variables can appear in any string value: paths, expressions, option values, etc.

**Example:**
```yaml
input:
  - name: source
    format: parquet
    path: "${INPUT_PATH}/events"

transformation:
  - name: filtered
    where:
      from: source
      filter: "${FILTER_CONDITION:1=1}"
```

---

## 10. Secrets

Secrets provide a secure mechanism for referencing sensitive values.

### 10.1 Syntax

```
{{secrets.alias_name}}
```

### 10.2 Declaration

```yaml
secrets:
  keys:
    <alias>:
      scope: <string>             # OPTIONAL — vault/scope name
      key: <string>               # REQUIRED — key name in the vault
```

### 10.3 Resolution

The runtime resolves secrets via a **SecretsProvider** interface. The mechanism is implementation-dependent (e.g., environment variables, vault services, cloud secret managers).

If a secret cannot be resolved, the pipeline MUST fail before execution.

---

## 11. Configuration

The `config` section controls pipeline-wide settings.

```yaml
config:
  backend: <string>               # OPTIONAL — execution backend hint
  cache:                          # OPTIONAL — caching configuration
    autoCacheThreshold: <integer> # OPTIONAL — auto-cache if asset has N+ consumers
    defaultStorageLevel: <string> # OPTIONAL — e.g., "MEMORY_AND_DISK"
  notifications:                  # OPTIONAL
    onSuccess:                    # OPTIONAL
      - channel: <string>        # REQUIRED — "log", "webhook", "file"
        url: <string>            # OPTIONAL — for webhook
        path: <string>           # OPTIONAL — for file
    onFailure:                    # OPTIONAL
      - ...
  components:                     # OPTIONAL — custom component registry
    readers:
      - ...
    transformers:
      - ...
    writers:
      - ...
```

All config fields are OPTIONAL. Implementations define their own defaults.

---

## 12. Streaming

Streaming inputs and outputs extend the batch model for continuous processing.

### 12.1 Streaming Input

```yaml
streamingInput:
  - name: <AssetRef>              # REQUIRED
    format: <string>              # REQUIRED — e.g., "kafka", "json"
    path: <string>                # OPTIONAL — for file-based streams
    options:                      # OPTIONAL
      <key>: <value>
    trigger: <string>             # OPTIONAL — trigger specification
```

### 12.2 Streaming Output

```yaml
streamingOutput:
  - name: <AssetRef>              # REQUIRED
    format: <string>              # REQUIRED
    path: <string>                # OPTIONAL
    options:                      # OPTIONAL
      <key>: <value>
    outputMode: <string>          # OPTIONAL — "append", "update", "complete"
    checkpointLocation: <string>  # OPTIONAL — path for state checkpointing
    trigger: <string>             # OPTIONAL
```

### 12.3 Trigger Specification

| Trigger | Description |
|---------|-------------|
| `"processingTime:<interval>"` | Micro-batch at the given interval (e.g., `"processingTime:10 seconds"`). |
| `"once"` | Process all available data once and stop. |
| `"continuous:<interval>"` | Low-latency continuous processing. |

---

## 13. Hooks

Hooks allow running external commands at pipeline lifecycle events.

```yaml
hooks:
  preExecution:                   # OPTIONAL — run before the pipeline
    - name: <string>              # REQUIRED — hook name
      command: <string>           # REQUIRED — shell command
  postExecution:                  # OPTIONAL — run after the pipeline
    - name: <string>
      command: <string>
```

Pre-execution hooks run sequentially in order. If any pre-execution hook fails (non-zero exit code), the pipeline MUST NOT start.

Post-execution hooks run after the pipeline completes (success or failure).

---

## 14. Templates

Templates define reusable configuration fragments.

```yaml
templates:
  - name: <string>                # REQUIRED — template name
    parameters:                   # REQUIRED
      <key>: <value>
```

The template mechanism is advisory in v2.0. Implementations MAY support template expansion and parameterization. A future version of this spec will formalize template semantics.

---

## 15. Config Merging

Multiple Teckel documents can be merged into a single pipeline. This enables environment-specific overrides (e.g., `pipeline.yaml` + `pipeline.dev.yaml`).

### 15.1 Merge Semantics

- Object fields are **deep-merged**: the overlay's fields override the base's, recursively.
- Array fields are **replaced** entirely by the overlay.
- Scalar values are **replaced** by the overlay.

### 15.2 Merge Order

When multiple files are provided, they are merged left to right. The rightmost file has the highest precedence.

---

## 16. Validation Rules

A conforming implementation MUST validate the following before execution:

1. **Reference integrity**: Every `AssetRef` used in `from`, `left`, `right`, `sources`, and output `name` MUST resolve to a defined asset.
2. **No cycles**: The asset dependency graph MUST be a DAG.
3. **Output references**: Outputs MUST NOT reference other outputs.
4. **Name uniqueness**: No two assets across `input`, `transformation`, and `output` MAY share the same name. (Exception: `output.name` intentionally matches an upstream asset.)
5. **Non-empty lists**: Fields annotated as `NonEmptyList` MUST contain at least one element.
6. **Type constraints**: Integer fields MUST contain integers, boolean fields MUST contain booleans, etc.

---

## 17. Conformance

### 17.1 Conformance Levels

| Level | Requirements |
|-------|-------------|
| **Core** | Sections 2–5, transformations 6.1–6.10, expression basics (7.1–7.3), data types, variable substitution, and validation rules. |
| **Extended** | Core + all remaining transformations (6.11–6.31), full expression language (7.4–7.5), secrets, configuration, hooks, and config merging. |
| **Streaming** | Extended + Section 12 (streaming inputs and outputs). |

An implementation MUST declare which conformance level it supports.

### 17.2 Implementation Notes

- Implementations MUST reject unknown top-level keys (to catch typos).
- Implementations MUST reject unknown operation keys within transformations.
- Implementations SHOULD provide clear error messages with line numbers when validation fails.
- The SQL dialect for expressions is intentionally close to ANSI SQL. Implementations MAY support engine-specific extensions but MUST document deviations.

---

## Appendix A: Complete Example

```yaml
version: "2.0"

input:
  - name: employees
    format: csv
    path: "data/csv/employees.csv"
    options:
      header: true
      sep: ","

  - name: departments
    format: csv
    path: "data/csv/departments.csv"
    options:
      header: true
      sep: ","

  - name: salaries
    format: parquet
    path: "data/parquet/salaries"

transformation:
  - name: activeDepts
    where:
      from: departments
      filter: "status = 'active'"

  - name: enriched
    join:
      left: employees
      right:
        - name: activeDepts
          type: inner
          on:
            - "employees.dept_id == activeDepts.dept_id"
        - name: salaries
          type: left
          on:
            - "employees.emp_id == salaries.emp_id"

  - name: withCategory
    conditional:
      from: enriched
      outputColumn: salary_band
      branches:
        - condition: "salary > 100000"
          value: "'senior'"
        - condition: "salary > 50000"
          value: "'mid'"
      otherwise: "'junior'"

  - name: summary
    group:
      from: withCategory
      by:
        - dept_name
        - salary_band
      agg:
        - "count(1) as headcount"
        - "avg(salary) as avg_salary"
        - "sum(salary) as total_salary"

  - name: ranked
    window:
      from: summary
      partitionBy:
        - dept_name
      orderBy:
        - total_salary
      functions:
        - expression: "rank()"
          alias: band_rank

  - name: topBands
    where:
      from: ranked
      filter: "band_rank = 1"

  - name: finalReport
    order:
      from: topBands
      by:
        - total_salary
      order: Desc

output:
  - name: finalReport
    format: parquet
    mode: overwrite
    path: "data/output/salary_report"

  - name: enriched
    format: parquet
    mode: overwrite
    path: "data/output/enriched_employees"
```

---

## Appendix B: YAML Schema (JSON Schema)

A formal JSON Schema for validating Teckel documents will be published as a separate file in future versions of this specification.

---

## Changelog

### v2.0 (2026-03-27)
- Initial formal specification.
- Codified all transformation types from the reference implementation.
- Defined expression language, data types, and conformance levels.
