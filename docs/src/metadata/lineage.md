# Lineage

Teckel pipelines define a directed acyclic graph (DAG) of assets. Lineage -- the record of how data flows from sources through transformations to outputs -- is implicit in this DAG structure. Every `from`, `left`, `right`, `sources`, `views`, `current`, and `incoming` field is a lineage edge.

## Implicit Lineage from the DAG

You do not need to declare lineage explicitly. The pipeline definition itself is the lineage graph.

```yaml
input:
  - name: raw_orders
    format: parquet
    path: "data/orders"

  - name: raw_customers
    format: parquet
    path: "data/customers"

transformation:
  - name: enriched_orders
    join:
      left: raw_orders
      right: raw_customers
      on: "raw_orders.customer_id = raw_customers.id"
      type: inner

  - name: daily_revenue
    groupBy:
      from: enriched_orders
      columns: [order_date]
      aggregations:
        - column: amount
          function: sum
          alias: total_revenue

output:
  - name: revenue_output
    format: parquet
    path: "output/revenue"
    from: daily_revenue
```

The lineage graph derived from this pipeline:

```
raw_orders ──────┐
                 ├──> enriched_orders ──> daily_revenue ──> revenue_output
raw_customers ───┘
```

A conforming implementation can traverse this graph to answer:

- **Upstream impact:** What feeds `daily_revenue`? Answer: `enriched_orders`, which depends on `raw_orders` and `raw_customers`.
- **Downstream impact:** What breaks if `raw_customers` changes? Answer: `enriched_orders`, `daily_revenue`, and `revenue_output`.

## Asset URN Scheme

When a `pipeline.namespace` is declared, each asset gets a globally unique identifier (URN):

```
teckel://<namespace>/<asset_name>
```

### Examples

Given `pipeline.namespace: com.company.finance`:

| Asset | URN |
|-------|-----|
| `raw_orders` | `teckel://com.company.finance/raw_orders` |
| `enriched_orders` | `teckel://com.company.finance/enriched_orders` |
| `daily_revenue` | `teckel://com.company.finance/daily_revenue` |

### URN Usage

Implementations should use these URNs when:

- Emitting lineage events to external systems.
- Registering assets in data catalogs.
- Referencing assets across pipelines (e.g., in exposures of type `pipeline`).

### Declaring the Namespace

```yaml
pipeline:
  name: Revenue Pipeline
  namespace: com.company.finance
```

Without a namespace, URNs are not generated. Asset names remain local to the pipeline.

## Dataset-Level vs Column-Level Lineage

Teckel defines **dataset-level lineage** explicitly through the DAG structure. Every edge in the graph (each `from`, `join`, `union`, etc.) is a dataset-level lineage relationship.

**Column-level lineage** -- which output columns derive from which input columns -- is NOT declared in the YAML. It is **inferred** by the runtime from the transformation semantics. For example, a `select` with explicit column references allows the runtime to determine that `output.total_revenue` derives from `input.amount`.

## OpenLineage Compatibility

Conforming implementations should be able to emit [OpenLineage](https://openlineage.io/)-compatible `RunEvent` payloads. OpenLineage is an open standard for lineage metadata.

A Teckel pipeline maps to OpenLineage concepts as follows:

| Teckel Concept | OpenLineage Concept |
|----------------|---------------------|
| Pipeline execution | `RunEvent` |
| Input asset | Input dataset facet |
| Output asset | Output dataset facet |
| Transformation | Job facet |
| Asset URN | Dataset namespace + name |
| Column metadata | Column lineage facet |
| Tags | Custom facet |

An implementation emitting OpenLineage events enables integration with lineage-aware systems like Marquez, DataHub, or OpenMetadata.

## Lineage Export

A conforming implementation should be able to:

1. **Export the full lineage graph as a JSON artifact.** This artifact contains all assets, their types, and the edges between them.
2. **Emit OpenLineage-compatible `RunEvent` payloads** with dataset facets during pipeline execution.
3. **Determine upstream and downstream impact** for any asset in the pipeline.

### Example JSON Lineage Structure

A lineage export might look like:

```json
{
  "namespace": "com.company.finance",
  "assets": [
    {
      "urn": "teckel://com.company.finance/raw_orders",
      "type": "input",
      "tags": ["finance", "transactional"]
    },
    {
      "urn": "teckel://com.company.finance/raw_customers",
      "type": "input",
      "tags": ["pii", "crm"]
    },
    {
      "urn": "teckel://com.company.finance/enriched_orders",
      "type": "transformation",
      "tags": ["pii", "crm", "finance", "transactional"]
    },
    {
      "urn": "teckel://com.company.finance/daily_revenue",
      "type": "transformation",
      "tags": ["crm", "finance", "transactional", "aggregated"]
    },
    {
      "urn": "teckel://com.company.finance/revenue_output",
      "type": "output",
      "tags": ["crm", "finance", "transactional", "aggregated"]
    }
  ],
  "edges": [
    { "from": "raw_orders", "to": "enriched_orders" },
    { "from": "raw_customers", "to": "enriched_orders" },
    { "from": "enriched_orders", "to": "daily_revenue" },
    { "from": "daily_revenue", "to": "revenue_output" }
  ]
}
```

## Catalog Integration

When the `pipeline.catalog` field is configured, lineage metadata can be exported to external data catalogs.

```yaml
pipeline:
  namespace: com.company.finance
  catalog:
    target: openmetadata
    namespace: finance.revenue
```

The catalog integration mechanism is implementation-defined. The implementation should generate a metadata artifact (e.g., `manifest.json`) containing all pipeline, asset, column metadata, and lineage edges in a machine-readable format that the target catalog can ingest.

Supported catalog targets are implementation-specific. Common targets include:

| Target | Description |
|--------|-------------|
| `openmetadata` | OpenMetadata catalog. |
| `datahub` | LinkedIn DataHub. |
| `atlas` | Apache Atlas. |

## Lineage Flow Summary

The complete lineage picture in a Teckel pipeline:

1. **Inputs** are the roots of the lineage graph. They represent external data sources.
2. **Transformations** are intermediate nodes. Each transformation declares its upstream dependencies through `from`, `left`, `right`, `sources`, etc.
3. **Outputs** are the leaves of the production graph. They reference the final transformed assets.
4. **Exposures** extend lineage beyond the pipeline boundary, connecting outputs to downstream consumers like dashboards, ML models, and applications.
5. **Tags** propagate through the graph, carrying governance classifications from sources to sinks.
6. **URNs** provide globally unique identifiers for cross-pipeline and cross-system lineage.
