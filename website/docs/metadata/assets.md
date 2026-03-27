# Asset and Column Metadata

Teckel supports declarative metadata at the asset level and column level. This enables documentation, governance classification, and constraint tracking directly in the pipeline definition.

## Asset-Level Metadata on Inputs

Input assets can carry metadata fields for documentation and governance.

```yaml
input:
  - name: customers
    format: parquet
    path: "data/customers"
    description: "Master customer records from the CRM system"
    tags: [pii, crm, master-data]
    owner:
      name: CRM Team
      email: crm@company.com
      type: business
    meta:
      source_system: salesforce
      refresh_frequency: hourly
      data_classification: confidential
```

The `tags`, `owner`, `meta`, and `description` fields are available on any input asset. Tags declared on inputs propagate downstream through the DAG (see [Tag Propagation](./tags.md)).

## Column-Level Metadata

Columns on inputs can carry metadata declarations for documentation, tagging, constraints, and glossary references.

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
      - name: region
        description: "Customer geographic region"
        glossaryTerm: "geo_region"
```

### Column Metadata Fields

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `name` | string | **Yes** | — | Column name. Must match a column in the dataset. |
| `description` | string | No | — | Human-readable column description. |
| `tags` | List[string] | No | `[]` | Column-level classification labels. |
| `constraints` | List[string] | No | `[]` | Declared constraints (metadata only). |
| `meta` | Map[string, any] | No | `{}` | Open key-value metadata. |
| `glossaryTerm` | string | No | — | Reference to a business glossary term. |

### The `glossaryTerm` Field

Links a column to a business glossary entry. This enables catalog systems to connect technical columns to business definitions.

```yaml
columns:
  - name: arr
    description: "Annual recurring revenue"
    glossaryTerm: "annual_recurring_revenue"
  - name: nps
    description: "Net promoter score from latest survey"
    glossaryTerm: "net_promoter_score"
```

## Column Constraints

Column constraints are **declarative metadata** — they document expected properties but do NOT enforce them at runtime. To enforce constraints, use the `quality` section or the `assertion` transformation.

| Constraint | Description |
|------------|-------------|
| `not_null` | Column should not contain null values. |
| `unique` | Column should contain unique values. |
| `primary_key` | Column is part of the primary key. Implies `not_null` and `unique`. |
| `foreign_key(<asset>.<column>)` | Column references another asset's column. |

### Constraint Examples

```yaml
columns:
  - name: order_id
    constraints: [primary_key]

  - name: customer_id
    constraints: [not_null, "foreign_key(customers.id)"]

  - name: email
    constraints: [not_null, unique]

  - name: status
    constraints: [not_null]
```

The `primary_key` constraint implies both `not_null` and `unique`. You do not need to list them separately.

The `foreign_key` constraint takes a reference in the form `asset_name.column_name`. This is metadata only — use a `referential` quality check to enforce the relationship.

## Output Metadata

Output assets support `maturity` and `freshness` fields for lifecycle and SLA documentation.

### Maturity

The `maturity` field indicates the lifecycle stage of an output dataset.

| Value | Description |
|-------|-------------|
| `high` | Production-grade. Stable schema, monitored, with SLA. |
| `medium` | In active development. Schema may change. |
| `low` | Experimental or prototype. No guarantees. |
| `deprecated` | Scheduled for removal. Consumers should migrate. |

```yaml
output:
  - name: daily_revenue
    format: parquet
    path: "output/daily_revenue"
    from: aggregated_revenue
    maturity: high
    description: "Daily revenue aggregates. Feeds the executive dashboard."
    tags: [finance, production]
    owner:
      name: Data Engineering
      email: data-eng@company.com

  - name: experimental_features
    format: parquet
    path: "output/exp_features"
    from: feature_engineering
    maturity: low
    description: "Experimental ML features. Schema may change without notice."
```

### Freshness

The `freshness` field on outputs declares the expected maximum age of the data as an ISO 8601 duration. This is metadata only — it documents the SLA but does not enforce it. Use a `freshness` quality check to enforce freshness.

```yaml
output:
  - name: daily_revenue
    format: parquet
    path: "output/daily_revenue"
    from: aggregated_revenue
    freshness: "PT24H"            # data should be at most 24 hours old
    maturity: high
```

## Complete Example

A pipeline definition combining asset-level and column-level metadata across inputs and outputs.

```yaml
input:
  - name: customers
    format: parquet
    path: "data/customers"
    description: "Master customer table from CRM"
    tags: [pii, crm]
    owner:
      name: CRM Team
      email: crm@company.com
      type: business
    meta:
      source_system: salesforce
    columns:
      - name: customer_id
        description: "Unique customer identifier"
        constraints: [primary_key]
        tags: [primary_key]
      - name: email
        description: "Customer email address"
        tags: [pii, contact]
        constraints: [not_null]
        meta:
          sensitivity: high
          retention_days: 365
        glossaryTerm: "customer_email"
      - name: name
        description: "Full customer name"
        tags: [pii]
        constraints: [not_null]
      - name: region
        description: "Geographic region"
        glossaryTerm: "geo_region"

  - name: orders
    format: parquet
    path: "data/orders"
    description: "Transaction orders"
    tags: [finance, transactional]
    columns:
      - name: order_id
        constraints: [primary_key]
      - name: customer_id
        constraints: [not_null, "foreign_key(customers.customer_id)"]
      - name: amount
        constraints: [not_null]
        glossaryTerm: "order_amount"

output:
  - name: customer_summary
    format: parquet
    path: "output/customer_summary"
    from: aggregated_customers
    maturity: high
    freshness: "PT24H"
    description: "Aggregated customer metrics for reporting"
    tags: [finance, production]
    owner:
      name: Data Engineering
      email: data-eng@company.com
      type: technical

  - name: experimental_segments
    format: parquet
    path: "output/segments"
    from: segmentation
    maturity: low
    description: "Experimental customer segmentation. Schema unstable."
```
