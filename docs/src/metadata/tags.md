# Tag Propagation

Tags in Teckel propagate automatically through the pipeline DAG. This enables governance classification -- such as PII tagging -- to flow from source data through transformations to outputs without manual annotation at every step.

## How Tags Propagate

Tag propagation follows five rules:

1. **Inheritance.** An input's tags are inherited by all transformations that reference it, directly or transitively.
2. **Union on multiple upstreams.** When a transformation has multiple upstream assets (e.g., a join), it inherits the **union** of all upstream tags.
3. **Additive declaration.** A transformation can declare its own `tags`, which are **added** to the inherited set.
4. **Explicit removal.** A transformation can remove inherited tags using the `removeTags` field.
5. **Output inheritance.** Output sinks inherit the tags of the asset they reference.

## Inheritance from Inputs

When an input declares tags, every downstream transformation that depends on it inherits those tags automatically.

```yaml
input:
  - name: customers
    format: parquet
    path: "data/customers"
    tags: [pii, crm]

transformation:
  - name: active_customers
    where:
      from: customers
      condition: "status = 'active'"
    # Inherits tags: [pii, crm]

  - name: customer_orders
    select:
      from: active_customers
      columns: [customer_id, order_count]
    # Inherits tags: [pii, crm] (transitively from customers)
```

The `active_customers` transformation inherits `[pii, crm]` from its upstream `customers` input. The `customer_orders` transformation inherits the same tags transitively.

## Union with Multiple Upstreams

When a transformation depends on multiple assets, it inherits the union of all upstream tag sets.

```yaml
input:
  - name: customers
    format: parquet
    path: "data/customers"
    tags: [pii, crm]

  - name: transactions
    format: parquet
    path: "data/transactions"
    tags: [finance, transactional]

transformation:
  - name: customer_spending
    join:
      left: customers
      right: transactions
      on: "customers.id = transactions.customer_id"
      type: inner
    # Inherits tags: [pii, crm, finance, transactional]
```

The join result carries the union: `[pii, crm, finance, transactional]`.

## Adding Tags

Transformations can declare their own tags. These are added to the inherited set.

```yaml
transformation:
  - name: enriched_customers
    select:
      from: customers
      columns: [id, name, segment]
    tags: [enriched]
    # Final tags: [pii, crm, enriched]
```

## Removing Tags with `removeTags`

When a transformation removes sensitive columns, the inherited tags may no longer apply. Use `removeTags` to strip specific tags from the inherited set.

```yaml
transformation:
  - name: anonymized_customers
    select:
      from: customers
      columns: [id, region, segment]     # dropped name, email
    tags: [anonymized]
    removeTags: [pii]
    # Final tags: [crm, anonymized]
```

The `pii` tag is removed because the sensitive columns have been dropped. The `anonymized` tag is added to signal that this asset has been through a privacy transformation.

## Complete PII Propagation Example

The following example shows how PII tags flow through a pipeline and are removed at the anonymization boundary.

```yaml
input:
  - name: raw_customers
    format: parquet
    path: "data/raw_customers"
    tags: [pii, crm, raw]
    columns:
      - name: customer_id
        tags: [primary_key]
      - name: email
        tags: [pii, contact]
      - name: phone
        tags: [pii, contact]
      - name: name
        tags: [pii]
      - name: region
        tags: []

  - name: raw_orders
    format: parquet
    path: "data/raw_orders"
    tags: [finance, transactional]

transformation:
  # Step 1: Filter active customers
  - name: active_customers
    where:
      from: raw_customers
      condition: "status = 'active'"
    # Tags: [pii, crm, raw]

  # Step 2: Join with orders -- union of tags
  - name: customer_orders
    join:
      left: active_customers
      right: raw_orders
      on: "active_customers.customer_id = raw_orders.customer_id"
      type: inner
    # Tags: [pii, crm, raw, finance, transactional]

  # Step 3: Aggregate and anonymize -- remove PII
  - name: regional_revenue
    groupBy:
      from: customer_orders
      columns: [region]
      aggregations:
        - column: amount
          function: sum
          alias: total_revenue
        - column: customer_id
          function: countDistinct
          alias: customer_count
    tags: [aggregated, anonymized]
    removeTags: [pii, raw]
    # Tags: [crm, finance, transactional, aggregated, anonymized]

output:
  - name: regional_revenue_report
    format: parquet
    path: "output/regional_revenue"
    from: regional_revenue
    # Tags: [crm, finance, transactional, aggregated, anonymized]
    # PII tag is NOT present -- safe for broad access
```

### Tag flow summary

| Asset | Tags |
|-------|------|
| `raw_customers` | pii, crm, raw |
| `raw_orders` | finance, transactional |
| `active_customers` | pii, crm, raw |
| `customer_orders` | pii, crm, raw, finance, transactional |
| `regional_revenue` | crm, finance, transactional, aggregated, anonymized |
| `regional_revenue_report` | crm, finance, transactional, aggregated, anonymized |

The PII tag propagates from `raw_customers` through `active_customers` and into `customer_orders` (via the join union). At `regional_revenue`, the aggregation drops individual-level data and `removeTags: [pii, raw]` strips those tags. The output inherits the clean tag set.

## Governance Use Cases

Tag propagation supports several governance patterns:

- **PII tracking.** Tag inputs containing personal data with `pii`. The tag follows the data through the DAG. Remove it only after anonymization or aggregation.
- **Data classification.** Use tags like `confidential`, `internal`, `public` to classify data. The union rule ensures that joining a confidential dataset with a public one produces a confidential result.
- **Lineage-based access control.** External systems can read the tag metadata to enforce access policies based on the tags present on output assets.
- **Audit trails.** The tag set on each asset documents which governance classifications apply, making compliance auditing straightforward.
