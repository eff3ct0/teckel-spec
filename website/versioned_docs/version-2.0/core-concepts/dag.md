# The Pipeline as a DAG

Every Teckel pipeline is a **directed acyclic graph** (DAG). Understanding this is essential to writing correct pipelines, because the DAG — not the textual order of your YAML — determines how and when each step executes.

![DAG execution model](/img/diagrams/dag-execution.svg)

## Nodes and Edges

A Teckel document defines three kinds of assets, and each becomes a node in the graph:

- **Inputs** are source nodes. They have no incoming edges — they read data from external systems.
- **Transformations** are intermediate nodes. They consume data from upstream assets and produce new datasets.
- **Outputs** are sink nodes. They write data to external storage but do not produce datasets that other assets can reference.

Edges represent data dependencies. When a transformation declares `from: orders`, that creates an edge from the `orders` asset to that transformation. When an output has `name: clean_orders`, that creates an edge from the `clean_orders` asset to the output.

## A Sample DAG

Consider this pipeline:

```yaml
version: "2.0"

input:
  - name: orders
    format: csv
    path: "data/orders.csv"
    options: { header: true }

  - name: products
    format: parquet
    path: "data/products.parquet"

  - name: regions
    format: json
    path: "data/regions.json"

transformation:
  - name: enriched_orders
    join:
      left: orders
      right: products
      on: "orders.product_id = products.id"
      type: left

  - name: regional_sales
    join:
      left: enriched_orders
      right: regions
      on: "enriched_orders.region_code = regions.code"
      type: inner

  - name: top_products
    select:
      from: enriched_orders
      columns: [product_name, total_amount]

output:
  - name: regional_sales
    format: parquet
    mode: overwrite
    path: "data/output/regional_sales/"

  - name: top_products
    format: csv
    mode: overwrite
    path: "data/output/top_products.csv"
    options: { header: true }
```

The resulting DAG looks like this:

```
  orders       products       regions
    \           /                |
     \         /                 |
    enriched_orders              |
      /         \                |
     /           \               |
top_products   regional_sales <--+
     |               |
  [output:         [output:
   csv]            parquet]
```

There are three independent source nodes. `enriched_orders` depends on both `orders` and `products`. `regional_sales` depends on `enriched_orders` and `regions`. `top_products` depends only on `enriched_orders`. The two outputs each reference one transformation.

## Textual Order Does Not Matter

The order in which you list assets in the YAML file has **no semantic significance**. Only the data dependencies determine execution order. You could list `regional_sales` before `enriched_orders` in the YAML and the pipeline would behave identically — the runtime resolves the correct order from the graph.

This is valid and produces the same result as the example above:

```yaml
transformation:
  - name: regional_sales        # listed first, but depends on enriched_orders
    join:
      left: enriched_orders
      right: regions
      on: "enriched_orders.region_code = regions.code"
      type: inner

  - name: enriched_orders       # listed second, but executes first
    join:
      left: orders
      right: products
      on: "orders.product_id = products.id"
      type: left
```

> **Note:** While textual order does not affect execution, listing assets in roughly dependency order makes your YAML easier for humans to read.

## Topological Execution

The runtime resolves the DAG using **topological sort**. This algorithm processes nodes in an order where every asset is computed before any asset that depends on it. The steps are:

1. Identify all source nodes (inputs) — these have no dependencies.
2. Execute source nodes.
3. For each remaining asset, check whether all upstream dependencies have been computed.
4. Execute eligible assets.
5. Repeat until all assets are processed.

If the graph contains a cycle (A depends on B, B depends on A), the pipeline is invalid and fails with error `E-CYCLE-001`.

## Parallelism

Independent branches of the DAG may execute in parallel. In the sample above, after `enriched_orders` completes, both `top_products` and `regional_sales` become eligible at the same time — a runtime is free to execute them concurrently.

Similarly, all three inputs (`orders`, `products`, `regions`) have no dependencies on each other and can be read in parallel.

The runtime guarantees that the observable output is equivalent to sequential topological-order execution, regardless of how much parallelism it applies.

## Lazy vs. Eager Evaluation

The specification does not mandate when intermediate datasets are materialized. A runtime may use:

- **Lazy evaluation** — defer computation until a downstream consumer needs the data. This is how Apache Spark works by default.
- **Eager evaluation** — compute each asset as soon as its dependencies are ready, storing intermediate results.

Either strategy is valid as long as the final outputs are correct.

## Optimizations

A conforming runtime may apply optimizations that do not change the observable output:

- **Predicate pushdown** — moving `where` filters closer to the input to reduce data read.
- **Projection pushdown** — reading only the columns needed by downstream transformations.
- **Fusion** — combining adjacent transformations into a single operation.
- **Caching** — materializing intermediate results that are consumed by multiple downstream assets (like `enriched_orders` in our example, which feeds both `top_products` and `regional_sales`).

## Error Handling

If any asset fails during execution:

1. All in-progress and pending assets are aborted.
2. No partial results are written to outputs — outputs are atomic.
3. The runtime reports the error with the asset name and error code.

This means a failure anywhere in the DAG prevents any output from being written, ensuring you never end up with inconsistent partial results.

## Flat Namespace

All asset names share a single, flat namespace within a document. An input named `data` and a transformation named `data` would conflict — the pipeline rejects this with error `E-NAME-001`. Output names do not create new entries in the namespace; they reference existing ones.

This flat namespace makes references unambiguous: when a transformation says `from: orders`, there is exactly one asset with that name.
