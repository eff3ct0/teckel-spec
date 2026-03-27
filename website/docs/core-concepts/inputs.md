# Input Sources

An input defines a data source that Teckel reads into the pipeline. Every input becomes a named asset that transformations and outputs can reference downstream.

## Anatomy of an Input

Each input requires three fields: a unique `name`, a `format`, and a `path`. Everything else is optional.

```yaml
input:
  - name: employees
    format: csv
    path: "data/csv/employees.csv"
    options:
      header: true
      sep: "|"
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | AssetRef | Yes | Unique identifier for this asset. Must start with a letter and contain only letters, digits, underscores, and hyphens. |
| `format` | string | Yes | Data format identifier (see below). |
| `path` | string | Yes | File path, URI, or connection string. |
| `options` | Map | No | Format-specific key-value pairs passed to the reader. |
| `description` | string | No | Human-readable description. Supports Markdown. |
| `tags` | List[string] | No | Classification labels for organizing assets. |
| `meta` | Map | No | Open key-value metadata for any purpose. |
| `owner` | Owner | No | Asset-level owner override (name and email). |
| `columns` | List | No | Column-level metadata declarations. |

## Supported Formats

### Core Formats

Every Teckel implementation must support these three formats.

**CSV** — Comma-separated values. The most common format for flat files. Use the `options` map to control delimiters, headers, encoding, and schema inference.

```yaml
input:
  - name: transactions
    format: csv
    path: "data/transactions.csv"
    options:
      header: true
      sep: ","
      inferSchema: true
```

**JSON** — JSON or JSON Lines (newline-delimited JSON). Works with both single JSON documents and files where each line is a separate JSON object.

```yaml
input:
  - name: events
    format: json
    path: "data/events.jsonl"
```

**Parquet** — Apache Parquet columnar format. Parquet files carry their own schema, so you rarely need options.

```yaml
input:
  - name: departments
    format: parquet
    path: "s3://bucket/departments/"
```

### Extended Formats

These formats are supported by extended implementations.

**Delta** — Delta Lake format, with support for ACID transactions and time travel.

```yaml
input:
  - name: accounts
    format: delta
    path: "s3://lake/bronze/accounts"
```

**JDBC** — Read directly from a relational database via JDBC.

```yaml
input:
  - name: customers
    format: jdbc
    path: "jdbc:postgresql://host:5432/mydb"
    options:
      dbtable: "public.customers"
      user: "${DB_USER}"
      password: "{{secrets.db_password}}"
```

Other extended formats include `orc` (Apache ORC) and `avro` (Apache Avro).

## Common CSV Options

CSV is the format that benefits most from reader options. Here is the full table of standard options.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `header` | boolean | `false` | First row contains column names. |
| `sep` | string | `","` | Field delimiter character. |
| `encoding` | string | `"UTF-8"` | Character encoding. |
| `inferSchema` | boolean | `false` | Infer column types from data. |
| `quote` | string | `"\""` | Quote character. |
| `escape` | string | `"\\"` | Escape character within quotes. |
| `nullValue` | string | `""` | String representation of null. |

> **Note:** Implementations may support additional options beyond this table. Unknown options are passed through to the underlying reader.

## Simple vs. Complex Inputs

A minimal input needs only three lines:

```yaml
input:
  - name: products
    format: parquet
    path: "data/products.parquet"
```

A fully documented input with metadata, column descriptions, and reader options looks like this:

```yaml
input:
  - name: employees
    format: csv
    path: "data/csv/employees.csv"
    description: "Employee master data exported from HR system."
    tags: ["hr", "pii", "daily"]
    owner:
      name: "Data Engineering"
      email: "data-eng@company.com"
    options:
      header: true
      sep: "|"
      encoding: "UTF-8"
      inferSchema: true
      nullValue: "N/A"
    columns:
      - name: employee_id
        description: "Unique employee identifier"
        constraints: ["not_null", "unique"]
      - name: department
        description: "Department code"
        tags: ["dimension"]
```

Both forms are valid. Start simple and add metadata as your pipeline matures.

## Multiple Inputs

A pipeline typically reads from several sources. List them all under the `input` key:

```yaml
input:
  - name: orders
    format: csv
    path: "data/orders.csv"
    options:
      header: true

  - name: products
    format: parquet
    path: "s3://warehouse/products/"

  - name: regions
    format: json
    path: "data/regions.json"
```

Each input becomes an independent node in the pipeline DAG. Transformations can then reference any of these by name.

## Semantics

- Reading an input that produces zero rows is valid. The resulting dataset has the schema but no data.
- If the path does not exist or is unreadable, the pipeline fails with error `E-IO-001`.
- Option values must be primitives: strings, booleans, integers, or doubles. YAML native types are respected — `true` is boolean, `"true"` is the string literal, `42` is an integer.
