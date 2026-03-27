# Your First Pipeline

This chapter walks you through building a Teckel pipeline from scratch. We will start with the simplest case and progressively add transformations.

## Step 1: Read and Write (Format Conversion)

The most basic pipeline reads data from one format and writes it in another. Here we read a CSV of sales records and write them as Parquet:

```yaml
version: "2.0"

input:
  - name: sales
    format: csv
    path: "data/sales.csv"
    options:
      header: true
      inferSchema: true

output:
  - name: sales
    format: parquet
    path: "data/output/sales_parquet"
    mode: overwrite
```

A few things to notice:

- `version` is always required. For the current spec, it must be `"2.0"`.
- The `output` name matches the `input` name. This is how Teckel connects them — the output is a **sink** that writes the dataset produced by the named asset.
- `mode: overwrite` means the output directory will be replaced on each run. The default mode is `error`, which fails if the destination already exists.

> **Note:** The `header` and `inferSchema` options are passed directly to the CSV reader. Teckel supports any key-value options your runtime understands.

## Step 2: Add a Filter

Now suppose you only want sales from 2025 onward. Add a `where` transformation between input and output:

```yaml
version: "2.0"

input:
  - name: sales
    format: csv
    path: "data/sales.csv"
    options:
      header: true
      inferSchema: true

transformation:
  - name: recentSales
    where:
      from: sales
      filter: "year >= 2025"

output:
  - name: recentSales
    format: parquet
    path: "data/output/recent_sales"
    mode: overwrite
```

What changed:

- A `transformation` section appeared with one entry named `recentSales`.
- The `where` operation reads from the `sales` input (`from: sales`) and keeps only rows where the condition is true.
- The output now references `recentSales` instead of `sales` — it writes the filtered dataset, not the raw input.

> **Note:** The order of `input`, `transformation`, and `output` sections in the YAML file does not matter. Teckel determines execution order from data dependencies, not from the position in the file.

## Step 3: Add a Group By

Let's go further and aggregate the filtered sales by region:

```yaml
version: "2.0"

input:
  - name: sales
    format: csv
    path: "data/sales.csv"
    options:
      header: true
      inferSchema: true

transformation:
  - name: recentSales
    where:
      from: sales
      filter: "year >= 2025"

  - name: salesByRegion
    group:
      from: recentSales
      by:
        - region
      agg:
        - "sum(amount) as total_amount"
        - "count(1) as num_transactions"
        - "avg(amount) as avg_amount"

output:
  - name: salesByRegion
    format: parquet
    path: "data/output/sales_by_region"
    mode: overwrite
```

Now the pipeline has three stages:

1. **sales** (input) — read the raw CSV.
2. **recentSales** (transformation) — filter to 2025+.
3. **salesByRegion** (transformation) — group by region and compute aggregates.

The output writes the final aggregated dataset. Notice how each transformation refers to the previous one via `from`. This chain of references is what builds the DAG.

## Step 4: Add a Select and Sort

Let's polish the output by selecting specific columns and sorting by total amount:

```yaml
version: "2.0"

input:
  - name: sales
    format: csv
    path: "data/sales.csv"
    options:
      header: true
      inferSchema: true

transformation:
  - name: recentSales
    where:
      from: sales
      filter: "year >= 2025"

  - name: salesByRegion
    group:
      from: recentSales
      by:
        - region
      agg:
        - "sum(amount) as total_amount"
        - "count(1) as num_transactions"

  - name: topRegions
    orderBy:
      from: salesByRegion
      columns:
        - column: total_amount
          direction: desc

output:
  - name: topRegions
    format: parquet
    path: "data/output/top_regions"
    mode: overwrite
```

The `orderBy` transformation sorts rows by `total_amount` in descending order, so the highest-revenue regions appear first.

## Step 5: Multiple Outputs

A single pipeline can produce multiple outputs from different stages of the DAG. For example, you might want both the detailed filtered data and the summary:

```yaml
output:
  - name: recentSales
    format: parquet
    path: "data/output/recent_sales_detail"
    mode: overwrite

  - name: topRegions
    format: parquet
    path: "data/output/top_regions_summary"
    mode: overwrite
```

Both `recentSales` and `topRegions` are valid asset names from the transformation section, so both can be written out independently.

## Step 6: Adding a Join

Pipelines often need to combine data from multiple sources. Here is how to enrich sales with customer information:

```yaml
version: "2.0"

input:
  - name: sales
    format: csv
    path: "data/sales.csv"
    options:
      header: true

  - name: customers
    format: csv
    path: "data/customers.csv"
    options:
      header: true

transformation:
  - name: enrichedSales
    join:
      left: sales
      right:
        - name: customers
          type: inner
          on:
            - "sales.customer_id = customers.id"

output:
  - name: enrichedSales
    format: parquet
    path: "data/output/enriched_sales"
    mode: overwrite
```

> **Warning:** Join conditions require **qualified column references** — you must prefix column names with the asset name (e.g., `sales.customer_id`). Unqualified references in join conditions will produce an error.

## What's Next

You now know the core pattern: define inputs, chain transformations using `from` references, and write outputs. From here you can explore:

- [Document Structure](./document-structure.md) to understand all the top-level keys.
- [Naming and References](./naming.md) to learn the rules for asset names and column references.
- The **Transformations** section for the full catalog of operations (window functions, pivots, set operations, and more).
