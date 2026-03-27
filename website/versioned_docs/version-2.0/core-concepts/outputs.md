# Output Sinks

An output defines where a pipeline writes its results. Unlike inputs and transformations, outputs do not create new assets — they are **sinks** that reference an existing asset and persist its dataset to external storage.

## Anatomy of an Output

```yaml
output:
  - name: enrichedSales
    format: parquet
    mode: overwrite
    path: "data/output/enriched_sales"
```

The `name` field is the key concept: it must match the name of an existing input or transformation. The output takes whatever dataset that asset produces and writes it to the specified `path`.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `name` | AssetRef | Yes | — | Must match the name of an input or transformation asset. |
| `format` | string | Yes | — | Output data format (same values as input formats). |
| `path` | string | Yes | — | Destination path or URI. |
| `mode` | string | No | `"error"` | Write mode (see below). |
| `options` | Map | No | `{}` | Format-specific key-value options. |
| `description` | string | No | — | Human-readable description. |
| `tags` | List[string] | No | `[]` | Classification labels. |
| `meta` | Map | No | `{}` | Open key-value metadata. |
| `freshness` | string | No | — | Expected update frequency (ISO 8601 duration). |
| `maturity` | string | No | — | Data maturity level. |

## Outputs Reference Existing Assets

This is the most important rule about outputs: the `name` field does not create a new asset. It points to one that already exists.

```yaml
input:
  - name: raw_orders
    format: csv
    path: "data/orders.csv"
    options:
      header: true

transformation:
  - name: clean_orders
    select:
      from: raw_orders
      columns: [order_id, customer_id, amount]

output:
  - name: clean_orders          # <-- references the transformation above
    format: parquet
    mode: overwrite
    path: "data/output/clean_orders/"
```

Other transformations cannot reference an output by name. Outputs are terminal nodes in the DAG.

> **Note:** Multiple outputs can reference the same asset. Each writes independently, so you can write the same dataset to different formats or locations.

## Write Modes

The `mode` field controls what happens when the destination already contains data.

| Mode | Behavior |
|------|----------|
| `error` | Fail if the destination already exists. This is the default. |
| `overwrite` | Replace any existing data at the destination. |
| `append` | Add new data to the existing destination. |
| `ignore` | Do nothing if the destination already exists. The write is silently skipped. |

Choose the mode that matches your pipeline's semantics:

```yaml
# Overwrite a daily snapshot
output:
  - name: daily_summary
    format: parquet
    mode: overwrite
    path: "data/output/daily_summary/"

# Append to an event log
output:
  - name: processed_events
    format: parquet
    mode: append
    path: "data/output/event_log/"

# Write only if the destination is empty
output:
  - name: initial_load
    format: csv
    mode: ignore
    path: "data/output/bootstrap.csv"
    options:
      header: true
```

> **Note:** If you omit `mode`, it defaults to `"error"`. This is the safest default — it prevents accidental overwrites.

## Metadata Fields

Outputs support two metadata fields that inputs do not have: `freshness` and `maturity`. These document the operational expectations for the output dataset.

### Freshness

The `freshness` field declares how often this output is expected to be updated, using ISO 8601 duration syntax.

```yaml
output:
  - name: daily_report
    format: parquet
    mode: overwrite
    path: "data/output/daily_report/"
    freshness: "PT24H"            # expected every 24 hours
```

Common duration values:

| Duration | Meaning |
|----------|---------|
| `PT1H` | Every hour |
| `PT24H` | Every 24 hours (daily) |
| `P7D` | Every 7 days (weekly) |

### Maturity

The `maturity` field indicates the reliability and stability of the output data. Valid values are:

| Value | Meaning |
|-------|---------|
| `high` | Production-grade, well-tested, stable schema. |
| `medium` | Functional but may change. |
| `low` | Experimental or under development. |
| `deprecated` | Scheduled for removal. Consumers should migrate away. |

```yaml
output:
  - name: fact_sales
    format: delta
    mode: overwrite
    path: "s3://lake/gold/fact_sales"
    maturity: "high"
    freshness: "PT24H"
    description: "Aggregated daily sales facts for BI dashboards."
    tags: ["gold", "sales", "production"]
```

## A Complete Example

Putting it all together — a pipeline that reads two sources, transforms them, and writes two outputs:

```yaml
version: "2.0"

input:
  - name: orders
    format: csv
    path: "data/orders.csv"
    options:
      header: true

  - name: products
    format: parquet
    path: "data/products.parquet"

transformation:
  - name: enriched_orders
    join:
      left: orders
      right: products
      on: "orders.product_id = products.id"
      type: left

output:
  - name: enriched_orders
    format: parquet
    mode: overwrite
    path: "data/output/enriched_orders/"
    description: "Orders enriched with product details."
    freshness: "PT24H"
    maturity: "high"
    tags: ["silver", "orders"]

  - name: orders
    format: csv
    mode: append
    path: "data/backup/raw_orders/"
    options:
      header: true
    description: "Raw backup of incoming orders."
    maturity: "low"
```

## Semantics

- Writing an empty dataset (zero rows) is valid. The behavior depends on the format — Parquet writes an empty file with schema, CSV with `header: true` writes a header-only file.
- If an output references a name that does not exist as an input or transformation, the pipeline fails with error `E-REF-001`.
- Outputs are atomic: if the pipeline fails, partial results are not written.
