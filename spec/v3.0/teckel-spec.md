# Teckel Specification

**Version:** 3.0
**Status:** Draft
**Date:** 2026-03-29
**Authors:** Rafael Fernández (eff3ct0)

---

## Abstract

Teckel is a declarative YAML-based language for defining data transformation pipelines. A Teckel document describes a directed acyclic graph (DAG) of data assets — inputs, transformations, and outputs — that a conforming runtime executes to move and transform data between systems.

This document is the formal specification of the Teckel format. It defines the syntax, semantics, expression language, and runtime behavior that any conforming implementation MUST support, independent of programming language or execution engine.

---

## Status of This Document

This is a **Draft** specification. It is subject to change. Feedback is welcome via the [teckel-spec](https://github.com/eff3ct0/teckel-spec) repository.

---

## Table of Contents

1. [Notation and Conventions](#1-notation-and-conventions)
2. [Terminology](#2-terminology)
3. [Document Model](#3-document-model)
4. [Document Structure](#4-document-structure)
5. [Naming and Asset References](#5-naming-and-asset-references)
6. [Input](#6-input)
7. [Output](#7-output)
8. [Transformations](#8-transformations)
   - 8.1 [Select](#81-select)
   - 8.2 [Where (Filter)](#82-where-filter)
   - 8.3 [Group By](#83-group-by)
   - 8.4 [Order By](#84-order-by)
   - 8.5 [Join](#85-join)
   - 8.6 [Union](#86-union)
   - 8.7 [Intersect](#87-intersect)
   - 8.8 [Except](#88-except)
   - 8.9 [Distinct](#89-distinct)
   - 8.10 [Limit](#810-limit)
   - 8.11 [Add Columns](#811-add-columns)
   - 8.12 [Drop Columns](#812-drop-columns)
   - 8.13 [Rename Columns](#813-rename-columns)
   - 8.14 [Cast Columns](#814-cast-columns)
   - 8.15 [Window](#815-window)
   - 8.16 [Pivot](#816-pivot)
   - 8.17 [Unpivot](#817-unpivot)
   - 8.18 [Flatten](#818-flatten)
   - 8.19 [Sample](#819-sample)
   - 8.20 [Conditional](#820-conditional)
   - 8.21 [Split](#821-split)
   - 8.22 [SQL](#822-sql)
   - 8.23 [Rollup](#823-rollup)
   - 8.24 [Cube](#824-cube)
   - 8.25 [SCD Type 2](#825-scd-type-2)
   - 8.26 [Enrich](#826-enrich)
   - 8.27 [Schema Enforce](#827-schema-enforce)
   - 8.28 [Assertion](#828-assertion)
   - 8.29 [Repartition](#829-repartition)
   - 8.30 [Coalesce](#830-coalesce)
   - 8.31 [Custom](#831-custom)
   - 8.32 [Offset](#832-offset)
   - 8.33 [Tail](#833-tail)
   - 8.34 [Fill NA](#834-fill-na)
   - 8.35 [Drop NA](#835-drop-na)
   - 8.36 [Replace](#836-replace)
   - 8.37 [Merge](#837-merge)
   - 8.38 [Parse](#838-parse)
   - 8.39 [As-of Join](#839-as-of-join)
   - 8.40 [Lateral Join](#840-lateral-join)
   - 8.41 [Transpose](#841-transpose)
   - 8.42 [Grouping Sets](#842-grouping-sets)
   - 8.43 [Describe](#843-describe)
   - 8.44 [Crosstab](#844-crosstab)
   - 8.45 [Hint](#845-hint)
9. [Expression Language](#9-expression-language)
10. [Data Types](#10-data-types)
11. [Null Semantics](#11-null-semantics)
12. [Variable Substitution](#12-variable-substitution)
13. [Secrets](#13-secrets)
14. [Configuration](#14-configuration)
15. [Streaming](#15-streaming)
16. [Hooks](#16-hooks)
17. [Data Quality](#17-data-quality)
18. [Metadata](#18-metadata)
19. [Exposures](#19-exposures)
20. [Templates](#20-templates)
21. [Config Merging](#21-config-merging)
22. [Path Resolution](#22-path-resolution)
23. [Validation Rules](#23-validation-rules)
24. [Execution Model](#24-execution-model)
25. [Error Catalog](#25-error-catalog)
26. [Security Considerations](#26-security-considerations)
27. [Conformance](#27-conformance)
- [Appendix A: EBNF Grammar Summary](#appendix-a-ebnf-grammar-summary)
- [Appendix B: JSON Schema](#appendix-b-json-schema)
- [Appendix C: Complete Examples](#appendix-c-complete-examples)
- [Appendix D: Changelog](#appendix-d-changelog)

---

## 1. Notation and Conventions

### 1.1 Requirement Levels (RFC 2119)

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in [RFC 2119](https://www.ietf.org/rfc/rfc2119.txt).

### 1.2 EBNF Notation

This specification uses Extended Backus-Naur Form (EBNF) as defined in ISO/IEC 14977 for formal grammar definitions. The following conventions apply:

```
=           definition
;           termination
|           alternation
,           concatenation
[...]       optional (0 or 1)
{...}       repetition (0 or more)
(...)       grouping
"..."       terminal string (case-sensitive)
'...'       terminal string (case-sensitive)
(* ... *)   comment
? ... ?     special sequence (described in prose)
-           exception
```

### 1.3 Type Notation

Field definitions use the following type annotations:

| Notation | Meaning |
|----------|---------|
| `string` | A YAML scalar string. |
| `integer` | A YAML scalar integer. |
| `double` | A YAML scalar floating-point number. |
| `boolean` | A YAML scalar boolean (`true` or `false`). |
| `primitive` | One of: `string`, `integer`, `double`, or `boolean`. |
| `List[T]` | A YAML sequence of zero or more elements of type `T`. |
| `NonEmptyList[T]` | A YAML sequence of **one or more** elements of type `T`. |
| `Map[K, V]` | A YAML mapping from keys of type `K` to values of type `V`. |
| `T?` | An optional field; MAY be omitted. |
| `Expression` | A string conforming to the expression grammar ([Section 9](#9-expression-language)). |
| `Condition` | An `Expression` that evaluates to a boolean value. |
| `AssetRef` | A string conforming to the asset reference grammar ([Section 5](#5-naming-and-asset-references)). |

### 1.4 Presentation Convention

Each construct in this specification is presented with:

1. **Description** — prose explaining the construct's purpose and semantics.
2. **Schema** — a YAML skeleton showing the structure.
3. **Fixed-fields table** — field name, type, required/optional, default, and description.
4. **Valid example** — a conforming usage.
5. **Invalid example** — a non-conforming usage with explanation (marked with `# INVALID`).
6. **Semantics** — additional behavioral rules.

---

## 2. Terminology

| Term | Definition |
|------|-----------|
| **Asset** | A named node in the pipeline DAG. Every input, transformation, and output produces an asset. |
| **AssetRef** | A unique string identifier for an asset within a document. See [Section 5](#5-naming-and-asset-references). |
| **Pipeline** | The complete DAG described by a Teckel document, from inputs through transformations to outputs. |
| **Source asset** | An input asset or transformation asset that another asset depends on. |
| **Sink** | An output asset that writes data to an external destination. Sinks are terminal nodes in the DAG. |
| **Expression** | A string in the Teckel expression language that evaluates to a value. See [Section 9](#9-expression-language). |
| **Condition** | An expression that evaluates to a boolean. |
| **Column** | A string naming a column in a dataset, optionally qualified as `asset.column`. |
| **Dataset** | The tabular data (rows and columns) associated with an asset at runtime. |
| **Runtime** | The engine executing the pipeline (e.g., Apache Spark, DuckDB, Polars). |
| **Conforming implementation** | A runtime that satisfies the requirements in [Section 24](#24-conformance). |

---

## 3. Document Model

### 3.1 Pipeline as DAG

A Teckel document describes a **directed acyclic graph** (DAG) where:

- **Nodes** are assets (inputs, transformations, outputs).
- **Edges** represent data dependencies: an edge from asset A to asset B means B consumes the dataset produced by A.

Inputs are **source nodes** (no incoming edges). Outputs are **sink nodes** (no outgoing edges within the pipeline). Transformations are **intermediate nodes**.

### 3.2 Asset Identity

Every asset is uniquely identified by its `name` field (its AssetRef). The namespace is **flat and global** within a document — input names, transformation names, and output names all share the same namespace.

**Outputs are sinks, not assets in the reference namespace.** An output's `name` field is a **reference to** an existing input or transformation asset — it does NOT create a new asset. Other transformations MUST NOT reference an output by name.

> **Rationale:** This eliminates the ambiguity of whether outputs participate in the DAG as referenceable nodes. They are consumers only.

### 3.3 Execution Semantics

The DAG is resolved via **topological sort**. Assets with no unresolved dependencies MAY execute in any order, including in parallel. The textual order of entries in the YAML document has **no semantic significance** — only data dependencies determine execution order.

> **Note:** A conforming implementation MAY fuse, reorder, or optimize asset execution as long as the observable output is equivalent to executing each asset independently in topological order.

---

## 4. Document Structure

A Teckel document is a YAML 1.2 file with the following top-level keys:

```yaml
version: "3.0"                    # REQUIRED — spec version
pipeline: { ... }                 # OPTIONAL — pipeline-level metadata
config: { ... }                   # OPTIONAL — pipeline configuration
secrets: { ... }                  # OPTIONAL — secret key mappings
hooks: { ... }                    # OPTIONAL — lifecycle hooks
quality: [ ... ]                  # OPTIONAL — data quality check suites
templates: [ ... ]                # OPTIONAL — reusable templates
input: [ ... ]                    # REQUIRED — at least one input
streamingInput: [ ... ]           # OPTIONAL — streaming sources
transformation: [ ... ]           # OPTIONAL — transformation steps
output: [ ... ]                   # REQUIRED — at least one output
streamingOutput: [ ... ]          # OPTIONAL — streaming sinks
exposures: [ ... ]                # OPTIONAL — downstream consumers
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `version` | string | **Yes** | The Teckel spec version this document conforms to. MUST be `"2.0"` for this spec. |
| `pipeline` | PipelineMetadata | No | Pipeline-level metadata. See [Section 18](#18-metadata). |
| `config` | object | No | Pipeline-wide configuration. See [Section 14](#14-configuration). |
| `secrets` | object | No | Secret key declarations. See [Section 13](#13-secrets). |
| `hooks` | object | No | Lifecycle hooks. See [Section 16](#16-hooks). |
| `quality` | List[QualitySuite] | No | Data quality check suites. See [Section 17](#17-data-quality). |
| `templates` | List[object] | No | Reusable templates. See [Section 20](#20-templates). |
| `input` | NonEmptyList[Input] | **Yes** | Data source definitions. |
| `streamingInput` | List[StreamingInput] | No | Streaming source definitions. See [Section 15](#15-streaming). |
| `transformation` | List[Transformation] | No | Transformation definitions. |
| `output` | NonEmptyList[Output] | **Yes** | Data destination definitions. |
| `streamingOutput` | List[StreamingOutput] | No | Streaming sink definitions. See [Section 15](#15-streaming). |
| `exposures` | List[Exposure] | No | Downstream consumer declarations. See [Section 19](#19-exposures). |

**Unknown top-level keys:** A conforming implementation MUST reject documents containing top-level keys not listed above, except for keys prefixed with `x-` (extension keys). Extension keys MUST be ignored by implementations that do not recognize them.

### 4.1 Processing Pipeline

A conforming implementation MUST process a Teckel document in this order:

1. **Variable substitution** — Replace `${...}` placeholders in the raw YAML text ([Section 12](#12-variable-substitution)).
2. **Config merging** — If multiple files are provided, merge them ([Section 21](#21-config-merging)).
3. **YAML parsing** — Parse the resolved text as YAML 1.2.
4. **Secret resolution** — Resolve `{{secrets.*}}` placeholders ([Section 13](#13-secrets)).
5. **Schema validation** — Validate the document structure against this specification.
6. **Semantic validation** — Apply the rules in [Section 23](#23-validation-rules).
7. **DAG construction** — Build the asset dependency graph.
8. **Hook execution** — Run pre-execution hooks ([Section 16](#16-hooks)).
9. **Pipeline execution** — Execute the DAG ([Section 24](#24-execution-model)).
10. **Hook execution** — Run post-execution hooks.

---

## 5. Naming and Asset References

### 5.1 AssetRef Grammar

```ebnf
asset_ref = letter, { letter | digit | "_" | "-" } ;
letter    = "A" | "B" | ... | "Z" | "a" | "b" | ... | "z" ;
digit     = "0" | "1" | ... | "9" ;
```

**Constraints:**

- An AssetRef MUST start with a letter.
- An AssetRef MUST contain only ASCII letters, digits, underscores, and hyphens.
- An AssetRef MUST be between 1 and 128 characters long.
- AssetRef comparison is **case-sensitive**: `Table1` and `table1` are different assets.
- Leading and trailing whitespace is **stripped** before validation.

### 5.2 Uniqueness

Asset names MUST be unique across the `input` and `transformation` sections of a document. Output names reference existing assets and do not create new names.

The names produced by a `split` transformation's `pass` and `fail` fields also enter the namespace and MUST be unique.

**Valid:**
```yaml
input:
  - name: orders          # OK: unique
transformation:
  - name: filtered        # OK: unique
output:
  - name: filtered        # OK: references the transformation above
```

**Invalid:**
```yaml
# INVALID: duplicate name across input and transformation
input:
  - name: data
transformation:
  - name: data            # ERROR [E-NAME-001]: duplicate AssetRef "data"
```

### 5.3 Qualified Column References

Columns MAY be qualified with an asset name using dot notation:

```ebnf
column_ref       = unqualified_ref | qualified_ref ;
unqualified_ref  = identifier ;
qualified_ref    = asset_ref, ".", identifier ;
identifier       = letter, { letter | digit | "_" } ;
```

Qualified references are REQUIRED in join conditions and RECOMMENDED whenever column name ambiguity is possible.

---

## 6. Input

An input defines a data source to read.

### 6.1 Schema

```yaml
input:
  - name: <AssetRef>
    format: <string>
    path: <string>
    options:
      <key>: <primitive>
    description: <string>
    tags: [<string>]
    meta:
      <key>: <any>
    owner:
      name: <string>
      email: <string>
    columns:
      - name: <string>
        description: <string>
        tags: [<string>]
        constraints: [<string>]
```

### 6.2 Fixed Fields

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `name` | AssetRef | **Yes** | — | Unique asset identifier. |
| `format` | string | **Yes** | — | Data format identifier. See [6.3](#63-formats). |
| `path` | string | **Yes** | — | File path, URI, or connection string. See [Section 22](#22-path-resolution). |
| `options` | Map[string, primitive] | No | `{}` | Format-specific key-value options. |
| `description` | string | No | — | Human-readable description. Markdown supported. See [Section 18](#18-metadata). |
| `tags` | List[string] | No | `[]` | Classification labels. See [Section 18](#18-metadata). |
| `meta` | Map[string, any] | No | `{}` | Open key-value metadata. See [Section 18](#18-metadata). |
| `owner` | Owner | No | — | Asset-level owner override. See [Section 18](#18-metadata). |
| `columns` | List[ColumnMetadata] | No | `[]` | Column-level metadata declarations. See [Section 18.4](#184-column-level-metadata). |

### 6.3 Formats

A conforming **Core** implementation MUST support:

| Format | Description |
|--------|-------------|
| `csv` | Comma-separated values. |
| `json` | JSON or JSON Lines (newline-delimited JSON). |
| `parquet` | Apache Parquet columnar format. |

A conforming **Extended** implementation SHOULD additionally support:

| Format | Description |
|--------|-------------|
| `delta` | Delta Lake format. |
| `orc` | Apache ORC columnar format. |
| `avro` | Apache Avro serialization format. |
| `jdbc` | RDBMS connection via JDBC or equivalent driver. |

Implementations MAY support additional formats. Unknown format values MUST produce error `E-FMT-001`.

### 6.4 Common CSV Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `header` | boolean | `false` | First row contains column names. |
| `sep` | string | `","` | Field delimiter character. |
| `encoding` | string | `"UTF-8"` | Character encoding. |
| `inferSchema` | boolean | `false` | Infer column types from data. |
| `quote` | string | `"\""` | Quote character. |
| `escape` | string | `"\\"` | Escape character within quotes. |
| `nullValue` | string | `""` | String representation of null. |

Implementations MAY support additional options. Unknown options SHOULD be passed to the underlying reader; if the reader does not recognize them, behavior is implementation-defined.

### 6.5 Valid Example

```yaml
input:
  - name: employees
    format: csv
    path: "data/csv/employees.csv"
    options:
      header: true
      sep: "|"
      encoding: "UTF-8"

  - name: departments
    format: parquet
    path: "s3://bucket/departments/"
```

### 6.6 Invalid Examples

```yaml
# INVALID: missing required field "format"
input:
  - name: orders
    path: "data/orders.csv"
    # ERROR [E-REQ-001]: missing required field "format" in input "orders"
```

```yaml
# INVALID: name starts with a digit
input:
  - name: 1table
    format: csv
    path: "data/t.csv"
    # ERROR [E-NAME-002]: invalid AssetRef "1table" — must start with a letter
```

### 6.7 Semantics

- Reading an input that produces zero rows is valid. The resulting dataset has the schema but no data.
- If the path does not exist or is unreadable, the implementation MUST raise error `E-IO-001`.
- Option values are **primitives** (string, boolean, integer, double). YAML native types MUST be respected: `true` is boolean, `"true"` is string, `42` is integer, `3.14` is double.

---

## 7. Output

An output defines a data destination to write to. An output is a **sink** — it references an existing asset and writes its dataset to external storage.

### 7.1 Schema

```yaml
output:
  - name: <AssetRef>
    format: <string>
    path: <string>
    mode: <string>
    options:
      <key>: <primitive>
    description: <string>
    tags: [<string>]
    meta:
      <key>: <any>
    freshness: <string>
    maturity: <string>
```

### 7.2 Fixed Fields

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `name` | AssetRef | **Yes** | — | MUST match the name of an input or transformation asset. |
| `format` | string | **Yes** | — | Output data format. Same values as input formats. |
| `path` | string | **Yes** | — | Destination path or URI. See [Section 22](#22-path-resolution). |
| `mode` | string | No | `"error"` | Write mode. See [7.3](#73-write-modes). |
| `options` | Map[string, primitive] | No | `{}` | Format-specific key-value options. |
| `description` | string | No | — | Human-readable description. See [Section 18](#18-metadata). |
| `tags` | List[string] | No | `[]` | Classification labels. See [Section 18](#18-metadata). |
| `meta` | Map[string, any] | No | `{}` | Open key-value metadata. See [Section 18](#18-metadata). |
| `freshness` | string | No | — | Expected update frequency as ISO 8601 duration (e.g., `"PT24H"`). See [Section 18.5](#185-freshness-sla). |
| `maturity` | string | No | — | `"high"`, `"medium"`, `"low"`, or `"deprecated"`. See [Section 18.6](#186-maturity). |

### 7.3 Write Modes

| Mode | Description |
|------|-------------|
| `error` | Fail with `E-IO-002` if the destination already exists. This is the default. |
| `overwrite` | Replace existing data at the destination. |
| `append` | Add data to the existing destination. |
| `ignore` | Do nothing if the destination already exists. The write is silently skipped. |

### 7.4 Valid Example

```yaml
output:
  - name: enrichedSales
    format: parquet
    mode: overwrite
    path: "data/output/enriched_sales"

  - name: rawBackup
    format: csv
    path: "data/backup/raw.csv"
    mode: append
    options:
      header: true
      sep: ","
```

### 7.5 Invalid Examples

```yaml
# INVALID: output references a non-existent asset
output:
  - name: doesNotExist
    format: parquet
    path: "data/out"
    # ERROR [E-REF-001]: output "doesNotExist" references undefined asset
```

```yaml
# INVALID: unknown write mode
output:
  - name: myTable
    format: parquet
    mode: upsert
    path: "data/out"
    # ERROR [E-MODE-001]: unknown write mode "upsert", expected: error|overwrite|append|ignore
```

### 7.6 Semantics

- Multiple outputs MAY reference the same asset. Each output writes independently.
- Writing an empty dataset (zero rows) is valid. The behavior depends on the format (e.g., Parquet writes an empty file with schema; CSV with `header: true` writes a header-only file).
- Outputs are NOT referenceable by transformations. They are terminal nodes in the DAG.

---

## 8. Transformations

Transformations define operations on datasets. Each transformation is an asset with a unique name and exactly **one** operation key.

### 8.0 General Rules

```yaml
transformation:
  - name: <AssetRef>
    <operation_key>:
      ...
```

- Each entry MUST have exactly one operation key. If zero or more than one are present, the implementation MUST raise `E-OP-001`.
- Unknown operation keys MUST raise `E-OP-002`.
- Unless otherwise stated, all transformations consume one upstream asset via a `from` field and produce one output dataset.

---

### 8.1 Select

Projects specific columns or expressions from a dataset.

```yaml
- name: <AssetRef>
  select:
    from: <AssetRef>
    columns: <NonEmptyList[Expression]>
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `from` | AssetRef | **Yes** | — | Source asset. |
| `columns` | NonEmptyList[Expression] | **Yes** | — | Column names or expressions to include. |

Each entry in `columns` is either a bare column name or an expression (possibly aliased with `as`).

**Valid example:**
```yaml
- name: projected
  select:
    from: employees
    columns:
      - id
      - name
      - "salary * 1.1 as adjusted_salary"
      - "upper(department) as dept"
```

**Invalid example:**
```yaml
# INVALID: empty columns list
- name: empty
  select:
    from: employees
    columns: []
    # ERROR [E-LIST-001]: "columns" must contain at least one element
```

**Semantics:**
- The output dataset contains only the specified columns, in the order listed.
- If a column name does not exist in the source, the implementation MUST raise `E-COL-001`.
- Expressions MAY reference any column in the source asset.

---

### 8.2 Where (Filter)

Filters rows based on a boolean condition.

```yaml
- name: <AssetRef>
  where:
    from: <AssetRef>
    filter: <Condition>
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `from` | AssetRef | **Yes** | — | Source asset. |
| `filter` | Condition | **Yes** | — | Boolean expression. Rows where this evaluates to `true` are kept. |

**Valid example:**
```yaml
- name: activeUsers
  where:
    from: users
    filter: "status = 'active' AND created_at >= '2025-01-01'"
```

**Invalid example:**
```yaml
# INVALID: filter is not a boolean expression
- name: bad
  where:
    from: users
    filter: "upper(name)"
    # ERROR [E-EXPR-001]: filter must be a boolean expression
```

**Semantics:**
- Rows where `filter` evaluates to `NULL` are **excluded** (NULL is not truthy).
- Filtering an empty dataset produces an empty dataset.

---

### 8.3 Group By

Groups rows by one or more columns and applies aggregate functions.

```yaml
- name: <AssetRef>
  group:
    from: <AssetRef>
    by: <NonEmptyList[Column]>
    agg: <NonEmptyList[Expression]>
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `from` | AssetRef | **Yes** | — | Source asset. |
| `by` | NonEmptyList[Column] | **Yes** | — | Grouping columns. |
| `agg` | NonEmptyList[Expression] | **Yes** | — | Aggregate expressions (optionally aliased with `as`). |

**Valid example:**
```yaml
- name: salesSummary
  group:
    from: sales
    by:
      - region
      - product
    agg:
      - "sum(amount) as total"
      - "count(1) as num_sales"
      - "avg(price) as avg_price"
```

**Invalid example:**
```yaml
# INVALID: non-aggregate, non-grouped column in agg
- name: bad
  group:
    from: sales
    by: [region]
    agg:
      - "product_name"
    # ERROR [E-AGG-001]: "product_name" is not an aggregate expression
    # and is not in the "by" list
```

**Semantics:**
- The output dataset contains the `by` columns plus the `agg` result columns.
- Grouping an empty dataset produces an empty dataset (zero groups).
- `NULL` values in grouping columns form their own group (all NULLs are grouped together).
- Aggregate functions over an empty group: `count` returns `0`, `sum` returns `NULL`, `avg` returns `NULL`, `min`/`max` return `NULL`.

---

### 8.4 Order By

Sorts rows by one or more columns.

```yaml
- name: <AssetRef>
  orderBy:
    from: <AssetRef>
    columns: <NonEmptyList[SortColumn]>
```

> **Note:** The operation key is `orderBy` (not `order`) to avoid the name collision present in earlier drafts.

Each entry in `columns` is either:
- A bare column name (defaults to `asc`, `nulls last`).
- An object with explicit direction and null placement.

**Sort column object:**

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `column` | Column | **Yes** | — | Column to sort by. |
| `direction` | `"asc"` \| `"desc"` | No | `"asc"` | Sort direction. |
| `nulls` | `"first"` \| `"last"` | No | `"last"` | Null placement. |

**Valid examples:**
```yaml
# Simple: all ascending, nulls last
- name: sorted
  orderBy:
    from: employees
    columns:
      - salary
      - name

# Explicit: mixed directions and null handling
- name: ranked
  orderBy:
    from: employees
    columns:
      - column: salary
        direction: desc
        nulls: first
      - column: name
        direction: asc
```

**Invalid example:**
```yaml
# INVALID: unknown direction
- name: bad
  orderBy:
    from: data
    columns:
      - column: id
        direction: ascending
        # ERROR [E-ENUM-001]: invalid direction "ascending", expected: asc|desc
```

**Semantics:**
- Sorting is **stable**: rows with equal sort keys preserve their relative order from the input.
- Sorting an empty dataset produces an empty dataset.
- Default null ordering: `nulls last` for `asc`, `nulls last` for `desc`. This MAY be overridden per-column.

> **Note:** This differs from ANSI SQL, which defaults to `NULLS LAST` for `ASC` and `NULLS FIRST` for `DESC`. Teckel uses `NULLS LAST` for both directions for consistency and predictability across backends.

---

### 8.5 Join

Joins a dataset with one or more other datasets.

```yaml
- name: <AssetRef>
  join:
    left: <AssetRef>
    right: <NonEmptyList[JoinTarget]>
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `left` | AssetRef | **Yes** | — | Left-side asset. |
| `right` | NonEmptyList[JoinTarget] | **Yes** | — | One or more join targets. |

**JoinTarget object:**

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `name` | AssetRef | **Yes** | — | Right-side asset. |
| `type` | string | **Yes** | — | Join type. See [8.5.1](#851-join-types). |
| `on` | List[Condition] | **Yes** | — | Join conditions. MUST be `[]` for `cross` joins. |

#### 8.5.1 Join Types

| Type | Description |
|------|-------------|
| `inner` | Only rows with matches in both sides. |
| `left` | All left rows; right columns are NULL for non-matches. |
| `right` | All right rows; left columns are NULL for non-matches. |
| `outer` | All rows from both sides; NULLs for non-matches. |
| `cross` | Cartesian product. `on` MUST be `[]`. |
| `left_semi` | Left rows that have at least one match in right. Only left columns returned. |
| `left_anti` | Left rows with no match in right. Only left columns returned. |

#### 8.5.2 Join Conditions

Each condition is a boolean expression comparing columns from the left and right assets. Column references MUST be qualified with the asset name.

```yaml
on:
  - "employees.dept_id = departments.dept_id"
  - "employees.start_date >= departments.valid_from"
```

> **Note:** The equality operator in Teckel expressions is `=` (single equals), consistent with ANSI SQL. The `==` form is accepted as an alias but `=` is the canonical form.

#### 8.5.3 Multi-way Joins

Multiple entries in `right` are applied **sequentially left to right**. Each join takes the accumulated result of previous joins as its left side.

```yaml
- name: enriched
  join:
    left: orders
    right:
      - name: customers
        type: inner
        on:
          - "orders.customer_id = customers.id"
      - name: products
        type: left
        on:
          - "orders.product_id = products.id"
```

This is equivalent to: `(orders JOIN customers) LEFT JOIN products`.

#### 8.5.4 Duplicate Column Handling

When a join produces columns with the same name from both sides, the implementation MUST preserve both columns, qualified with their source asset name (`left_asset.column`, `right_asset.column`). Implementations SHOULD provide a way to disambiguate via the `select` transformation.

**Valid example:**
```yaml
- name: joined
  join:
    left: employees
    right:
      - name: departments
        type: inner
        on:
          - "employees.dept_id = departments.id"
```

**Invalid example:**
```yaml
# INVALID: unqualified column in join condition
- name: bad
  join:
    left: a
    right:
      - name: b
        type: inner
        on:
          - "id = id"
        # ERROR [E-JOIN-001]: ambiguous column "id" in join condition —
        # use qualified references (e.g., "a.id = b.id")
```

---

### 8.6 Union

Combines rows from multiple datasets.

```yaml
- name: <AssetRef>
  union:
    sources: <NonEmptyList[AssetRef]>   # minimum 2 elements
    all: <boolean>
    byName: <boolean>
    allowMissingColumns: <boolean>
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `sources` | NonEmptyList[AssetRef] | **Yes** | — | Assets to combine. MUST contain at least 2 elements. |
| `all` | boolean | No | `true` | `true` = keep duplicates (UNION ALL). `false` = remove duplicates (UNION DISTINCT). |
| `byName` | boolean | No | `false` | Match columns by name instead of position. |
| `allowMissingColumns` | boolean | No | `false` | Fill missing columns with NULL. Requires `byName: true`. |

**Schema compatibility:** All source assets MUST have the same number of columns (unless `byName: true` with `allowMissingColumns: true`). Columns are matched **positionally** (by order, not by name) unless `byName` is `true`. The output uses column names from the **first** source. Column types MUST be compatible — the implementation MUST apply implicit type widening where possible (e.g., `int` + `long` → `long`) and raise `E-SCHEMA-001` when types are incompatible.

**Valid example:**
```yaml
- name: allEvents
  union:
    sources: [webEvents, mobileEvents, apiEvents]
    all: true
```

**Valid example (byName):**
```yaml
- name: allEvents
  union:
    sources: [webEvents, mobileEvents]
    all: true
    byName: true
    allowMissingColumns: true
```

---

### 8.7 Intersect

Returns rows present in all source datasets.

```yaml
- name: <AssetRef>
  intersect:
    sources: <NonEmptyList[AssetRef]>   # minimum 2 elements
    all: <boolean>
    byName: <boolean>
    allowMissingColumns: <boolean>
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `sources` | NonEmptyList[AssetRef] | **Yes** | — | MUST contain at least 2 elements. |
| `all` | boolean | No | `false` | `true` = INTERSECT ALL. `false` = INTERSECT DISTINCT. |
| `byName` | boolean | No | `false` | Match columns by name instead of position. |
| `allowMissingColumns` | boolean | No | `false` | Fill missing columns with NULL. Requires `byName: true`. |

Schema compatibility rules are the same as [Union](#86-union).

---

### 8.8 Except

Returns rows from the first source that are not in the second.

```yaml
- name: <AssetRef>
  except:
    left: <AssetRef>
    right: <AssetRef>
    all: <boolean>
    byName: <boolean>
    allowMissingColumns: <boolean>
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `left` | AssetRef | **Yes** | — | Source dataset. |
| `right` | AssetRef | **Yes** | — | Dataset to subtract. |
| `all` | boolean | No | `false` | `true` = EXCEPT ALL. `false` = EXCEPT DISTINCT. |
| `byName` | boolean | No | `false` | Match columns by name instead of position. |
| `allowMissingColumns` | boolean | No | `false` | Fill missing columns with NULL. Requires `byName: true`. |

> **Rationale:** Except uses `left`/`right` instead of `sources` because the operation is not commutative — `A EXCEPT B ≠ B EXCEPT A`.

Schema compatibility rules are the same as [Union](#86-union).

---

### 8.9 Distinct

Removes duplicate rows.

```yaml
- name: <AssetRef>
  distinct:
    from: <AssetRef>
    columns: <List[Column]>
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `from` | AssetRef | **Yes** | — | Source asset. |
| `columns` | List[Column] | No | all columns | Subset of columns for deduplication. |

**Semantics:**
- If `columns` is omitted, all columns are used for deduplication.
- When `columns` is specified, one **arbitrary** row is kept per group. The implementation MUST NOT guarantee which row is retained. If deterministic selection is needed, use `orderBy` followed by a window function with `row_number()`.
- NULL values are considered equal for deduplication purposes.

---

### 8.10 Limit

Returns at most N rows.

```yaml
- name: <AssetRef>
  limit:
    from: <AssetRef>
    count: <integer>
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `from` | AssetRef | **Yes** | — | Source asset. |
| `count` | integer | **Yes** | — | Maximum rows. MUST be ≥ 0. |

**Semantics:**
- `count: 0` produces an empty dataset with the same schema.
- Without a preceding `orderBy`, the selected rows are **non-deterministic**.

---

### 8.11 Add Columns

Adds one or more computed columns.

```yaml
- name: <AssetRef>
  addColumns:
    from: <AssetRef>
    columns: <NonEmptyList[ColumnDef]>
```

**ColumnDef object:**

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `name` | string | **Yes** | — | Name of the new column. |
| `expression` | Expression | **Yes** | — | Expression to compute the column value. |

**Valid example:**
```yaml
- name: withDerived
  addColumns:
    from: orders
    columns:
      - name: total
        expression: "quantity * unit_price"
      - name: processed_at
        expression: "current_timestamp()"
      - name: category
        expression: "case when amount > 1000 then 'high' else 'low' end"
```

**Semantics:**
- If a column with the same name already exists, it is **replaced** (overwritten).
- Expressions MAY reference existing columns and previously added columns in the same `addColumns` list (evaluated in order).

---

### 8.12 Drop Columns

Removes columns from a dataset.

```yaml
- name: <AssetRef>
  dropColumns:
    from: <AssetRef>
    columns: <NonEmptyList[Column]>
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `from` | AssetRef | **Yes** | — | Source asset. |
| `columns` | NonEmptyList[Column] | **Yes** | — | Columns to remove. |

**Semantics:**
- If a named column does not exist, the implementation MUST raise `E-COL-001`.
- Dropping all columns is an error (`E-SCHEMA-002`).

---

### 8.13 Rename Columns

Renames columns using a mapping.

```yaml
- name: <AssetRef>
  renameColumns:
    from: <AssetRef>
    mappings: <Map[Column, string]>
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `from` | AssetRef | **Yes** | — | Source asset. |
| `mappings` | Map[Column, string] | **Yes** | — | Old name → new name mapping. MUST have at least one entry. |

**Semantics:**
- If an old name does not exist, the implementation MUST raise `E-COL-001`.
- If a new name collides with an existing (unrenamed) column, the implementation MUST raise `E-NAME-003`.

---

### 8.14 Cast Columns

Changes the data type of columns.

```yaml
- name: <AssetRef>
  castColumns:
    from: <AssetRef>
    columns: <NonEmptyList[CastDef]>
```

**CastDef object:**

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `name` | Column | **Yes** | — | Column to cast. |
| `targetType` | string | **Yes** | — | Target data type. See [Section 10](#10-data-types). |

**Semantics:**
- If a value cannot be cast (e.g., `"abc"` to `integer`), the value becomes `NULL`. The implementation MUST NOT fail the pipeline for individual cast failures. To enforce strict casting, use an `assertion` transformation.
- Type names are **case-insensitive**: `Integer`, `INTEGER`, and `integer` are equivalent.

---

### 8.15 Window

Applies window functions over partitions of the dataset.

```yaml
- name: <AssetRef>
  window:
    from: <AssetRef>
    partitionBy: <NonEmptyList[Column]>
    orderBy: <List[SortColumn]>
    frame: <FrameSpec>
    functions: <NonEmptyList[WindowFuncDef]>
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `from` | AssetRef | **Yes** | — | Source asset. |
| `partitionBy` | NonEmptyList[Column] | **Yes** | — | Partition columns. |
| `orderBy` | List[SortColumn] | No | `[]` | Sort within each partition. Same format as [8.4](#84-order-by). |
| `frame` | FrameSpec | No | see below | Window frame specification. |
| `functions` | NonEmptyList[WindowFuncDef] | **Yes** | — | Window functions to apply. |

**WindowFuncDef object:**

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `expression` | Expression | **Yes** | — | Window function expression. |
| `alias` | string | **Yes** | — | Output column name. |

**FrameSpec object:**

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `type` | `"rows"` \| `"range"` | No | `"range"` | Frame type. |
| `start` | string | No | `"unbounded preceding"` | Frame start boundary. |
| `end` | string | No | `"current row"` | Frame end boundary. |

Frame boundary values:
- `"unbounded preceding"` — from the beginning of the partition.
- `"N preceding"` — N rows/values before current.
- `"current row"` — the current row.
- `"N following"` — N rows/values after current.
- `"unbounded following"` — to the end of the partition.

**Default frame:** When `orderBy` is specified: `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`. When `orderBy` is omitted: the entire partition (`RANGE BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING`).

**Valid example:**
```yaml
- name: withRanking
  window:
    from: employees
    partitionBy: [department]
    orderBy:
      - column: salary
        direction: desc
    frame:
      type: rows
      start: "unbounded preceding"
      end: "current row"
    functions:
      - expression: "row_number()"
        alias: rank
      - expression: "sum(salary)"
        alias: running_total
      - expression: "lag(salary, 1)"
        alias: prev_salary
```

---

### 8.16 Pivot

Rotates rows into columns (long → wide).

```yaml
- name: <AssetRef>
  pivot:
    from: <AssetRef>
    groupBy: <NonEmptyList[Column]>
    pivotColumn: <Column>
    values: <List[string]>
    agg: <NonEmptyList[Expression]>
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `from` | AssetRef | **Yes** | — | Source asset. |
| `groupBy` | NonEmptyList[Column] | **Yes** | — | Columns to group by. |
| `pivotColumn` | Column | **Yes** | — | Column whose distinct values become new columns. |
| `values` | List[string] | No | all distinct | Specific values to pivot on. If omitted, all distinct values are used. |
| `agg` | NonEmptyList[Expression] | **Yes** | — | Aggregate expressions applied per pivot value. |

**Valid example:**
```yaml
- name: salesPivot
  pivot:
    from: sales
    groupBy: [region]
    pivotColumn: product
    values: ["A", "B", "C"]
    agg:
      - "sum(amount)"
```

---

### 8.17 Unpivot

Rotates columns into rows (wide → long).

```yaml
- name: <AssetRef>
  unpivot:
    from: <AssetRef>
    ids: <NonEmptyList[Column]>
    values: <NonEmptyList[Column]>
    variableColumn: <string>
    valueColumn: <string>
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `from` | AssetRef | **Yes** | — | Source asset. |
| `ids` | NonEmptyList[Column] | **Yes** | — | Columns to keep as identifiers. |
| `values` | NonEmptyList[Column] | **Yes** | — | Columns to unpivot into rows. |
| `variableColumn` | string | **Yes** | — | Name for the new column holding the original column names. |
| `valueColumn` | string | **Yes** | — | Name for the new column holding the values. |

---

### 8.18 Flatten

Flattens nested structures into a flat schema.

```yaml
- name: <AssetRef>
  flatten:
    from: <AssetRef>
    separator: <string>
    explodeArrays: <boolean>
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `from` | AssetRef | **Yes** | — | Source asset. |
| `separator` | string | No | `"_"` | Separator between parent and child field names. |
| `explodeArrays` | boolean | No | `false` | If `true`, array fields produce multiple rows (one per element). |

**Semantics:**
- Nested struct `address.city` becomes `address_city` (with default separator).
- If `explodeArrays` is `true`, a row with an array of N elements produces N rows. If the array is empty, the row is dropped. If the array is NULL, the row is dropped.
- Flattening is recursive — nested structs within nested structs are flattened completely.

---

### 8.19 Sample

Returns a random sample of rows.

```yaml
- name: <AssetRef>
  sample:
    from: <AssetRef>
    fraction: <double>
    withReplacement: <boolean>
    seed: <integer>
    lowerBound: <double>
    upperBound: <double>
    deterministicOrder: <boolean>
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `from` | AssetRef | **Yes** | — | Source asset. |
| `fraction` | double | Conditional | — | Sampling fraction in `(0.0, 1.0]`. |
| `withReplacement` | boolean | No | `false` | Sample with replacement. |
| `seed` | integer | No | (random) | Random seed for reproducibility. |
| `lowerBound` | double | No | `0.0` | Lower bound of sampling range `[0.0, 1.0)`. Alternative to `fraction`. |
| `upperBound` | double | No | — | Upper bound of sampling range `(0.0, 1.0]`. Alternative to `fraction`. |
| `deterministicOrder` | boolean | No | `false` | If `true`, output maintains deterministic ordering. |

**Semantics:**
- Either `fraction` OR (`lowerBound` + `upperBound`) MUST be provided, not both.

---

### 8.20 Conditional

Adds a column with values determined by conditional logic (SQL `CASE WHEN`).

```yaml
- name: <AssetRef>
  conditional:
    from: <AssetRef>
    outputColumn: <string>
    branches: <NonEmptyList[Branch]>
    otherwise: <Expression>
```

**Branch object:**

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `condition` | Condition | **Yes** | — | Boolean condition. |
| `value` | Expression | **Yes** | — | Value if condition is true. |

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `from` | AssetRef | **Yes** | — | Source asset. |
| `outputColumn` | string | **Yes** | — | Name for the new column. |
| `branches` | NonEmptyList[Branch] | **Yes** | — | Conditions evaluated in order. |
| `otherwise` | Expression | No | `NULL` | Default value if no branch matches. |

**Semantics:**
- Branches are evaluated **in order**. The first matching condition determines the value.
- If no branch matches and `otherwise` is omitted, the value is `NULL`.

**Valid example:**
```yaml
- name: categorized
  conditional:
    from: orders
    outputColumn: size
    branches:
      - condition: "amount > 1000"
        value: "'large'"
      - condition: "amount > 100"
        value: "'medium'"
    otherwise: "'small'"
```

---

### 8.21 Split

Splits a dataset into two named assets based on a condition.

```yaml
- name: <AssetRef>
  split:
    from: <AssetRef>
    condition: <Condition>
    pass: <AssetRef>
    fail: <AssetRef>
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `from` | AssetRef | **Yes** | — | Source asset. |
| `condition` | Condition | **Yes** | — | Boolean condition. |
| `pass` | AssetRef | **Yes** | — | Name for the asset containing rows where condition is `true`. |
| `fail` | AssetRef | **Yes** | — | Name for the asset containing rows where condition is `false` or `NULL`. |

**Semantics:**
- The `name` of the split transformation itself is **not** a referenceable asset. Only `pass` and `fail` are referenceable.
- `pass` and `fail` names MUST follow AssetRef rules and MUST be unique in the document namespace.
- Rows where `condition` evaluates to `NULL` go to `fail`.

**Valid example:**
```yaml
- name: splitByStatus
  split:
    from: apiResults
    condition: "status_code = 200"
    pass: successRecords
    fail: failedRecords

# downstream can reference both:
- name: successSummary
  group:
    from: successRecords
    by: [endpoint]
    agg: ["count(1) as calls"]
```

---

### 8.22 SQL

Executes a raw SQL query.

```yaml
- name: <AssetRef>
  sql:
    query: <string>
    views: <NonEmptyList[AssetRef]>
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `query` | string | **Yes** | — | SQL query string. |
| `views` | NonEmptyList[AssetRef] | **Yes** | — | Assets to register as temporary views before executing the query. |

> **Note:** The `from` field from the earlier draft is replaced by `views` to make explicit which assets are available to the SQL query. This removes the ambiguity about which assets get registered.

**Valid example:**
```yaml
- name: customerOrders
  sql:
    views: [customers, orders]
    query: >
      SELECT c.name, o.order_id, o.amount
      FROM customers c
      LEFT JOIN orders o ON c.id = o.customer_id
      WHERE o.amount > 100
```

**Semantics:**
- All assets listed in `views` MUST be registered as temporary views with their asset name as the view name.
- The SQL dialect is **implementation-defined**. Implementations MUST document which SQL dialect they support.
- The query MUST return a tabular result (rows and columns).

---

### 8.23 Rollup

Hierarchical aggregation producing subtotals.

```yaml
- name: <AssetRef>
  rollup:
    from: <AssetRef>
    by: <NonEmptyList[Column]>
    agg: <NonEmptyList[Expression]>
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `from` | AssetRef | **Yes** | — | Source asset. |
| `by` | NonEmptyList[Column] | **Yes** | — | Grouping columns (order matters). |
| `agg` | NonEmptyList[Expression] | **Yes** | — | Aggregate expressions. |

**Semantics:**
- For `by: [A, B, C]`, produces aggregation groups for: `(A, B, C)`, `(A, B)`, `(A)`, and `()` (grand total).
- Non-grouped columns in subtotal rows are `NULL`.

---

### 8.24 Cube

Multi-dimensional aggregation producing all combination subtotals.

```yaml
- name: <AssetRef>
  cube:
    from: <AssetRef>
    by: <NonEmptyList[Column]>
    agg: <NonEmptyList[Expression]>
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `from` | AssetRef | **Yes** | — | Source asset. |
| `by` | NonEmptyList[Column] | **Yes** | — | Grouping columns. |
| `agg` | NonEmptyList[Expression] | **Yes** | — | Aggregate expressions. |

**Semantics:**
- For `by: [A, B]`, produces aggregation groups for: `(A, B)`, `(A)`, `(B)`, and `()` (grand total).

---

### 8.25 SCD Type 2

Slowly Changing Dimension Type 2 — tracks historical changes to dimension records.

```yaml
- name: <AssetRef>
  scd2:
    current: <AssetRef>
    incoming: <AssetRef>
    keyColumns: <NonEmptyList[Column]>
    trackColumns: <NonEmptyList[Column]>
    startDateColumn: <string>
    endDateColumn: <string>
    currentFlagColumn: <string>
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `current` | AssetRef | **Yes** | — | The existing dimension table (previous state). |
| `incoming` | AssetRef | **Yes** | — | New/updated records to merge. |
| `keyColumns` | NonEmptyList[Column] | **Yes** | — | Business key columns for matching records. |
| `trackColumns` | NonEmptyList[Column] | **Yes** | — | Columns to track for changes. |
| `startDateColumn` | string | **Yes** | — | Name for the valid-from timestamp column. |
| `endDateColumn` | string | **Yes** | — | Name for the valid-to timestamp column. |
| `currentFlagColumn` | string | **Yes** | — | Name for the is-current boolean column. |

> **Note:** This transformation takes **two** inputs (`current` and `incoming`) rather than a single `from`, making the data flow explicit.

**Semantics:**
1. Match `incoming` records to `current` records by `keyColumns`.
2. For matched records where any `trackColumns` value has changed:
   - Close the existing record: set `endDateColumn` to the current timestamp, `currentFlagColumn` to `false`.
   - Insert a new record from `incoming` with `startDateColumn` = current timestamp, `endDateColumn` = `NULL`, `currentFlagColumn` = `true`.
3. For matched records with no changes: no modification.
4. For new records (no match in `current`): insert with `startDateColumn` = current timestamp, `endDateColumn` = `NULL`, `currentFlagColumn` = `true`.
5. The output is the full dimension table (all historical + current records).

**Valid example:**
```yaml
- name: customerDim
  scd2:
    current: existingCustomers
    incoming: newCustomerData
    keyColumns: [customer_id]
    trackColumns: [name, email, address]
    startDateColumn: valid_from
    endDateColumn: valid_to
    currentFlagColumn: is_current
```

---

### 8.26 Enrich

Enriches records by calling an external HTTP API.

```yaml
- name: <AssetRef>
  enrich:
    from: <AssetRef>
    url: <string>
    method: <string>
    keyColumn: <Column>
    responseColumn: <string>
    headers: <Map[string, string]>
    onError: <string>
    timeout: <integer>
    maxRetries: <integer>
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `from` | AssetRef | **Yes** | — | Source asset. |
| `url` | string | **Yes** | — | API endpoint URL. MAY contain `${keyColumn}` placeholder. |
| `method` | string | No | `"GET"` | HTTP method. |
| `keyColumn` | Column | **Yes** | — | Column whose value is sent to the API. |
| `responseColumn` | string | **Yes** | — | Name for the column holding the API response. |
| `headers` | Map[string, string] | No | `{}` | HTTP request headers. |
| `onError` | string | No | `"null"` | Error handling: `"null"` (set response to NULL), `"fail"` (abort pipeline), `"skip"` (drop the row). |
| `timeout` | integer | No | `30000` | Request timeout in milliseconds. |
| `maxRetries` | integer | No | `3` | Maximum retry attempts for transient failures (5xx, timeout). |

**Semantics:**
- The API is called once per **distinct** value of `keyColumn`. Results are cached and reused for duplicate keys.
- The response body is stored as a `string` in `responseColumn`.
- HTTP 4xx responses are **not** retried. HTTP 5xx and timeouts are retried up to `maxRetries` times with exponential backoff.

---

### 8.27 Schema Enforce

Validates and/or evolves the schema of a dataset.

```yaml
- name: <AssetRef>
  schemaEnforce:
    from: <AssetRef>
    mode: <string>
    columns: <NonEmptyList[SchemaColumn]>
```

**SchemaColumn object:**

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `name` | Column | **Yes** | — | Column name. |
| `dataType` | string | **Yes** | — | Expected data type. See [Section 10](#10-data-types). |
| `nullable` | boolean | No | `true` | Whether NULL values are allowed. |
| `default` | Expression | No | — | Default value expression for missing columns (evolve mode only). |

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `from` | AssetRef | **Yes** | — | Source asset. |
| `mode` | string | No | `"strict"` | Enforcement mode. |
| `columns` | NonEmptyList[SchemaColumn] | **Yes** | — | Expected schema. |

**Modes:**

| Mode | Extra columns | Missing columns | Type mismatch |
|------|---------------|-----------------|---------------|
| `strict` | Error `E-SCHEMA-003` | Error `E-SCHEMA-004` | Attempt cast; NULL on failure |
| `evolve` | Preserved | Added with `default` (or NULL if no default) | Attempt cast; NULL on failure |

---

### 8.28 Assertion

Validates data quality rules without modifying the dataset.

```yaml
- name: <AssetRef>
  assertion:
    from: <AssetRef>
    checks: <NonEmptyList[Check]>
    onFailure: <string>
```

**Check object:**

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `column` | Column | No | — | Column to check. Required for column-level rules. |
| `rule` | string | **Yes** | — | Validation rule. See [8.28.1](#8281-built-in-rules). |
| `description` | string | No | — | Human-readable description of the check. |

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `from` | AssetRef | **Yes** | — | Source asset. |
| `checks` | NonEmptyList[Check] | **Yes** | — | Quality checks. |
| `onFailure` | string | No | `"fail"` | Failure handling mode. |

#### 8.28.1 Built-in Rules

| Rule | Requires `column` | Description |
|------|-------------------|-------------|
| `not_null` | Yes | Column MUST NOT contain NULL values. |
| `unique` | Yes | Column MUST contain unique values. |
| Any Condition | No | Evaluated as a boolean per row. Rows returning `false` or `NULL` fail. |

#### 8.28.2 Failure Modes

| Mode | Description |
|------|-------------|
| `fail` | Abort the pipeline with error `E-QUALITY-001`. Log failing rows. |
| `warn` | Log a warning with failing row count. Continue pipeline. Output is unchanged. |
| `drop` | Remove rows that fail any check. Log dropped row count. |

---

### 8.29 Repartition

Changes the number of partitions (with shuffle).

```yaml
- name: <AssetRef>
  repartition:
    from: <AssetRef>
    numPartitions: <integer>
    columns: <List[Column]>
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `from` | AssetRef | **Yes** | — | Source asset. |
| `numPartitions` | integer | **Yes** | — | Target partition count. MUST be > 0. |
| `columns` | List[Column] | No | `[]` | Columns to hash-partition by. If empty, round-robin partitioning. |

---

### 8.30 Coalesce

Reduces the number of partitions without a full shuffle.

```yaml
- name: <AssetRef>
  coalesce:
    from: <AssetRef>
    numPartitions: <integer>
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `from` | AssetRef | **Yes** | — | Source asset. |
| `numPartitions` | integer | **Yes** | — | Target partition count. MUST be > 0 and ≤ current partition count. |

---

### 8.31 Custom

Invokes a user-registered component.

```yaml
- name: <AssetRef>
  custom:
    from: <AssetRef>
    component: <string>
    options: <Map[string, string]>
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `from` | AssetRef | **Yes** | — | Source asset. |
| `component` | string | **Yes** | — | Registered component identifier. |
| `options` | Map[string, string] | No | `{}` | Component-specific options. |

**Interface contract:** A custom component MUST:
1. Accept a single tabular dataset as input.
2. Accept a string-to-string options map.
3. Return a single tabular dataset as output.

The registration mechanism is implementation-defined. The component identifier MUST be registered before the pipeline executes; otherwise, the implementation MUST raise `E-COMP-001`.

---

### 8.32 Offset

Skips the first N rows.

```yaml
- name: <AssetRef>
  offset:
    from: <AssetRef>
    count: <integer>
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `from` | AssetRef | **Yes** | — | Source asset. |
| `count` | integer | **Yes** | — | Rows to skip. MUST be ≥ 0. |

**Semantics:**
- `count: 0` is a no-op.
- Without a preceding `orderBy`, skipped rows are **non-deterministic**.

---

### 8.33 Tail

Returns the last N rows.

```yaml
- name: <AssetRef>
  tail:
    from: <AssetRef>
    count: <integer>
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `from` | AssetRef | **Yes** | — | Source asset. |
| `count` | integer | **Yes** | — | Maximum rows from the end. MUST be ≥ 0. |

**Semantics:**
- `count: 0` produces an empty dataset with the same schema.
- Requires materializing the entire input (performance consideration).

---

### 8.34 Fill NA

Replaces NULL values in specified columns.

```yaml
- name: <AssetRef>
  fillNa:
    from: <AssetRef>
    columns: <List[Column]>
    value: <primitive>
    values: <Map[Column, primitive]>
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `from` | AssetRef | **Yes** | — | Source asset. |
| `columns` | List[Column] | No | all | Columns to fill. |
| `value` | primitive | Conditional | — | Single fill value for all target columns. |
| `values` | Map[Column, primitive] | Conditional | — | Per-column fill values. |

Exactly one of `value` or `values` MUST be provided. Providing both or neither MUST raise `E-OP-004`.

**Valid example:**
```yaml
- name: filled
  fillNa:
    from: users
    values:
      name: "unknown"
      age: 0
      active: false
```

---

### 8.35 Drop NA

Drops rows with NULL values.

```yaml
- name: <AssetRef>
  dropNa:
    from: <AssetRef>
    columns: <List[Column]>
    how: <string>
    minNonNulls: <integer>
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `from` | AssetRef | **Yes** | — | Source asset. |
| `columns` | List[Column] | No | all | Columns to check. |
| `how` | `"any"` \| `"all"` | No | `"any"` | Drop if any/all target columns are NULL. |
| `minNonNulls` | integer | No | — | Keep row only if ≥ N non-NULL values. Overrides `how`. |

**Valid example:**
```yaml
- name: complete
  dropNa:
    from: data
    how: any
    columns: [name, email]
```

---

### 8.36 Replace

Replaces specific values in specified columns.

```yaml
- name: <AssetRef>
  replace:
    from: <AssetRef>
    columns: <List[Column]>
    mappings: <NonEmptyList[Replacement]>
```

**Replacement object:**

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `old` | primitive | **Yes** | — | Value to match. |
| `new` | primitive | **Yes** | — | Replacement value. |

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `from` | AssetRef | **Yes** | — | Source asset. |
| `columns` | List[Column] | No | all | Columns to apply replacements. |
| `mappings` | NonEmptyList[Replacement] | **Yes** | — | Old → new value pairs. |

**Valid example:**
```yaml
- name: cleaned
  replace:
    from: data
    columns: [status]
    mappings:
      - old: "N/A"
        new: "unknown"
      - old: ""
        new: "unknown"
```

---

### 8.37 Merge

Performs a MERGE (upsert) operation combining INSERT, UPDATE, and DELETE actions on matched/unmatched rows.

```yaml
- name: <AssetRef>
  merge:
    target: <AssetRef>
    source: <AssetRef>
    on: <NonEmptyList[Condition]>
    whenMatched: <List[MergeAction]>
    whenNotMatched: <List[MergeAction]>
    whenNotMatchedBySource: <List[MergeAction]>
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `target` | AssetRef | **Yes** | — | Target asset to modify. |
| `source` | AssetRef | **Yes** | — | Source asset with new/updated data. |
| `on` | NonEmptyList[Condition] | **Yes** | — | Match conditions. |
| `whenMatched` | List[MergeAction] | No | `[]` | Actions for matched rows. |
| `whenNotMatched` | List[MergeAction] | No | `[]` | Actions for source rows not in target. |
| `whenNotMatchedBySource` | List[MergeAction] | No | `[]` | Actions for target rows not in source. |

**MergeAction object:**

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `action` | `"update"` \| `"insert"` \| `"delete"` | **Yes** | — | Action type. |
| `condition` | Condition | No | — | Additional condition for this action. |
| `set` | Map[Column, Expression] | Conditional | — | Column assignments. Required for `update`/`insert` unless `star` is `true`. |
| `star` | boolean | No | `false` | Use all columns from source (INSERT * / UPDATE *). |

> **Note:** This transformation takes **two** inputs (`target` and `source`) rather than a single `from`, similar to `scd2`.

**Valid example:**
```yaml
- name: mergedCustomers
  merge:
    target: existingCustomers
    source: newData
    on:
      - "existingCustomers.id = newData.id"
    whenMatched:
      - action: update
        condition: "existingCustomers.updated_at < newData.updated_at"
        set:
          name: "newData.name"
          email: "newData.email"
          updated_at: "current_timestamp()"
    whenNotMatched:
      - action: insert
        star: true
```

**Semantics:**
- Actions within each `when*` clause are evaluated in order; the first matching condition wins.
- At most one action per row is executed.
- The output is the full target dataset after all actions have been applied.

---

### 8.38 Parse

Parses string columns containing structured data (CSV, JSON) into typed columns.

```yaml
- name: <AssetRef>
  parse:
    from: <AssetRef>
    column: <Column>
    format: <string>
    schema: <List[SchemaColumn]>
    options: <Map[string, string]>
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `from` | AssetRef | **Yes** | — | Source asset. |
| `column` | Column | **Yes** | — | String column to parse. |
| `format` | `"json"` \| `"csv"` | **Yes** | — | Parse format. |
| `schema` | List[SchemaColumn] | No | (inferred) | Expected schema for parsed data. Same format as `schemaEnforce` columns. |
| `options` | Map[string, string] | No | `{}` | Format-specific options (e.g., `delimiter`, `header`). |

**Valid example:**
```yaml
- name: parsedEvents
  parse:
    from: rawLogs
    column: payload
    format: json
    schema:
      - name: event_type
        dataType: string
      - name: timestamp
        dataType: timestamp
      - name: metadata
        dataType: "map<string, string>"
```

**Semantics:**
- The parsed column is replaced by the structured result columns.
- Malformed values produce NULL for the affected fields.
- If `schema` is omitted, the implementation SHOULD attempt schema inference.

---

### 8.39 As-of Join

Temporal join matching each left row with the closest right row by an ordered column.

```yaml
- name: <AssetRef>
  asOfJoin:
    left: <AssetRef>
    right: <AssetRef>
    leftAsOf: <Column>
    rightAsOf: <Column>
    on: <List[Condition]>
    type: <string>
    direction: <string>
    tolerance: <Expression>
    allowExactMatches: <boolean>
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `left` | AssetRef | **Yes** | — | Left asset. |
| `right` | AssetRef | **Yes** | — | Right asset. |
| `leftAsOf` | Column | **Yes** | — | Left temporal/ordered column. |
| `rightAsOf` | Column | **Yes** | — | Right temporal/ordered column. |
| `on` | List[Condition] | No | `[]` | Additional equi-join conditions. |
| `type` | `"inner"` \| `"left"` | No | `"left"` | Join type. |
| `direction` | `"backward"` \| `"forward"` \| `"nearest"` | No | `"backward"` | Match direction. |
| `tolerance` | Expression | No | — | Maximum allowed distance between as-of values. |
| `allowExactMatches` | boolean | No | `true` | Whether exact matches are included. |

**Directions:**
- `backward` — match the latest right row where `rightAsOf <= leftAsOf`.
- `forward` — match the earliest right row where `rightAsOf >= leftAsOf`.
- `nearest` — match the closest right row by absolute distance.

**Valid example:**
```yaml
- name: tradeWithQuote
  asOfJoin:
    left: trades
    right: quotes
    leftAsOf: trade_time
    rightAsOf: quote_time
    on:
      - "trades.symbol = quotes.symbol"
    direction: backward
    tolerance: "INTERVAL 5 MINUTES"
```

---

### 8.40 Lateral Join

Correlated join where the right side may reference columns from the left side.

```yaml
- name: <AssetRef>
  lateralJoin:
    left: <AssetRef>
    right: <AssetRef>
    type: <string>
    on: <List[Condition]>
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `left` | AssetRef | **Yes** | — | Left asset. |
| `right` | AssetRef | **Yes** | — | Right asset (may reference left columns). |
| `type` | `"inner"` \| `"left"` \| `"cross"` | No | `"inner"` | Join type. |
| `on` | List[Condition] | No | `[]` | Additional join condition. |

---

### 8.41 Transpose

Transposes a dataset, swapping rows and columns.

```yaml
- name: <AssetRef>
  transpose:
    from: <AssetRef>
    indexColumns: <List[Column]>
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `from` | AssetRef | **Yes** | — | Source asset. |
| `indexColumns` | List[Column] | No | `[]` | Columns to preserve as row index. |

**Semantics:**
- Non-index columns become rows; original rows become columns.
- All non-index columns MUST have compatible types.
- If `indexColumns` is empty, all rows are transposed with auto-generated column names.

---

### 8.42 Grouping Sets

Aggregation with arbitrary grouping column combinations.

```yaml
- name: <AssetRef>
  groupingSets:
    from: <AssetRef>
    sets: <NonEmptyList[List[Column]]>
    agg: <NonEmptyList[Expression]>
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `from` | AssetRef | **Yes** | — | Source asset. |
| `sets` | NonEmptyList[List[Column]] | **Yes** | — | List of grouping column sets. |
| `agg` | NonEmptyList[Expression] | **Yes** | — | Aggregate expressions. |

**Valid example:**
```yaml
- name: salesReport
  groupingSets:
    from: sales
    sets:
      - [region, product]
      - [region]
      - [product]
      - []
    agg:
      - "sum(amount) as total"
      - "count(1) as cnt"
```

**Semantics:**
- For `sets: [[A, B], [A], []]`, produces aggregation groups for `(A, B)`, `(A)`, and `()` (grand total).
- Non-grouped columns in subtotal rows are `NULL`.
- Use `grouping(col)` function to distinguish real NULLs from grouping NULLs.

---

### 8.43 Describe

Computes descriptive statistics for numeric columns.

```yaml
- name: <AssetRef>
  describe:
    from: <AssetRef>
    columns: <List[Column]>
    statistics: <List[string]>
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `from` | AssetRef | **Yes** | — | Source asset. |
| `columns` | List[Column] | No | all numeric | Columns to describe. |
| `statistics` | List[string] | No | all | Statistics to compute: `count`, `mean`, `stddev`, `min`, `max`, `25%`, `50%`, `75%`. |

**Semantics:**
- Output has one row per statistic, one column per input column, plus a `summary` column naming the statistic.

---

### 8.44 Crosstab

Computes a frequency cross-tabulation (contingency table) of two columns.

```yaml
- name: <AssetRef>
  crosstab:
    from: <AssetRef>
    col1: <Column>
    col2: <Column>
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `from` | AssetRef | **Yes** | — | Source asset. |
| `col1` | Column | **Yes** | — | Row dimension column. |
| `col2` | Column | **Yes** | — | Column dimension column. |

**Semantics:**
- Output has `col1` values as rows, `col2` distinct values as columns, and counts as values.

---

### 8.45 Hint

Provides optimizer hints to the execution engine.

```yaml
- name: <AssetRef>
  hint:
    from: <AssetRef>
    hints: <NonEmptyList[HintSpec]>
```

**HintSpec object:**

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `name` | string | **Yes** | — | Hint name (e.g., `broadcast`, `shuffle_hash`, `coalesce`). |
| `parameters` | List[Expression] | No | `[]` | Hint parameters. |

**Semantics:**
- Hints are **advisory** — implementations that do not recognize a hint MUST ignore it with a warning (not an error).
- Common hints: `broadcast`, `merge`, `shuffle_hash`, `shuffle_replicate_nl`, `coalesce`, `repartition`, `rebalance`.

**Valid example:**
```yaml
- name: hintedProducts
  hint:
    from: products
    hints:
      - name: broadcast
```

---

## 9. Expression Language

Teckel uses a SQL-like expression language for filters, column definitions, aggregations, conditions, and computed values.

### 9.1 EBNF Grammar

```ebnf
(* Top-level expression *)
expression     = or_expr, [ "as", identifier ] ;

(* Logical operators — lowest precedence *)
or_expr        = and_expr, { "OR", and_expr } ;
and_expr       = not_expr, { "AND", not_expr } ;
not_expr       = [ "NOT" ], comparison ;

(* Comparison *)
comparison     = addition, [ comp_op, addition ]
               | addition, "IS", [ "NOT" ], "NULL"
               | addition, [ "NOT" ], "IN", "(", expression_list, ")"
               | addition, [ "NOT" ], "BETWEEN", addition, "AND", addition
               | addition, [ "NOT" ], "LIKE", string_literal
               | addition, [ "NOT" ], "RLIKE", string_literal ;

comp_op        = "=" | "!=" | "<>" | "<" | ">" | "<=" | ">=" | "<=>" ;

(* String concatenation and arithmetic *)
addition       = multiplication, { ( "+" | "-" | "||" ), multiplication } ;
multiplication = unary, { ( "*" | "/" | "%" ), unary } ;
unary          = [ "-" | "~" ], postfix ;

(* Postfix: subscript and field access *)
postfix        = primary, { ".", identifier | "[", expression, "]" } ;

(* Primary expressions *)
primary        = literal
               | column_ref
               | star_expr
               | function_call
               | lambda_expr
               | case_expr
               | cast_expr
               | window_expr
               | "(", expression, ")" ;

(* Star / wildcard *)
star_expr      = [ identifier, "." ], "*" ;

(* Literals *)
literal        = string_literal | integer_literal | double_literal
               | boolean_literal | null_literal
               | typed_literal | complex_literal ;

string_literal  = "'", { any_char - "'" | "''" }, "'" ;
integer_literal = [ "-" ], digit, { digit } ;
double_literal  = [ "-" ], digit, { digit }, ".", digit, { digit } ;
boolean_literal = "true" | "false" ;
null_literal    = "NULL" | "null" ;

(* Typed literals *)
typed_literal  = "DATE", string_literal
               | "TIMESTAMP", string_literal
               | "TIMESTAMP_NTZ", string_literal
               | "X", string_literal
               | interval_literal ;

interval_literal = "INTERVAL", interval_value, interval_unit,
                   { interval_value, interval_unit } ;
interval_value   = [ "-" ], digit, { digit }, [ ".", digit, { digit } ] ;
interval_unit    = "YEAR" | "YEARS" | "MONTH" | "MONTHS"
                 | "DAY" | "DAYS" | "HOUR" | "HOURS"
                 | "MINUTE" | "MINUTES" | "SECOND" | "SECONDS" ;

(* Complex literals *)
complex_literal = "ARRAY", "(", [ expression_list ], ")"
                | "MAP", "(", [ expression, ",", expression,
                    { ",", expression, ",", expression } ], ")"
                | "STRUCT", "(", [ expression_list ], ")"
                | "NAMED_STRUCT", "(", [ string_literal, ",", expression,
                    { ",", string_literal, ",", expression } ], ")" ;

(* Column reference *)
column_ref     = identifier, [ ".", identifier ] ;

(* Function call *)
function_call  = identifier, "(", [ function_args ], ")" ;
function_args  = [ "DISTINCT" ], arg_list ;
arg_list       = argument, { ",", argument } ;
argument       = named_argument | expression ;
named_argument = identifier, "=>", expression ;
expression_list = expression, { ",", expression } ;

(* Lambda expression *)
lambda_expr    = lambda_params, "->", expression ;
lambda_params  = identifier | "(", identifier, { ",", identifier }, ")" ;

(* CASE expression *)
case_expr      = "CASE", { "WHEN", expression, "THEN", expression },
                 [ "ELSE", expression ], "END" ;

(* CAST expression *)
cast_expr      = "CAST", "(", expression, "AS", type_name, ")"
               | "TRY_CAST", "(", expression, "AS", type_name, ")" ;

(* Window expression *)
window_expr    = function_call, "OVER", "(", window_spec, ")" ;
window_spec    = [ "PARTITION", "BY", expression_list ],
                 [ "ORDER", "BY", sort_list ],
                 [ frame_clause ] ;
sort_list      = sort_item, { ",", sort_item } ;
sort_item      = expression, [ "ASC" | "DESC" ], [ "NULLS", ( "FIRST" | "LAST" ) ] ;
frame_clause   = ( "ROWS" | "RANGE" ), "BETWEEN", frame_bound, "AND", frame_bound ;
frame_bound    = "UNBOUNDED", "PRECEDING"
               | "UNBOUNDED", "FOLLOWING"
               | "CURRENT", "ROW"
               | expression, "PRECEDING"
               | expression, "FOLLOWING" ;

(* Identifiers *)
identifier     = letter, { letter | digit | "_" }
               | "`", { any_char - "`" }, "`" ;

(* Type name for CAST *)
type_name      = simple_type | parameterized_type ;
simple_type    = "string" | "byte" | "tinyint" | "short" | "smallint"
               | "integer" | "int" | "long" | "bigint" | "float"
               | "double" | "boolean" | "date" | "timestamp"
               | "timestamp_ntz" | "binary" | "variant" | "time" ;
parameterized_type = "decimal", "(", integer_literal, ",", integer_literal, ")"
                   | "char", "(", integer_literal, ")"
                   | "varchar", "(", integer_literal, ")"
                   | "time", "(", integer_literal, ")"
                   | "array", "<", type_name, ">"
                   | "map", "<", type_name, ",", type_name, ">"
                   | "struct", "<", struct_fields, ">"
                   | "interval", interval_qualifier ;
struct_fields  = struct_field, { ",", struct_field } ;
struct_field   = identifier, ":", type_name ;
interval_qualifier = "year", [ "to", "month" ]
                   | "month"
                   | "day", [ "to", ( "hour" | "minute" | "second" ) ]
                   | "hour", [ "to", ( "minute" | "second" ) ]
                   | "minute", [ "to", "second" ]
                   | "second" ;
```

### 9.2 Operator Precedence

From **highest** to **lowest** precedence:

| Precedence | Operator | Associativity | Description |
|------------|----------|---------------|-------------|
| 1 | `()`, function calls, `OVER` | — | Grouping, function application, window |
| 2 | `.`, `[]` | Left | Field access, subscript |
| 3 | unary `-`, `~` | Right | Negation, bitwise NOT |
| 4 | `*`, `/`, `%` | Left | Multiplication, division, modulo |
| 5 | `+`, `-`, `\|\|` | Left | Addition, subtraction, string concatenation |
| 6 | `=`, `!=`, `<>`, `<=>`, `<`, `>`, `<=`, `>=`, `IS`, `IN`, `BETWEEN`, `LIKE`, `RLIKE` | — | Comparison |
| 7 | `NOT` | Right | Logical negation |
| 8 | `AND` | Left | Logical conjunction |
| 9 | `OR` | Left | Logical disjunction |
| 10 | `as` | — | Aliasing (lowest) |
| 11 | `->` | Right | Lambda definition (lowest) |

**Example:** `NOT a AND b OR c` parses as `((NOT a) AND b) OR c`.

### 9.3 Canonical Equality Operator

The canonical equality operator is `=` (single equals), consistent with ANSI SQL. The form `==` is accepted as an alias and MUST be treated identically to `=`. Implementations SHOULD prefer `=` in generated output.

#### 9.3.1 Null-safe Equality Operator

The `<=>` operator is the null-safe equality operator. Unlike `=`, it returns `true` when both operands are NULL, and `false` (not NULL) when exactly one operand is NULL.

```
NULL <=> NULL     → true
NULL <=> 1        → false
1 <=> 1           → true
1 <=> 2           → false
```

### 9.4 String Literals

String literals are delimited by single quotes. A literal single quote within a string is escaped by doubling: `''`.

```
'hello'          → hello
'it''s'          → it's
''               → (empty string)
```

Special characters (newlines, tabs, etc.) have no escape sequences in the expression language. If needed, use function calls (e.g., `char(10)` for newline). This is because Teckel expressions are embedded in YAML strings, which provide their own escaping mechanisms.

### 9.5 Backtick-Quoted Identifiers

Identifiers containing special characters (spaces, dots, hyphens, reserved words) MUST be quoted with backticks:

```
`my column`
`order`           (* "order" is a reserved word *)
`table.name`      (* literal dot in column name, not a qualified reference *)
```

### 9.6 String Concatenation Operator

The `||` operator concatenates two values as strings. Non-string operands are implicitly cast to string.

```
'hello' || ' ' || 'world'    → 'hello world'
name || ' (' || id || ')'    → 'Alice (42)'
```

If either operand is NULL, the result is NULL.

### 9.7 Nested Value Access

Expressions support accessing nested values in structs, maps, and arrays:

| Syntax | Description |
|--------|-------------|
| `expr.field` | Access a struct field by name |
| `expr[key]` | Access a map value by key, or an array element by 0-based index |

Access is composable to arbitrary depth:

```
address.city                  → struct field
metadata['source']            → map value by key
items[0]                      → first array element
orders[0].items[0].price      → nested combination
```

**Semantics:**
- Struct field access on a non-existent field MUST raise `E-EXPR-006`.
- Map access with a non-existent key returns `NULL`.
- Array access with an out-of-bounds index returns `NULL`.
- Any access on a `NULL` value returns `NULL`.

### 9.8 Lambda Expressions

Lambda expressions define inline functions for use with higher-order functions:

```
x -> x + 1                       → single parameter
(x, y) -> x + y                  → multiple parameters
(acc, x) -> acc + x              → accumulator pattern
```

Lambdas are valid only as arguments to higher-order functions. They MUST NOT appear as standalone expressions.

### 9.9 Named Arguments

Function calls MAY use named arguments with the `=>` operator:

```
substring(str => name, pos => 1, len => 3)
date_format(created_at, format => 'yyyy-MM-dd')
```

**Rules:**
- Positional arguments MUST precede named arguments.
- Positional after named is an error (`E-EXPR-002`).
- Duplicate named arguments are an error (`E-EXPR-003`).

### 9.10 Inline Window Expressions

Window functions MAY be used inline with the `OVER` clause in any expression context:

```
row_number() OVER (PARTITION BY department ORDER BY salary DESC)
sum(salary) OVER (PARTITION BY department ORDER BY hire_date ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)
lag(salary, 1) OVER (PARTITION BY department ORDER BY hire_date)
```

The inline window expression follows the SQL standard `OVER` clause syntax. The dedicated `window` transformation (Section 8.15) remains as a convenience for applying multiple window functions with the same partitioning specification.

### 9.11 TRY_CAST

`TRY_CAST` is a variant of `CAST` that returns `NULL` instead of raising an error when the cast fails:

| Syntax | On Failure |
|--------|-----------|
| `CAST(expr AS type)` | Raises `E-TYPE-001` |
| `TRY_CAST(expr AS type)` | Returns `NULL` |

```
CAST('abc' AS integer)      → ERROR E-TYPE-001
TRY_CAST('abc' AS integer)  → NULL
TRY_CAST('42' AS integer)   → 42
```

> **Migration note:** Teckel v2.0's `CAST` used TRY semantics (NULL on failure). In v3.0, `CAST` follows ANSI SQL (error on failure). Existing pipelines using CAST for lenient parsing should migrate to `TRY_CAST`.

### 9.12 RLIKE (Regex Match)

The `RLIKE` operator tests whether a string matches a regular expression:

```
name RLIKE '^A.*'            → true if name starts with 'A'
email NOT RLIKE '.*@.*'      → true if email has no '@'
```

The regex syntax is implementation-defined (typically Java/PCRE). Implementations MUST document which regex flavor they support.

### 9.13 Core Functions

A conforming implementation MUST support these functions:

#### 9.13.1 Aggregate Functions

| Function | Return Type | Description |
|----------|-------------|-------------|
| `count(expr)` | integer | Count of non-NULL values. |
| `count(*)` | integer | Total row count. |
| `count(DISTINCT expr)` | integer | Count of distinct non-NULL values. |
| `sum(expr)` | same as input | Sum. NULL if all inputs are NULL. |
| `avg(expr)` | double | Average. NULL if all inputs are NULL. |
| `min(expr)` | same as input | Minimum. NULL if all inputs are NULL. |
| `max(expr)` | same as input | Maximum. NULL if all inputs are NULL. |

#### 9.13.2 String Functions

| Function | Return Type | Description |
|----------|-------------|-------------|
| `concat(expr, ...)` | string | Concatenate. NULL if any argument is NULL. |
| `upper(expr)` | string | Convert to uppercase. |
| `lower(expr)` | string | Convert to lowercase. |
| `trim(expr)` | string | Remove leading/trailing whitespace. |
| `ltrim(expr)` | string | Remove leading whitespace. |
| `rtrim(expr)` | string | Remove trailing whitespace. |
| `length(expr)` | integer | String length in characters. |
| `substring(expr, start, len)` | string | Extract substring. 1-indexed. |
| `replace(expr, search, replacement)` | string | Replace all occurrences. |

> **Note:** The `coalesce` function is listed under [Conditional Functions (9.13.6)](#9136-conditional-functions).

#### 9.13.3 Numeric Functions

| Function | Return Type | Description |
|----------|-------------|-------------|
| `abs(expr)` | same as input | Absolute value. |
| `round(expr, scale)` | same as input | Round to `scale` decimal places. |
| `floor(expr)` | same as input | Round down to nearest integer. |
| `ceil(expr)` | same as input | Round up to nearest integer. |
| `power(base, exp)` | double | Exponentiation. |
| `sqrt(expr)` | double | Square root. |
| `mod(expr, divisor)` | same as input | Modulo (same as `%`). |

#### 9.13.4 Date/Time Functions

| Function | Return Type | Description |
|----------|-------------|-------------|
| `current_date()` | date | Current date. |
| `current_timestamp()` | timestamp | Current timestamp. |
| `year(expr)` | integer | Extract year. |
| `month(expr)` | integer | Extract month (1-12). |
| `day(expr)` | integer | Extract day of month (1-31). |
| `hour(expr)` | integer | Extract hour (0-23). |
| `minute(expr)` | integer | Extract minute (0-59). |
| `second(expr)` | integer | Extract second (0-59). |
| `date_add(date, days)` | date | Add days to a date. |
| `date_diff(end, start)` | integer | Days between two dates. |
| `to_date(expr, format)` | date | Parse string to date. |
| `to_timestamp(expr, format)` | timestamp | Parse string to timestamp. |

#### 9.13.5 Window Functions

| Function | Return Type | Description |
|----------|-------------|-------------|
| `row_number()` | integer | Sequential row number within partition (1-based). |
| `rank()` | integer | Rank with gaps for ties. |
| `dense_rank()` | integer | Rank without gaps. |
| `lag(expr, offset)` | same as input | Value from `offset` rows before. NULL if out of range. |
| `lead(expr, offset)` | same as input | Value from `offset` rows after. NULL if out of range. |
| `first_value(expr)` | same as input | First value in the window frame. |
| `last_value(expr)` | same as input | Last value in the window frame. |
| `ntile(n)` | integer | Distribute rows into `n` buckets. |

#### 9.13.6 Conditional Functions

| Function | Return Type | Description |
|----------|-------------|-------------|
| `coalesce(expr, ...)` | varies | First non-NULL argument. |
| `nullif(expr1, expr2)` | same as expr1 | NULL if expr1 = expr2, else expr1. |
| `ifnull(expr, default)` | varies | `default` if expr is NULL, else expr. Alias for `coalesce(expr, default)`. |

#### 9.13.7 Collection Functions

| Function | Return Type | Description |
|----------|-------------|-------------|
| `size(expr)` | integer | Number of elements in array or entries in map. |
| `array_contains(array, value)` | boolean | True if array contains the value. |
| `element_at(array_or_map, key)` | varies | Element at index (array, 0-based) or key (map). |
| `explode(expr)` | rows | Expands array/map into multiple rows. |
| `explode_outer(expr)` | rows | Like `explode`, but preserves NULL/empty as a single row with NULLs. |
| `posexplode(expr)` | rows | Like `explode`, but also produces a position column. |
| `flatten(array)` | array | Flattens a nested array by one level. |
| `array_distinct(array)` | array | Removes duplicates from an array. |
| `array_sort(array)` | array | Sorts array elements in ascending order. |
| `array_union(array1, array2)` | array | Returns the union of two arrays (no duplicates). |
| `array_intersect(array1, array2)` | array | Returns elements common to both arrays. |
| `array_except(array1, array2)` | array | Returns elements in array1 but not in array2. |
| `array_join(array, delimiter)` | string | Concatenates array elements with a delimiter. |
| `array_position(array, element)` | integer | Returns 1-based position of element (0 if not found). |
| `array_remove(array, element)` | array | Removes all occurrences of element from array. |
| `array_repeat(element, count)` | array | Creates an array repeating element count times. |
| `arrays_zip(array1, array2, ...)` | array | Merges arrays into an array of structs. |
| `array_compact(array)` | array | Removes NULL elements from an array. |
| `map_keys(map)` | array | Returns an array of the map's keys. |
| `map_values(map)` | array | Returns an array of the map's values. |
| `map_concat(map1, map2, ...)` | map | Merges multiple maps. Later keys overwrite earlier. |
| `map_from_arrays(keys, values)` | map | Creates a map from an array of keys and an array of values. |
| `map_from_entries(array)` | map | Creates a map from an array of key-value struct entries. |
| `map_entries(map)` | array | Returns an array of key-value struct entries. |

#### 9.13.8 Higher-Order Functions

Higher-order functions accept lambda expressions as arguments. See [Section 9.8](#98-lambda-expressions).

| Function | Return Type | Description |
|----------|-------------|-------------|
| `transform(array, func)` | array | Apply function to each element. |
| `filter(array, func)` | array | Keep elements matching predicate. |
| `aggregate(array, zero, merge)` | varies | Reduce array to single value. |
| `exists(array, func)` | boolean | True if any element matches predicate. |
| `forall(array, func)` | boolean | True if all elements match predicate. |
| `transform_keys(map, func)` | map | Apply function to each key. Lambda receives `(key, value)`. |
| `transform_values(map, func)` | map | Apply function to each value. Lambda receives `(key, value)`. |
| `map_filter(map, func)` | map | Keep entries matching predicate. Lambda receives `(key, value)`. |
| `zip_with(array1, array2, func)` | array | Merge two arrays element-wise using function. |

#### 9.13.9 Struct Functions

| Function | Return Type | Description |
|----------|-------------|-------------|
| `struct(expr, ...)` | struct | Creates a struct from positional values. |
| `named_struct(name, val, ...)` | struct | Creates a struct with named fields. |
| `with_field(struct, name, value)` | struct | Adds or replaces a field in a struct. |
| `drop_fields(struct, name, ...)` | struct | Removes one or more fields from a struct. |

#### 9.13.10 JSON Functions

| Function | Return Type | Description |
|----------|-------------|-------------|
| `from_json(string, schema)` | struct | Parse JSON string into a struct. |
| `to_json(expr)` | string | Convert struct/array/map to JSON string. |
| `get_json_object(string, path)` | string | Extract value from JSON string by JSONPath. |
| `json_tuple(string, key, ...)` | tuple | Extract multiple values from JSON string. |
| `schema_of_json(string)` | string | Infer schema of a JSON string as DDL. |
| `parse_json(string)` | variant | Parse JSON string to variant type. |

#### 9.13.11 Interval and Temporal Functions

| Function | Return Type | Description |
|----------|-------------|-------------|
| `make_interval(years, months, weeks, days, hours, mins, secs)` | interval | Construct a calendar interval. All parameters optional, default 0. |
| `make_ym_interval(years, months)` | interval year to month | Construct a year-month interval. |
| `make_dt_interval(days, hours, mins, secs)` | interval day to second | Construct a day-time interval. |
| `extract(field FROM expr)` | integer | Extract field from date/timestamp/interval. Fields: `YEAR`, `MONTH`, `DAY`, `HOUR`, `MINUTE`, `SECOND`, `DAYOFWEEK`, `DAYOFYEAR`, `QUARTER`, `WEEK`. |
| `date_trunc(unit, expr)` | timestamp | Truncate timestamp to specified unit. |
| `months_between(end, start)` | double | Number of months between two dates. |
| `add_months(date, n)` | date | Add N months to a date. |
| `last_day(date)` | date | Last day of the month for the given date. |
| `next_day(date, dayOfWeek)` | date | Next occurrence of the given day of week. |
| `current_timestamp_ntz()` | timestamp_ntz | Current local timestamp without timezone. |
| `to_timestamp_ntz(expr, format)` | timestamp_ntz | Parse string to timestamp without timezone. |
| `current_time()` | time | Current time of day. |
| `make_time(hour, min, sec)` | time | Construct time from components. |

#### 9.13.12 Statistical Aggregate Functions

| Function | Return Type | Description |
|----------|-------------|-------------|
| `stddev(expr)` | double | Sample standard deviation. Alias for `stddev_samp`. |
| `stddev_samp(expr)` | double | Sample standard deviation. |
| `stddev_pop(expr)` | double | Population standard deviation. |
| `variance(expr)` | double | Sample variance. Alias for `var_samp`. |
| `var_samp(expr)` | double | Sample variance. |
| `var_pop(expr)` | double | Population variance. |
| `corr(expr1, expr2)` | double | Pearson correlation coefficient. |
| `covar_samp(expr1, expr2)` | double | Sample covariance. |
| `covar_pop(expr1, expr2)` | double | Population covariance. |
| `skewness(expr)` | double | Skewness. |
| `kurtosis(expr)` | double | Excess kurtosis. |
| `percentile(expr, p)` | double | Exact percentile (p in [0, 1]). |
| `percentile_approx(expr, p, accuracy)` | double | Approximate percentile. `accuracy` defaults to 10000. |
| `grouping(expr)` | integer | Returns 1 if the column is aggregated in a grouping set, 0 otherwise. |
| `grouping_id(expr, ...)` | integer | Bitmask of grouping columns. |

#### 9.13.13 Variant Functions

| Function | Return Type | Description |
|----------|-------------|-------------|
| `parse_json(string)` | variant | Parse JSON string to variant. |
| `to_json(variant)` | string | Convert variant to JSON string. |
| `variant_get(variant, path, type)` | typed | Extract and cast value from variant by JSONPath. |
| `try_variant_get(variant, path, type)` | typed | Like `variant_get`, returns NULL on failure. |
| `is_variant_null(variant)` | boolean | True if variant value is JSON null. |
| `schema_of_variant(variant)` | string | Infer schema of variant as DDL string. |

Implementations MAY support additional functions beyond this core set. Additional functions SHOULD be documented by the implementation.

### 9.14 Nested Function Calls

Function calls MAY be nested to arbitrary depth:

```
upper(trim(concat(first_name, ' ', last_name)))
```

### 9.15 CASE Expression

The `CASE` expression MAY be used inline within any expression context:

```
CASE WHEN amount > 1000 THEN 'high' WHEN amount > 100 THEN 'medium' ELSE 'low' END
```

---

## 10. Data Types

### 10.1 Type System

| Type | Description | Example Values |
|------|-------------|----------------|
| `string` | Variable-length UTF-8 text. | `'hello'`, `''` |
| `byte` or `tinyint` | 8-bit signed integer. | `-128`, `127` |
| `short` or `smallint` | 16-bit signed integer. | `-32768`, `32767` |
| `integer` or `int` | 32-bit signed integer. | `42`, `-1`, `0` |
| `long` or `bigint` | 64-bit signed integer. | `2147483648` |
| `float` | 32-bit IEEE 754 floating point. | `3.14` |
| `double` | 64-bit IEEE 754 floating point. | `3.141592653589793` |
| `boolean` | Boolean. | `true`, `false` |
| `date` | Calendar date (no time component). | `DATE '2025-01-15'` |
| `timestamp` | Date with time and timezone (UTC-normalized). | `TIMESTAMP '2025-01-15T10:30:00Z'` |
| `timestamp_ntz` | Date with time, no timezone adjustment. | `TIMESTAMP_NTZ '2025-01-15T10:30:00'` |
| `time` | Time of day without date. | `10:30:00`, `23:59:59.999` |
| `time(p)` | Time with fractional precision `p` (0–9). | `time(6)` — microsecond precision |
| `decimal(p, s)` | Fixed-point decimal with precision `p` and scale `s`. | `decimal(10, 2)` |
| `binary` | Arbitrary binary data. | `X'DEADBEEF'` |
| `char(n)` | Fixed-length string, right-padded with spaces. | `char(10)` |
| `varchar(n)` | Variable-length string with maximum length `n`. | `varchar(255)` |
| `interval year to month` | Year-month interval. | `INTERVAL 1 YEAR 6 MONTHS` |
| `interval day to second` | Day-time interval. | `INTERVAL 2 DAYS 12 HOURS` |
| `variant` | Semi-structured data (schema-on-read). | JSON objects, arrays, scalars |
| `array<T>` | Ordered collection of elements of type `T`. | `array<string>` |
| `map<K, V>` | Key-value pairs with key type `K` and value type `V`. | `map<string, integer>` |
| `struct<fields>` | Named fields with types, using `name: type` syntax. | `struct<name: string, age: int>` |

Type names are **case-insensitive**: `String`, `STRING`, and `string` are equivalent.

### 10.2 Implicit Type Widening

When operations involve mixed types, the following widening rules apply automatically:

| From | To | Context |
|------|----|---------|
| `byte` | `short` | Arithmetic with `short` operand. |
| `byte`, `short` | `integer` | Arithmetic with `integer` operand. |
| `byte`, `short`, `integer` | `long` | Arithmetic with `long` operand. |
| `byte`, `short`, `integer`, `long` | `double` | Arithmetic with `double` operand. |
| `float` | `double` | Arithmetic with `double` operand. |
| `byte`, `short`, `integer`, `long` | `decimal` | Arithmetic with `decimal` operand. |
| `char(n)` | `varchar(m)` where m ≥ n | String context. |
| `char(n)`, `varchar(n)` | `string` | String context. |
| `date` | `timestamp_ntz` | Comparison or arithmetic with `timestamp_ntz`. |
| `date`, `timestamp_ntz` | `timestamp` | Comparison or arithmetic with `timestamp`. |

Widening MUST NOT lose information. If a widening cannot be performed safely, the implementation MUST raise `E-TYPE-001`.

### 10.3 Typed Literals

Certain types support typed literal syntax for unambiguous value specification:

| Literal Syntax | Type | Description |
|----------------|------|-------------|
| `DATE 'yyyy-MM-dd'` | `date` | Calendar date. |
| `TIMESTAMP 'iso8601'` | `timestamp` | Timestamp with timezone. If no TZ, UTC assumed. |
| `TIMESTAMP_NTZ 'iso8601'` | `timestamp_ntz` | Timestamp without timezone. |
| `X'hex'` | `binary` | Binary from hexadecimal. |
| `INTERVAL n UNIT [m UNIT ...]` | interval | Interval literal (see [Section 9.1](#91-ebnf-grammar)). |
| `ARRAY(...)` | `array<T>` | Array literal. Type inferred from elements. |
| `MAP(k, v, ...)` | `map<K, V>` | Map literal. Alternating key-value pairs. |
| `STRUCT(...)` | `struct<...>` | Positional struct literal. |
| `NAMED_STRUCT(name, val, ...)` | `struct<...>` | Named struct literal. |

**Invalid literal examples:**
```
DATE 'not-a-date'         → ERROR E-EXPR-004
X'ZZZZ'                   → ERROR E-EXPR-005
TIMESTAMP_NTZ '2025-13-01T00:00:00'  → ERROR E-EXPR-004
```

### 10.4 Interval Arithmetic

Interval values participate in arithmetic with temporal types:

| Operation | Result Type |
|-----------|-------------|
| `date + interval` | `date` or `timestamp` depending on interval unit |
| `timestamp + interval` | `timestamp` |
| `timestamp - timestamp` | `interval day to second` |
| `interval + interval` | `interval` (same kind) |
| `interval * integer` | `interval` |
| `integer * interval` | `interval` |

---

## 11. Null Semantics

Teckel follows **SQL three-valued logic** (true, false, NULL) for null handling.

### 11.1 General Rules

| Operation | Result with NULL |
|-----------|-----------------|
| `NULL = NULL` | `NULL` (not `true`) |
| `NULL != NULL` | `NULL` (not `true`) |
| `NULL AND true` | `NULL` |
| `NULL AND false` | `false` |
| `NULL OR true` | `true` |
| `NULL OR false` | `NULL` |
| `NOT NULL` | `NULL` |
| `x + NULL` | `NULL` (any arithmetic with NULL) |
| `concat('a', NULL)` | `NULL` |

### 11.2 IS NULL / IS NOT NULL

The only operators that return `true`/`false` (never NULL) for null testing:

```
x IS NULL         → true if x is NULL, false otherwise
x IS NOT NULL     → true if x is not NULL, false otherwise
```

### 11.3 Aggregation

| Function | All NULLs | Mix of NULL and values |
|----------|-----------|----------------------|
| `count(expr)` | `0` | Count of non-NULL values. |
| `count(*)` | Row count | Row count. |
| `sum(expr)` | `NULL` | Sum of non-NULL values. |
| `avg(expr)` | `NULL` | Average of non-NULL values. |
| `min(expr)` | `NULL` | Minimum of non-NULL values. |
| `max(expr)` | `NULL` | Maximum of non-NULL values. |

### 11.4 Sorting

Default null ordering:

| Direction | Null Position |
|-----------|---------------|
| `asc` | Nulls **last**. |
| `desc` | Nulls **last**. |

> **Note:** This differs from ANSI SQL (which defaults to `NULLS FIRST` for `DESC`). See [Section 8.4](#84-order-by) for rationale.

This default MAY be overridden per-column in `orderBy` using the `nulls` field.

### 11.5 Grouping

NULL values in grouping columns form a single group (all NULLs are grouped together).

### 11.6 Distinct

For deduplication purposes, `NULL = NULL` evaluates to `true` (two NULL values are considered duplicates).

### 11.7 Joins

- In join conditions, `NULL = NULL` evaluates to `NULL` (falsy), so NULLs do NOT match.
- In outer joins, non-matching rows have NULL-filled columns from the other side.

---

## 12. Variable Substitution

Variables allow parameterization of Teckel documents.

### 12.1 Syntax (EBNF)

```ebnf
variable        = "${", var_name, [ ":", default_value ], "}" ;
var_name        = identifier_char, { identifier_char } ;
identifier_char = letter | digit | "_" | "." ;
default_value   = { any_char - "}" } ;
escaped_dollar  = "$$" ;
```

### 12.2 Examples

```yaml
path: "${INPUT_PATH}/events"                    # required variable
filter: "${FILTER_CONDITION:1=1}"               # variable with default
path: "$${NOT_A_VARIABLE}"                      # escaped: renders as "${NOT_A_VARIABLE}"
```

### 12.3 Resolution Order

1. **Explicit variables map** — passed by the runtime (e.g., command-line arguments).
2. **Environment variables** — from the OS environment.
3. **Default value** — the value after `:` in `${VAR:default}`.
4. **Error** — if none of the above resolve the variable, raise `E-VAR-001`.

### 12.4 Escaping

The sequence `$$` is an escape for a literal `$`. After substitution, `$${...}` becomes the literal text `${...}`.

### 12.5 Nesting

Variable nesting (e.g., `${A_${B}}`) is **NOT** supported. Substitution is a **single-pass** text replacement from left to right. If the resolved value of a variable contains `${...}`, it is treated as literal text and NOT expanded further.

### 12.6 Scope

Variable substitution is applied to the **raw YAML text** before parsing. Variables MAY appear in any string value: paths, expressions, option values, etc.

---

## 13. Secrets

Secrets provide a secure mechanism for referencing sensitive values that MUST NOT appear in plain text.

### 13.1 Syntax (EBNF)

```ebnf
secret_ref    = "{{", "secrets", ".", alias, "}}" ;
alias         = letter, { letter | digit | "_" | "-" } ;
escaped_brace = "{{{{" ;   (* literal "{{" *)
```

### 13.2 Declaration

```yaml
secrets:
  keys:
    <alias>:
      scope: <string>             # OPTIONAL — vault/scope/namespace
      key: <string>               # REQUIRED — key name in the secret store
```

### 13.3 Resolution

The runtime resolves secrets via a **SecretsProvider** interface. The mechanism is implementation-defined (e.g., environment variables, HashiCorp Vault, AWS Secrets Manager, Azure Key Vault).

Fallback resolution order:
1. The implementation's configured SecretsProvider.
2. Environment variable `TECKEL_SECRET__<ALIAS>` (alias uppercased, hyphens replaced with underscores).

If a secret cannot be resolved, the implementation MUST raise `E-SECRET-001` **before** execution begins.

### 13.4 Security

- Resolved secret values MUST NOT be logged, printed, or included in error messages.
- Implementations SHOULD clear secret values from memory after use.

**Valid example:**
```yaml
secrets:
  keys:
    db_password:
      scope: production
      key: database-password

input:
  - name: dbTable
    format: jdbc
    path: ""
    options:
      url: "jdbc:postgresql://host:5432/mydb"
      user: admin
      password: "{{secrets.db_password}}"
```

---

## 14. Configuration

The `config` section controls pipeline-wide settings.

```yaml
config:
  backend: <string>
  cache:
    autoCacheThreshold: <integer>
    defaultStorageLevel: <string>
  notifications:
    onSuccess: <List[NotificationTarget]>
    onFailure: <List[NotificationTarget]>
  components:
    readers: <List[ComponentDef]>
    transformers: <List[ComponentDef]>
    writers: <List[ComponentDef]>
```

### 14.1 Fields

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `backend` | string | No | impl-defined | Hint for the execution backend (e.g., `"spark"`, `"datafusion"`, `"duckdb"`). |
| `cache` | CacheConfig | No | — | Caching configuration. |
| `notifications` | NotificationConfig | No | — | Pipeline event notifications. |
| `components` | ComponentsConfig | No | — | Custom component registration. |

### 14.2 Cache Configuration

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `autoCacheThreshold` | integer | No | impl-defined | Auto-cache assets consumed by N or more downstream assets. |
| `defaultStorageLevel` | string | No | impl-defined | Default storage level for caching (e.g., `"MEMORY_AND_DISK"`). |

### 14.3 Notification Target

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `channel` | string | **Yes** | — | `"log"`, `"webhook"`, or `"file"`. |
| `url` | string | Conditional | — | Required for `"webhook"`. |
| `path` | string | Conditional | — | Required for `"file"`. |

All config fields are OPTIONAL. Implementations define their own defaults.

---

## 15. Streaming

Streaming extends the batch model for continuous processing.

### 15.1 Streaming Input

```yaml
streamingInput:
  - name: <AssetRef>
    format: <string>
    path: <string>
    options: <Map[string, primitive]>
    trigger: <string>
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `name` | AssetRef | **Yes** | — | Unique asset name. |
| `format` | string | **Yes** | — | Stream format (e.g., `"kafka"`, `"json"`, `"csv"`). |
| `path` | string | No | — | For file-based streams, the monitored directory. |
| `options` | Map[string, primitive] | No | `{}` | Source-specific options. |
| `trigger` | string | No | impl-defined | Trigger specification. See [15.3](#153-triggers). |

### 15.2 Streaming Output

```yaml
streamingOutput:
  - name: <AssetRef>
    format: <string>
    path: <string>
    options: <Map[string, primitive]>
    outputMode: <string>
    checkpointLocation: <string>
    trigger: <string>
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `name` | AssetRef | **Yes** | — | MUST match an existing asset. |
| `format` | string | **Yes** | — | Output format. |
| `path` | string | No | — | Output path (for file-based sinks). |
| `options` | Map[string, primitive] | No | `{}` | Sink-specific options. |
| `outputMode` | string | No | `"append"` | `"append"`, `"update"`, or `"complete"`. |
| `checkpointLocation` | string | No | — | Path for streaming state checkpointing. RECOMMENDED for production. |
| `trigger` | string | No | impl-defined | Trigger specification. |

### 15.3 Triggers

| Trigger | Description |
|---------|-------------|
| `"processingTime:<interval>"` | Micro-batch at the given interval. Example: `"processingTime:10 seconds"`. |
| `"once"` | Process all available data once and stop. |
| `"continuous:<interval>"` | Low-latency continuous processing. Example: `"continuous:1 second"`. |

### 15.4 Batch and Streaming Interaction

Streaming inputs and batch inputs MAY coexist in the same document. Transformations MAY reference both streaming and batch assets (e.g., a stream-static join). The implementation MUST ensure that batch assets are available as static lookups when referenced by streaming transformations.

---

## 16. Hooks

Hooks execute external commands at pipeline lifecycle events.

```yaml
hooks:
  preExecution:
    - name: <string>
      command: <string>
  postExecution:
    - name: <string>
      command: <string>
```

### 16.1 Fields

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `name` | string | **Yes** | — | Hook identifier (for logging). |
| `command` | string | **Yes** | — | Shell command to execute. |

### 16.2 Execution Rules

- **Pre-execution hooks** run sequentially in declared order **before** any pipeline asset is executed.
- If any pre-execution hook exits with a non-zero code, the pipeline MUST NOT start. Error: `E-HOOK-001`.
- **Post-execution hooks** run sequentially in declared order **after** the pipeline completes (whether success or failure).
- If a post-execution hook fails, the implementation MUST log the failure but MUST NOT change the pipeline's overall status.

### 16.3 Execution Environment

- Working directory: the directory containing the Teckel YAML file.
- Environment variables: the runtime's environment, plus:
  - `TECKEL_PIPELINE_STATUS`: `"SUCCESS"` or `"FAILURE"` (available to post-execution hooks).
  - `TECKEL_PIPELINE_FILE`: absolute path to the Teckel YAML file.

---

## 17. Data Quality

Teckel provides a declarative data quality system for defining checks that validate datasets at runtime. Quality checks are organized into **suites** scoped to specific assets.

> **Relationship to Assertion transformation (8.28):** The `assertion` transformation is an inline, single-asset quality gate within the pipeline DAG. The `quality` section defined here is a **standalone, richer** quality specification that supports multiple quality dimensions, thresholds, severity levels, statistical checks, freshness validation, and cross-asset referential integrity. Implementations SHOULD support both; the `quality` section is the recommended approach for comprehensive data quality.

### 17.1 Schema

```yaml
quality:
  - suite: <string>
    description: <string>
    target: <AssetRef>
    filter: <Condition>
    severity: <string>
    checks:
      - ...
```

### 17.2 Quality Suite

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `suite` | string | **Yes** | — | Suite name (for reporting). |
| `description` | string | No | — | Human-readable description of what this suite validates. |
| `target` | AssetRef | **Yes** | — | Asset to validate. |
| `filter` | Condition | No | — | Optional row filter — checks apply only to matching rows. |
| `severity` | string | No | `"error"` | Default severity for all checks in this suite: `"error"`, `"warn"`, or `"info"`. |
| `checks` | NonEmptyList[Check] | **Yes** | — | Quality checks to apply. |

### 17.3 Check Types

Each check has a `type` field that determines the quality dimension. The following check types are defined:

#### 17.3.1 Schema Checks

Validate the structural shape of the dataset.

```yaml
- type: schema
  columns:
    required: [id, name, email]           # MUST exist
    forbidden: [ssn, credit_card]         # MUST NOT exist
  types:
    id: integer
    amount: double
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | `"schema"` | **Yes** | — |
| `columns.required` | List[string] | No | Columns that MUST be present. |
| `columns.forbidden` | List[string] | No | Columns that MUST NOT be present (supports glob patterns: `pii_*`). |
| `types` | Map[string, string] | No | Expected data types per column. |

#### 17.3.2 Completeness Checks

Validate that required values are present (non-null).

```yaml
- type: completeness
  column: email
  threshold: 0.95                         # at least 95% non-null
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `type` | `"completeness"` | **Yes** | — | — |
| `column` | Column | **Yes** | — | Column to check. |
| `threshold` | double | No | `1.0` | Minimum fraction of non-null values (0.0–1.0). `1.0` = all values must be non-null. |

#### 17.3.3 Uniqueness Checks

Validate that values are unique (no duplicates).

```yaml
- type: uniqueness
  columns: [customer_id]                  # single or composite key
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `type` | `"uniqueness"` | **Yes** | — | — |
| `columns` | NonEmptyList[Column] | **Yes** | — | Columns forming the uniqueness key. |
| `threshold` | double | No | `1.0` | Minimum fraction of unique values. |

#### 17.3.4 Validity Checks

Validate that values conform to expected formats, ranges, or sets.

```yaml
# Accepted values
- type: validity
  column: status
  acceptedValues: [active, inactive, pending]

# Range constraint
- type: validity
  column: amount
  range:
    min: 0
    max: 1000000
    strictMin: true                       # exclusive lower bound (> 0, not >= 0)

# Pattern matching
- type: validity
  column: email
  pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"

# Format validation
- type: validity
  column: phone
  format: phone                           # built-in format validator

# String length
- type: validity
  column: code
  lengthBetween: [3, 10]
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `type` | `"validity"` | **Yes** | — | — |
| `column` | Column | **Yes** | — | Column to validate. |
| `acceptedValues` | List[string] | No | — | Allowed values (enumeration). |
| `range` | RangeSpec | No | — | Numeric range constraint. |
| `pattern` | string | No | — | Regular expression pattern. |
| `format` | string | No | — | Built-in format name. See [17.3.4.1](#17341-built-in-formats). |
| `lengthBetween` | [integer, integer] | No | — | `[min, max]` string length (inclusive). |
| `threshold` | double | No | `1.0` | Minimum fraction of valid values. |

**RangeSpec:**

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `min` | number | No | — | Minimum value. |
| `max` | number | No | — | Maximum value. |
| `strictMin` | boolean | No | `false` | Exclusive lower bound (`>` instead of `>=`). |
| `strictMax` | boolean | No | `false` | Exclusive upper bound (`<` instead of `<=`). |

##### 17.3.4.1 Built-in Formats

Implementations MUST support these format validators:

| Format | Description |
|--------|-------------|
| `email` | RFC 5322 email address. |
| `uuid` | UUID (any version). |
| `url` | Valid URL with scheme. |
| `ipv4` | IPv4 address. |
| `ipv6` | IPv6 address. |
| `date` | ISO 8601 date (`YYYY-MM-DD`). |
| `timestamp` | ISO 8601 timestamp. |
| `phone` | International phone number format. |

#### 17.3.5 Statistical Checks

Validate statistical properties of numeric columns.

```yaml
- type: statistical
  column: salary
  mean:
    between: [40000, 120000]
  stdev:
    max: 50000
  quantiles:
    0.25: { min: 30000 }
    0.50: { between: [45000, 80000] }
    0.75: { max: 150000 }
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `type` | `"statistical"` | **Yes** | — | — |
| `column` | Column | **Yes** | — | Numeric column. |
| `mean` | BoundSpec | No | — | Expected mean bounds. |
| `min` | BoundSpec | No | — | Expected minimum value bounds. |
| `max` | BoundSpec | No | — | Expected maximum value bounds. |
| `sum` | BoundSpec | No | — | Expected sum bounds. |
| `stdev` | BoundSpec | No | — | Expected standard deviation bounds. |
| `quantiles` | Map[double, BoundSpec] | No | — | Expected quantile value bounds. Key is the percentile (0.0–1.0). |

**BoundSpec:**

| Field | Type | Description |
|-------|------|-------------|
| `min` | number | Minimum expected value. |
| `max` | number | Maximum expected value. |
| `between` | [number, number] | `[min, max]` range (inclusive). |

#### 17.3.6 Volume Checks

Validate the size of the dataset.

```yaml
- type: volume
  rowCount:
    between: [1000, 100000]
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `type` | `"volume"` | **Yes** | — | — |
| `rowCount` | BoundSpec | No | — | Expected row count bounds. |
| `columnCount` | BoundSpec | No | — | Expected column count bounds. |

#### 17.3.7 Freshness Checks

Validate data recency based on a timestamp column.

```yaml
- type: freshness
  column: updated_at
  maxAge: "PT24H"                         # ISO 8601 duration — max 24 hours old
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `type` | `"freshness"` | **Yes** | — | — |
| `column` | Column | **Yes** | — | Timestamp column. |
| `maxAge` | string | **Yes** | — | ISO 8601 duration. The max value of `column` must be within `maxAge` of the current time. |

#### 17.3.8 Referential Integrity Checks

Validate that values exist in another asset (foreign key relationship).

```yaml
- type: referential
  column: customer_id
  reference:
    asset: customers
    column: id
  threshold: 1.0                          # 100% of values must match
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `type` | `"referential"` | **Yes** | — | — |
| `column` | Column | **Yes** | — | Column in the target asset. |
| `reference.asset` | AssetRef | **Yes** | — | Referenced asset. |
| `reference.column` | Column | **Yes** | — | Column in the referenced asset. |
| `threshold` | double | No | `1.0` | Minimum fraction of values that must exist in the reference. |

#### 17.3.9 Cross-Column Checks

Validate relationships between columns within the same dataset.

```yaml
- type: crossColumn
  condition: "start_date <= end_date"
  description: "Start date must not be after end date"
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `type` | `"crossColumn"` | **Yes** | — | — |
| `condition` | Condition | **Yes** | — | Boolean expression referencing columns in the target asset. |
| `description` | string | No | — | Human-readable description. |
| `threshold` | double | No | `1.0` | Minimum fraction of rows satisfying the condition. |

#### 17.3.10 Custom Checks

Validate using an arbitrary expression.

```yaml
- type: custom
  condition: "amount > 0 AND currency IS NOT NULL"
  description: "All transactions must have positive amount and currency"
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `type` | `"custom"` | **Yes** | — | — |
| `condition` | Condition | **Yes** | — | Boolean expression evaluated per row. |
| `description` | string | No | — | Human-readable description. |
| `threshold` | double | No | `1.0` | Minimum fraction of rows passing. |

### 17.4 Check Result Model

Each check execution produces a result with the following fields:

| Field | Type | Description |
|-------|------|-------------|
| `suite` | string | Suite name. |
| `check_type` | string | Check type identifier. |
| `target` | string | Asset name. |
| `column` | string? | Column name (if applicable). |
| `status` | `"pass"` \| `"warn"` \| `"fail"` \| `"error"` | Outcome. |
| `severity` | string | Configured severity level. |
| `observed_value` | any | Computed metric value. |
| `expected` | string | Threshold/assertion description. |
| `failing_rows` | integer? | Number of rows failing (for row-level checks). |
| `failing_percent` | double? | Percentage of rows failing. |
| `description` | string? | Check description. |
| `timestamp` | string | ISO 8601 execution timestamp. |

### 17.5 Severity and Failure Handling

| Severity | Pipeline Behavior |
|----------|-------------------|
| `error` | Pipeline MUST abort with `E-QUALITY-001`. |
| `warn` | Log warning with check details. Pipeline continues. |
| `info` | Record metric only. No log warning. Pipeline continues. |

Per-check severity overrides the suite-level default:

```yaml
quality:
  - suite: orders-quality
    target: orders
    severity: error                       # suite default
    checks:
      - type: completeness
        column: email
        threshold: 0.95
        severity: warn                    # override: just warn for email
      - type: uniqueness
        columns: [order_id]              # inherits suite severity: error
```

### 17.6 Conditional Severity

Checks MAY define escalating severity based on the magnitude of the violation:

```yaml
- type: completeness
  column: customer_id
  threshold: 0.99
  severity: warn
  escalate:
    threshold: 0.90
    severity: error
```

When the observed completeness is:
- `>= 0.99`: **pass**
- `< 0.99` and `>= 0.90`: **warn**
- `< 0.90`: **error**

### 17.7 Valid Example

```yaml
quality:
  - suite: orders-validation
    description: "Quality checks for the orders dataset"
    target: validatedOrders
    checks:
      # Schema validation
      - type: schema
        columns:
          required: [order_id, customer_id, amount, created_at]
          forbidden: [internal_id]

      # Completeness
      - type: completeness
        column: customer_id
        threshold: 1.0

      # Uniqueness (composite key)
      - type: uniqueness
        columns: [order_id]

      # Value validity
      - type: validity
        column: status
        acceptedValues: [pending, confirmed, shipped, delivered, cancelled]

      # Range check
      - type: validity
        column: amount
        range:
          min: 0
          strictMin: true

      # Statistical bounds
      - type: statistical
        column: amount
        mean:
          between: [50, 500]
        quantiles:
          0.99: { max: 10000 }

      # Volume sanity
      - type: volume
        rowCount:
          between: [100, 10000000]

      # Freshness
      - type: freshness
        column: created_at
        maxAge: "PT48H"

      # Referential integrity
      - type: referential
        column: customer_id
        reference:
          asset: customers
          column: id

      # Cross-column logic
      - type: crossColumn
        condition: "shipped_at IS NULL OR shipped_at >= created_at"
        description: "Shipping date must be after order creation"
```

---

## 18. Metadata

Teckel supports declarative metadata at three levels: **pipeline**, **asset**, and **column**. Metadata enables documentation, governance, cataloging, and lineage tracking without requiring external systems.

### 18.1 Design Principles

- **Metadata is optional.** No metadata field is required. A minimal Teckel document works without any metadata.
- **Open extension via `meta`.** Every level has an open `meta` map for custom key-value pairs. Implementations MUST preserve and pass through `meta` values without interpretation.
- **Tag propagation.** Tags declared on an input asset are **automatically inherited** by all downstream transformation assets that depend on it, unless explicitly overridden. This enables governance classification propagation (e.g., PII tagging).

### 18.2 Pipeline-Level Metadata

The `pipeline` top-level key defines metadata about the pipeline as a whole.

```yaml
pipeline:
  name: <string>
  namespace: <string>
  version: <string>
  description: <string>
  owner:
    name: <string>
    email: <string>
    type: <string>
  tags: [<string>]
  meta:
    <key>: <any>
  schedule: <string>
  freshness: <string>
  links:
    - label: <string>
      url: <string>
  contacts:
    - name: <string>
      email: <string>
      role: <string>
  catalog:
    target: <string>
    namespace: <string>
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `name` | string | No | — | Human-readable pipeline name. |
| `namespace` | string | No | — | Globally unique namespace (e.g., `"com.company.finance"`). Combined with asset names to form URNs. |
| `version` | string | No | — | Semantic version of the pipeline (e.g., `"1.2.0"`). |
| `description` | string | No | — | Markdown-formatted description of the pipeline's purpose. |
| `owner` | Owner | No | — | Primary pipeline owner. See [18.3](#183-owner). |
| `tags` | List[string] | No | `[]` | Pipeline-level classification labels. |
| `meta` | Map[string, any] | No | `{}` | Open key-value metadata. |
| `schedule` | string | No | — | Expected execution schedule as cron expression (e.g., `"0 6 * * *"`) or ISO 8601 duration. |
| `freshness` | string | No | — | Expected end-to-end freshness as ISO 8601 duration (e.g., `"PT24H"`). |
| `links` | List[Link] | No | `[]` | External documentation links. |
| `contacts` | List[Contact] | No | `[]` | Stakeholder contacts. |
| `catalog` | CatalogConfig | No | — | Data catalog integration configuration. |

### 18.3 Owner

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `name` | string | **Yes** | — | Person or team name. |
| `email` | string | **Yes** | — | Contact email. |
| `type` | string | No | `"technical"` | Owner role: `"technical"`, `"business"`, or `"steward"`. |

### 18.4 Column-Level Metadata

Columns on inputs MAY carry metadata declarations. This enables column-level documentation, tagging, and constraint tracking.

```yaml
input:
  - name: customers
    format: parquet
    path: "data/customers"
    columns:
      - name: customer_id
        description: "Unique customer identifier"
        tags: [primary_key]
        constraints: [not_null, unique]
      - name: email
        description: "Customer email address"
        tags: [pii, contact]
        constraints: [not_null]
        meta:
          sensitivity: high
          retention_days: 365
      - name: created_at
        description: "Account creation timestamp"
        tags: [partition_key]
```

**ColumnMetadata object:**

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `name` | string | **Yes** | — | Column name (MUST match a column in the dataset). |
| `description` | string | No | — | Human-readable column description. |
| `tags` | List[string] | No | `[]` | Column-level classification labels. |
| `constraints` | List[string] | No | `[]` | Declared constraints. See [18.4.1](#1841-column-constraints). |
| `meta` | Map[string, any] | No | `{}` | Open key-value metadata. |
| `glossaryTerm` | string | No | — | Reference to a business glossary term. |

#### 18.4.1 Column Constraints

Column constraints are **declarative metadata** — they document expected properties but do NOT enforce them at runtime. Enforcement is done via the `quality` section ([Section 17](#17-data-quality)) or the `assertion` transformation.

| Constraint | Description |
|------------|-------------|
| `not_null` | Column should not contain null values. |
| `unique` | Column should contain unique values. |
| `primary_key` | Column is part of the primary key (implies `not_null` + `unique`). |
| `foreign_key(<asset>.<column>)` | Column references another asset's column. |

### 18.5 Freshness SLA

The `freshness` field (on `pipeline` or `output`) declares the expected maximum age of the data as an ISO 8601 duration.

```
PT1H        → 1 hour
PT24H       → 24 hours
P1D         → 1 day
P7D         → 7 days
PT30M       → 30 minutes
```

This is **metadata only** — it does not enforce freshness at runtime. To enforce freshness, use a `freshness` quality check ([Section 17.3.7](#1737-freshness-checks)).

### 18.6 Maturity

The `maturity` field on outputs indicates the lifecycle stage of the dataset.

| Value | Description |
|-------|-------------|
| `high` | Production-grade. Stable schema, monitored, with SLA. |
| `medium` | In active development. Schema may change. |
| `low` | Experimental or prototype. No guarantees. |
| `deprecated` | Scheduled for removal. Consumers should migrate. |

### 18.7 Tag Propagation

Tags declared on assets propagate downstream through the DAG:

1. An input's tags are inherited by all transformations that reference it (directly or transitively).
2. When a transformation has multiple upstream assets, it inherits the **union** of all upstream tags.
3. A transformation MAY declare its own tags, which are **added** to the inherited set.
4. A transformation MAY explicitly **remove** inherited tags using the `removeTags` field:

```yaml
transformation:
  - name: anonymized
    select:
      from: customers
      columns: [id, region]              # dropped pii columns
    tags: [anonymized]
    removeTags: [pii]                     # explicitly remove inherited pii tag
```

5. Output sinks inherit the tags of the asset they reference.

### 18.8 Asset URN

When a `pipeline.namespace` is declared, each asset's globally unique identifier (URN) is:

```
teckel://<namespace>/<asset_name>
```

Example: `teckel://com.company.finance/daily_revenue`

Implementations SHOULD use this URN when emitting lineage events or registering assets in catalogs.

### 18.9 Lineage

Dataset-level lineage is **implicit** in the Teckel DAG structure (every `from`, `left`, `right`, `sources`, `views`, `current`, `incoming` field is a lineage edge). A conforming implementation SHOULD be able to:

1. Export the full lineage graph as a JSON artifact.
2. Emit OpenLineage-compatible `RunEvent` payloads with dataset facets.
3. Determine the **upstream impact** (what feeds this asset?) and **downstream impact** (what breaks if this asset changes?) for any asset.

Column-level lineage (which output columns derive from which input columns) is NOT declared in the YAML — it is **inferred** by the runtime from the transformation semantics.

### 18.10 Catalog Integration

The `pipeline.catalog` field declares how metadata should be exported to an external data catalog.

```yaml
pipeline:
  catalog:
    target: openmetadata             # catalog system identifier
    namespace: finance.revenue       # catalog-specific namespace
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `target` | string | **Yes** | Catalog system identifier (e.g., `"openmetadata"`, `"datahub"`, `"atlas"`). |
| `namespace` | string | No | Namespace within the catalog. |

The catalog integration mechanism is implementation-defined. Implementations SHOULD generate a metadata artifact (e.g., `manifest.json`) containing all pipeline, asset, and column metadata in a machine-readable format.

---

## 19. Exposures

Exposures declare **downstream consumers** of the pipeline's outputs — dashboards, notebooks, ML models, applications, or other pipelines. This completes the lineage graph by connecting data production to data consumption.

### 19.1 Schema

```yaml
exposures:
  - name: <string>
    type: <string>
    description: <string>
    url: <string>
    maturity: <string>
    owner:
      name: <string>
      email: <string>
    depends_on: [<AssetRef>]
    tags: [<string>]
    meta:
      <key>: <any>
```

### 19.2 Fixed Fields

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `name` | string | **Yes** | — | Exposure identifier. |
| `type` | string | **Yes** | — | Consumer type. See [19.3](#193-exposure-types). |
| `description` | string | No | — | What this consumer does with the data. |
| `url` | string | No | — | Link to the consumer (dashboard URL, notebook link, etc.). |
| `maturity` | string | No | — | `"high"`, `"medium"`, `"low"`. |
| `owner` | Owner | No | — | Consumer owner/team. |
| `depends_on` | NonEmptyList[AssetRef] | **Yes** | — | Assets consumed. MUST reference output asset names. |
| `tags` | List[string] | No | `[]` | Classification labels. |
| `meta` | Map[string, any] | No | `{}` | Custom metadata. |

### 19.3 Exposure Types

| Type | Description |
|------|-------------|
| `dashboard` | BI dashboard or report. |
| `notebook` | Jupyter/Zeppelin notebook or analysis. |
| `analysis` | Ad-hoc analysis or query. |
| `ml` | Machine learning model or feature store. |
| `application` | Application or microservice. |
| `pipeline` | Another data pipeline. |

### 19.4 Valid Example

```yaml
exposures:
  - name: revenue_dashboard
    type: dashboard
    maturity: high
    url: "https://bi.company.com/dashboards/revenue"
    description: "Executive daily revenue tracking"
    owner:
      name: Analytics Team
      email: analytics@company.com
    depends_on: [daily_revenue, monthly_summary]
    tags: [executive, finance]

  - name: churn_model
    type: ml
    description: "Customer churn prediction model"
    owner:
      name: ML Engineering
      email: ml@company.com
    depends_on: [customer_features]
    tags: [ml, production]
    meta:
      model_version: "3.2"
      framework: xgboost
```

### 19.5 Semantics

- Exposures are **metadata-only** — they do not affect pipeline execution.
- The `depends_on` assets MUST reference assets defined in `input`, `transformation`, or referenceable via output `name`.
- Exposures enable **downstream impact analysis**: when an asset's schema changes, the implementation can identify affected consumers.

---

## 20. Templates

Templates define reusable configuration fragments.

```yaml
templates:
  - name: <string>
    parameters:
      <key>: <value>
```

### 20.1 Status

> **Advisory.** Template semantics are not fully specified in v2.0. Implementations MAY support template expansion but MUST NOT require it for Core or Extended conformance. A future version will formalize template instantiation, parameterization, and composition.

Implementations that support templates SHOULD document their template expansion mechanism.

---

## 21. Config Merging

Multiple Teckel documents MAY be merged into a single pipeline. This enables environment-specific overrides.

### 21.1 Merge Semantics

| Value Type | Merge Behavior |
|------------|---------------|
| Object (YAML mapping) | **Deep merge**: overlay fields override base fields recursively. |
| Array (YAML sequence) | **Replaced** entirely by the overlay. |
| Scalar | **Replaced** by the overlay. |

### 21.2 Merge Order

Files are merged left to right. The rightmost file has the **highest** precedence.

```
base.yaml + dev.yaml → merged
```

### 21.3 Example

**base.yaml:**
```yaml
version: "3.0"
input:
  - name: source
    format: parquet
    path: "${INPUT_PATH}"
output:
  - name: source
    format: parquet
    mode: overwrite
    path: "${OUTPUT_PATH}"
```

**dev.yaml:**
```yaml
input:
  - name: source
    format: csv
    path: "data/local/input.csv"
    options:
      header: true
output:
  - name: source
    path: "data/local/output"
```

**Merged result:** The `input` and `output` arrays from `dev.yaml` completely **replace** those in `base.yaml`. Object fields within them are not individually merged — the entire array is replaced.

---

## 22. Path Resolution

### 22.1 Absolute Paths and URIs

Paths that are absolute (start with `/`) or contain a URI scheme (e.g., `s3://`, `gs://`, `hdfs://`, `file://`) are used as-is.

### 22.2 Relative Paths

Relative paths are resolved relative to the **working directory** of the runtime process, NOT relative to the YAML file location.

> **Rationale:** This matches the behavior of most data processing frameworks and avoids ambiguity when multiple YAML files are merged.

Implementations MAY provide a configuration option to set a base path for relative path resolution.

---

## 23. Validation Rules

A conforming implementation MUST validate the following **before** execution. Each rule is stated formally, followed by the error code raised on violation.

### V-001: Reference Integrity

> **Rule:** For each AssetRef `R` used in a `from`, `left`, `right`, `sources`, `current`, `incoming`, `views`, or output `name` field, there MUST exist an asset with name `R` in the `input` section, the `transformation` section, or as a `pass`/`fail` name of a `split` transformation.

**Error:** `E-REF-001` — undefined asset reference.

**Valid:**
```yaml
input:
  - name: data
    format: csv
    path: "a.csv"
transformation:
  - name: filtered
    where:
      from: data                  # OK: "data" exists as input
      filter: "x > 0"
```

**Invalid:**
```yaml
transformation:
  - name: filtered
    where:
      from: missing               # ERROR [E-REF-001]: "missing" is not defined
      filter: "x > 0"
```

### V-002: No Cycles

> **Rule:** The asset dependency graph MUST be a directed acyclic graph (DAG). There MUST NOT exist any asset `A` such that `A` transitively depends on itself.

**Error:** `E-CYCLE-001` — circular dependency detected.

### V-003: Output References

> **Rule:** An output's `name` field MUST reference an asset defined in `input` or `transformation`. Outputs MUST NOT reference other outputs. Transformations MUST NOT reference outputs.

**Error:** `E-REF-002` — invalid output reference.

### V-004: Name Uniqueness

> **Rule:** No two assets in `input` and `transformation` MAY have the same name. Split `pass`/`fail` names also participate in this uniqueness check.

**Error:** `E-NAME-001` — duplicate AssetRef.

### V-005: Non-Empty Lists

> **Rule:** Fields typed as `NonEmptyList[T]` MUST contain at least one element.

**Error:** `E-LIST-001` — empty list where non-empty required.

### V-006: Single Operation Key

> **Rule:** Each transformation entry MUST contain exactly one operation key.

**Error:** `E-OP-001` — zero or multiple operation keys.

### V-007: AssetRef Format

> **Rule:** All AssetRef values MUST match the grammar in [Section 5.1](#51-assetref-grammar).

**Error:** `E-NAME-002` — invalid AssetRef format.

### V-008: Version Field

> **Rule:** The `version` field MUST be present and MUST be `"2.0"`.

**Error:** `E-VERSION-001` — missing or unsupported version.

---

## 24. Execution Model

### 24.1 DAG Resolution

The runtime resolves the asset DAG via **topological sort**. Assets with satisfied dependencies (all upstream assets computed) are eligible for execution.

### 24.2 Parallelism

Independent branches of the DAG (assets with no mutual dependencies) MAY be executed in parallel. The implementation MUST guarantee that the observable output is equivalent to a sequential topological-order execution.

### 24.3 Materialization

The implementation MAY use **lazy evaluation** (defer computation until a downstream consumer needs the data) or **eager evaluation** (compute each asset as soon as dependencies are ready). The choice is implementation-defined.

### 24.4 Optimization

The implementation MAY apply optimizations such as:
- **Predicate pushdown** — pushing `where` filters closer to the input.
- **Projection pushdown** — reading only needed columns from input.
- **Fusion** — combining adjacent transformations into a single operation.
- **Caching** — materializing intermediate results consumed by multiple downstream assets.

Optimizations MUST NOT change the observable output of the pipeline.

### 24.5 Error Handling

If any asset fails during execution:
1. The implementation MUST abort all in-progress and pending assets.
2. The implementation MUST NOT write partial results to outputs (outputs are atomic).
3. Post-execution hooks still run (with `TECKEL_PIPELINE_STATUS=FAILURE`).
4. The implementation MUST report the error with the asset name and error code.

---

## 25. Error Catalog

| Code | Category | Description |
|------|----------|-------------|
| `E-REQ-001` | Schema | Missing required field. |
| `E-NAME-001` | Naming | Duplicate AssetRef. |
| `E-NAME-002` | Naming | Invalid AssetRef format. |
| `E-NAME-003` | Naming | Column name collision after rename. |
| `E-REF-001` | Reference | Undefined asset reference. |
| `E-REF-002` | Reference | Invalid output reference (output references output). |
| `E-CYCLE-001` | Reference | Circular dependency detected. |
| `E-FMT-001` | Format | Unknown data format. |
| `E-MODE-001` | Format | Unknown write mode. |
| `E-OP-001` | Transformation | Zero or multiple operation keys in transformation. |
| `E-OP-002` | Transformation | Unknown operation key. |
| `E-LIST-001` | Schema | Empty list where NonEmptyList required. |
| `E-ENUM-001` | Schema | Invalid enum value. |
| `E-COL-001` | Column | Column not found in dataset. |
| `E-JOIN-001` | Join | Ambiguous column reference in join condition. |
| `E-AGG-001` | Aggregation | Non-aggregate expression in group-by output. |
| `E-EXPR-001` | Expression | Expression type mismatch (e.g., non-boolean filter). |
| `E-SCHEMA-001` | Schema | Incompatible schemas in set operation. |
| `E-SCHEMA-002` | Schema | Operation would produce empty schema. |
| `E-SCHEMA-003` | Schema | Unexpected extra columns in strict mode. |
| `E-SCHEMA-004` | Schema | Missing expected columns in strict mode. |
| `E-TYPE-001` | Type | Incompatible types, cannot widen. |
| `E-IO-001` | I/O | Input path not found or unreadable. |
| `E-IO-002` | I/O | Output destination already exists (error mode). |
| `E-VAR-001` | Substitution | Unresolved variable with no default. |
| `E-SECRET-001` | Secrets | Unresolved secret reference. |
| `E-HOOK-001` | Hooks | Pre-execution hook failed (non-zero exit). |
| `E-COMP-001` | Custom | Unregistered custom component. |
| `E-QUALITY-001` | Quality | Assertion or quality check failed (error severity). |
| `E-QUALITY-002` | Quality | Unknown quality check type. |
| `E-QUALITY-003` | Quality | Invalid threshold value (must be 0.0–1.0). |
| `E-QUALITY-004` | Quality | Freshness check failed — data exceeds maxAge. |
| `E-QUALITY-005` | Quality | Referential integrity check failed — values not found in reference asset. |
| `E-META-001` | Metadata | Invalid owner type (expected: technical, business, steward). |
| `E-META-002` | Metadata | Invalid maturity value (expected: high, medium, low, deprecated). |
| `E-META-003` | Metadata | Invalid freshness duration (expected ISO 8601 duration). |
| `E-META-004` | Metadata | Column metadata references non-existent column. |
| `E-EXPOSE-001` | Exposures | Exposure depends_on references undefined asset. |
| `E-EXPOSE-002` | Exposures | Unknown exposure type. |
| `E-VERSION-001` | Version | Missing or unsupported version field. |

Implementations MUST use these error codes in diagnostic messages. Implementations MAY define additional codes prefixed with `E-X-` for implementation-specific errors.

---

## 26. Security Considerations

### 26.1 Expression Injection

The Teckel expression language and SQL pass-through (`sql` transformation) accept arbitrary string expressions. Implementations that construct backend queries from these expressions MUST sanitize inputs to prevent injection attacks (e.g., SQL injection in JDBC sources).

### 26.2 Shell Command Injection

Hooks execute shell commands. The `command` field MUST NOT be constructed from user-provided variable substitutions without proper escaping. Implementations SHOULD execute hooks via `sh -c` (or equivalent) with the command as a single string argument, not via shell interpolation of user inputs.

### 26.3 Secret Exposure

- Secret values MUST NOT appear in log output, error messages, or diagnostic dumps.
- Implementations MUST NOT write secret values to temporary files.
- When displaying the resolved YAML (e.g., debug mode), secret placeholders MUST be shown as `{{secrets.<alias>}}` or `***`, never as the resolved value.

### 26.4 HTTP Enrichment

The `enrich` transformation makes outbound HTTP requests. Implementations MUST:
- Validate that the `url` uses `https://` in production configurations. HTTP (`http://`) SHOULD produce a warning.
- Respect the `timeout` and `maxRetries` limits to prevent resource exhaustion.
- Not follow redirects to different domains without explicit configuration.

### 26.5 Path Traversal

Input and output `path` values MUST be validated to prevent path traversal attacks (e.g., `../../etc/passwd`). Implementations SHOULD restrict file access to a configurable set of allowed directories.

### 26.6 Resource Limits

Implementations SHOULD enforce configurable limits on:
- Maximum number of assets in a pipeline.
- Maximum depth of the DAG.
- Maximum number of enrich API calls per pipeline execution.
- Maximum total data size read/written.

---

## 27. Conformance

### 27.1 Conformance Levels

| Level | Sections Required |
|-------|-------------------|
| **Core** | 1–7 (document structure, input, output), 8.1–8.10 (basic transformations), 9 (expression language — grammar, precedence, core aggregates and comparison operators), 10 (data types — simple types only), 11 (null semantics), 12 (variable substitution), 22 (path resolution), 23 (validation rules), 24 (execution model), 25 (error catalog). |
| **Extended** | Core + 8.11–8.31 (all transformations), 9.13 (all core functions), 10 (all data types including parameterized), 13 (secrets), 14 (configuration), 16 (hooks), 17 (data quality), 18 (metadata), 19 (exposures), 21 (config merging). |
| **Streaming** | Extended + 15 (streaming inputs and outputs). |

### 27.2 Conformance Declaration

An implementation claiming conformance MUST:
1. State the conformance level (Core, Extended, or Streaming).
2. List any OPTIONAL features that are NOT supported.
3. Document any implementation-specific extensions (additional formats, functions, transformations).
4. Pass the conformance test suite for the claimed level (when available).

### 27.3 Extension Mechanism

- **Top-level keys** prefixed with `x-` are extension keys. Implementations MUST ignore unrecognized `x-` keys without error.
- **Custom transformations** are handled via the `custom` operation key ([Section 8.31](#831-custom)).
- **Additional functions** in the expression language are permitted but MUST NOT shadow core functions.

### 27.4 Forward Compatibility

A document with `version: "3.0"` processed by a runtime supporting a later version (e.g., 3.1) MUST be processed according to v3.0 rules. A document with an unrecognized version MUST be rejected with `E-VERSION-001`.

---

## Appendix A: EBNF Grammar Summary

This appendix collects all grammar productions from the specification in one place.

### A.1 Asset References

```ebnf
asset_ref = letter, { letter | digit | "_" | "-" } ;
letter    = "A" | "B" | ... | "Z" | "a" | "b" | ... | "z" ;
digit     = "0" | "1" | ... | "9" ;
```

### A.2 Column References

```ebnf
column_ref       = unqualified_ref | qualified_ref ;
unqualified_ref  = identifier ;
qualified_ref    = asset_ref, ".", identifier ;
identifier       = letter, { letter | digit | "_" }
                 | "`", { any_char - "`" }, "`" ;
```

### A.3 Expressions

```ebnf
expression     = or_expr, [ "as", identifier ] ;
or_expr        = and_expr, { "OR", and_expr } ;
and_expr       = not_expr, { "AND", not_expr } ;
not_expr       = [ "NOT" ], comparison ;
comparison     = addition, [ comp_op, addition ]
               | addition, "IS", [ "NOT" ], "NULL"
               | addition, [ "NOT" ], "IN", "(", expression_list, ")"
               | addition, [ "NOT" ], "BETWEEN", addition, "AND", addition
               | addition, [ "NOT" ], "LIKE", string_literal
               | addition, [ "NOT" ], "RLIKE", string_literal ;
comp_op        = "=" | "!=" | "<>" | "<" | ">" | "<=" | ">=" | "<=>" ;
addition       = multiplication, { ( "+" | "-" | "||" ), multiplication } ;
multiplication = unary, { ( "*" | "/" | "%" ), unary } ;
unary          = [ "-" | "~" ], postfix ;
postfix        = primary, { ".", identifier | "[", expression, "]" } ;
primary        = literal | column_ref | star_expr | function_call
               | lambda_expr | case_expr | cast_expr | window_expr
               | "(", expression, ")" ;
star_expr      = [ identifier, "." ], "*" ;
literal        = string_literal | integer_literal | double_literal
               | boolean_literal | null_literal | typed_literal | complex_literal ;
string_literal  = "'", { any_char - "'" | "''" }, "'" ;
integer_literal = [ "-" ], digit, { digit } ;
double_literal  = [ "-" ], digit, { digit }, ".", digit, { digit } ;
boolean_literal = "true" | "false" ;
null_literal    = "NULL" | "null" ;
typed_literal  = "DATE", string_literal
               | "TIMESTAMP", string_literal
               | "TIMESTAMP_NTZ", string_literal
               | "X", string_literal
               | interval_literal ;
interval_literal = "INTERVAL", interval_value, interval_unit,
                   { interval_value, interval_unit } ;
interval_value   = [ "-" ], digit, { digit }, [ ".", digit, { digit } ] ;
interval_unit    = "YEAR" | "YEARS" | "MONTH" | "MONTHS"
                 | "DAY" | "DAYS" | "HOUR" | "HOURS"
                 | "MINUTE" | "MINUTES" | "SECOND" | "SECONDS" ;
complex_literal = "ARRAY", "(", [ expression_list ], ")"
                | "MAP", "(", [ expression, ",", expression,
                    { ",", expression, ",", expression } ], ")"
                | "STRUCT", "(", [ expression_list ], ")"
                | "NAMED_STRUCT", "(", [ string_literal, ",", expression,
                    { ",", string_literal, ",", expression } ], ")" ;
column_ref     = identifier, [ ".", identifier ] ;
function_call  = identifier, "(", [ function_args ], ")" ;
function_args  = [ "DISTINCT" ], arg_list ;
arg_list       = argument, { ",", argument } ;
argument       = named_argument | expression ;
named_argument = identifier, "=>", expression ;
expression_list = expression, { ",", expression } ;
lambda_expr    = lambda_params, "->", expression ;
lambda_params  = identifier | "(", identifier, { ",", identifier }, ")" ;
case_expr      = "CASE", { "WHEN", expression, "THEN", expression },
                 [ "ELSE", expression ], "END" ;
cast_expr      = "CAST", "(", expression, "AS", type_name, ")"
               | "TRY_CAST", "(", expression, "AS", type_name, ")" ;
window_expr    = function_call, "OVER", "(", window_spec, ")" ;
window_spec    = [ "PARTITION", "BY", expression_list ],
                 [ "ORDER", "BY", sort_list ],
                 [ frame_clause ] ;
sort_list      = sort_item, { ",", sort_item } ;
sort_item      = expression, [ "ASC" | "DESC" ], [ "NULLS", ( "FIRST" | "LAST" ) ] ;
frame_clause   = ( "ROWS" | "RANGE" ), "BETWEEN", frame_bound, "AND", frame_bound ;
frame_bound    = "UNBOUNDED", "PRECEDING"
               | "UNBOUNDED", "FOLLOWING"
               | "CURRENT", "ROW"
               | expression, "PRECEDING"
               | expression, "FOLLOWING" ;
```

### A.4 Type Names

```ebnf
type_name          = simple_type | parameterized_type ;
simple_type        = "string" | "byte" | "tinyint" | "short" | "smallint"
                   | "integer" | "int" | "long" | "bigint" | "float"
                   | "double" | "boolean" | "date" | "timestamp"
                   | "timestamp_ntz" | "binary" | "variant" | "time" ;
parameterized_type = "decimal", "(", integer_literal, ",", integer_literal, ")"
                   | "char", "(", integer_literal, ")"
                   | "varchar", "(", integer_literal, ")"
                   | "time", "(", integer_literal, ")"
                   | "array", "<", type_name, ">"
                   | "map", "<", type_name, ",", type_name, ">"
                   | "struct", "<", struct_fields, ">"
                   | "interval", interval_qualifier ;
struct_fields      = struct_field, { ",", struct_field } ;
struct_field        = identifier, ":", type_name ;
interval_qualifier = "year", [ "to", "month" ]
                   | "month"
                   | "day", [ "to", ( "hour" | "minute" | "second" ) ]
                   | "hour", [ "to", ( "minute" | "second" ) ]
                   | "minute", [ "to", "second" ]
                   | "second" ;
```

### A.5 Variable Substitution

```ebnf
variable        = "${", var_name, [ ":", default_value ], "}" ;
var_name        = identifier_char, { identifier_char } ;
identifier_char = letter | digit | "_" | "." ;
default_value   = { any_char - "}" } ;
escaped_dollar  = "$$" ;
```

### A.6 Secret References

```ebnf
secret_ref = "{{", "secrets", ".", alias, "}}" ;
alias      = letter, { letter | digit | "_" | "-" } ;
```

---

## Appendix B: JSON Schema

A machine-readable JSON Schema for validating Teckel v3.0 documents is published alongside this specification at:

```
spec/v3.0/teckel-schema.json
```

See the companion file for the complete schema definition.

---

## Appendix C: Complete Examples

### C.1 Basic ETL: CSV to Parquet

```yaml
version: "3.0"

input:
  - name: raw
    format: csv
    path: "data/csv/employees.csv"
    options:
      header: true
      sep: ","

output:
  - name: raw
    format: parquet
    mode: overwrite
    path: "data/parquet/employees"
```

### C.2 Multi-step Pipeline with All Core Transformations

```yaml
version: "3.0"

input:
  - name: employees
    format: csv
    path: "data/csv/employees.csv"
    options:
      header: true
      sep: ","

  - name: departments
    format: parquet
    path: "data/parquet/departments"

transformation:
  # Filter active employees
  - name: active
    where:
      from: employees
      filter: "status = 'active'"

  # Join with departments
  - name: enriched
    join:
      left: active
      right:
        - name: departments
          type: inner
          on:
            - "active.dept_id = departments.id"

  # Select relevant columns
  - name: projected
    select:
      from: enriched
      columns:
        - "active.name"
        - "active.salary"
        - "departments.dept_name"

  # Aggregate by department
  - name: summary
    group:
      from: projected
      by:
        - dept_name
      agg:
        - "count(1) as headcount"
        - "avg(salary) as avg_salary"
        - "sum(salary) as total_salary"

  # Sort by total salary descending
  - name: ranked
    orderBy:
      from: summary
      columns:
        - column: total_salary
          direction: desc

  # Top 10 departments
  - name: top10
    limit:
      from: ranked
      count: 10

output:
  - name: top10
    format: parquet
    mode: overwrite
    path: "data/output/top_departments"
```

### C.3 Pipeline with Extended Features

```yaml
version: "3.0"

config:
  cache:
    autoCacheThreshold: 2

secrets:
  keys:
    api_token:
      key: enrichment-api-token

input:
  - name: orders
    format: parquet
    path: "${INPUT_BASE}/orders"

  - name: customers
    format: parquet
    path: "${INPUT_BASE}/customers"

transformation:
  # Data quality checks
  - name: validOrders
    assertion:
      from: orders
      checks:
        - column: order_id
          rule: not_null
          description: "Order ID must not be null"
        - column: amount
          rule: "amount > 0"
          description: "Amount must be positive"
      onFailure: drop

  # Split by amount
  - name: splitOrders
    split:
      from: validOrders
      condition: "amount > 1000"
      pass: highValueOrders
      fail: standardOrders

  # Enrich high-value orders
  - name: enrichedHV
    enrich:
      from: highValueOrders
      url: "https://api.example.com/v1/risk-score"
      keyColumn: customer_id
      responseColumn: risk_score
      headers:
        Authorization: "Bearer {{secrets.api_token}}"
      onError: "null"

  # Add category column
  - name: categorized
    conditional:
      from: enrichedHV
      outputColumn: risk_category
      branches:
        - condition: "risk_score > 80"
          value: "'high_risk'"
        - condition: "risk_score > 50"
          value: "'medium_risk'"
      otherwise: "'low_risk'"

  # Window function for ranking
  - name: ranked
    window:
      from: categorized
      partitionBy: [risk_category]
      orderBy:
        - column: amount
          direction: desc
      functions:
        - expression: "row_number()"
          alias: rank_in_category

output:
  - name: ranked
    format: parquet
    mode: overwrite
    path: "${OUTPUT_BASE}/high_value_analysis"

  - name: standardOrders
    format: parquet
    mode: overwrite
    path: "${OUTPUT_BASE}/standard_orders"
```

---

## Appendix D: Changelog

### v2.0 (2026-03-27)

- Initial formal specification.
- Adopted RFC 2119 requirement levels.
- Added EBNF grammar for expression language with operator precedence.
- Defined null semantics (SQL three-valued logic).
- Made `version` field REQUIRED.
- Renamed `order` transformation to `orderBy` to fix name collision.
- Added per-column sort direction and null placement in `orderBy`.
- Redesigned `sql` transformation: replaced `from` with explicit `views` list.
- Redesigned `scd2` transformation: dual input (`current`/`incoming`) instead of single `from`.
- Clarified output identity: outputs are sinks, not referenceable assets.
- Clarified split produces two named assets; the split `name` is not referenceable.
- Defined schema compatibility rules for set operations (positional matching, type widening).
- Added window frame specification (`frame` field with `type`/`start`/`end`).
- Added `onError`, `timeout`, `maxRetries` to enrich transformation.
- Added variable escaping (`$$`), secret escaping, single-pass substitution rule.
- Defined path resolution semantics (relative to working directory).
- Added security considerations section.
- Added error catalog with standardized error codes.
- Added formal validation rules.
- Added execution model (parallelism, optimization, error handling).
- Added hook execution environment variables.
- Added `x-` extension mechanism for forward compatibility.
- Defined struct syntax: `struct<name: type, ...>`.
- Added `count(*)` and `count(DISTINCT expr)` to core functions.
- Added additional core functions: `replace`, `floor`, `ceil`, `power`, `sqrt`, `date_add`, `date_diff`, `to_date`, `to_timestamp`, `nullif`, `ifnull`, `ntile`, `first_value`, `last_value`.
- Added Data Quality section (17): quality suites with 10 check types — schema, completeness, uniqueness, validity, statistical, volume, freshness, referential integrity, cross-column, custom. Threshold-based (soft) checks, severity levels (error/warn/info), conditional escalation, built-in format validators (email, UUID, URL, IPv4, IPv6, date, timestamp, phone).
- Added Metadata section (18): pipeline-level, asset-level, and column-level metadata. Owner with role types (technical/business/steward), tags with automatic downstream propagation, open `meta` extension map, freshness SLA (ISO 8601 duration), maturity lifecycle, column constraints, glossary terms, asset URN scheme, lineage export, catalog integration.
- Added Exposures section (19): downstream consumer declarations (dashboard, notebook, ML, application, pipeline). Enables bidirectional impact analysis.
- Added `pipeline` top-level key for pipeline-level metadata.
- Added `quality` top-level key for data quality suites.
- Added `exposures` top-level key for downstream consumers.
- Added metadata fields to Input: `description`, `tags`, `meta`, `owner`, `columns`.
- Added metadata fields to Output: `description`, `tags`, `meta`, `freshness`, `maturity`.
- Added `removeTags` field to transformations for explicit tag de-propagation.
- Added 11 new error codes for quality, metadata, and exposures.
