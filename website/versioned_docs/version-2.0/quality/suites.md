# Quality Suites

Teckel provides a declarative data quality system through the top-level `quality` section. Quality checks are organized into **suites**, each scoped to a specific asset in the pipeline DAG.

> **Formal reference:** [Section 17 — Data Quality](https://github.com/eff3ct0/teckel-spec/blob/main/spec/v2.0/teckel-spec.md#17-data-quality) in the Teckel Specification.

![Quality system](/img/diagrams/quality-system.svg)

## Suite Structure

A quality suite groups related checks that validate a single dataset. Every suite targets one asset and contains one or more checks.

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

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `suite` | string | **Yes** | — | Suite name, used in reporting and check results. |
| `description` | string | No | — | Human-readable description of what this suite validates. |
| `target` | AssetRef | **Yes** | — | The asset to validate. Must reference an asset defined in the pipeline. |
| `filter` | Condition | No | — | Optional row filter. When provided, checks apply only to matching rows. |
| `severity` | string | No | `"error"` | Default severity for all checks in this suite. One of `"error"`, `"warn"`, or `"info"`. |
| `checks` | NonEmptyList[Check] | **Yes** | — | The quality checks to apply. At least one check is required. |

## Scoping to Assets

The `target` field binds the suite to a specific asset. This can be any asset in the pipeline: an input, a transformation, or an output reference.

```yaml
quality:
  - suite: raw-data-checks
    target: rawOrders        # validates the rawOrders asset
    checks:
      - type: volume
        rowCount:
          min: 1
```

You can define multiple suites targeting the same asset, or spread checks across different suites for organizational clarity.

## Row Filters

The `filter` field restricts which rows are evaluated. This is useful when checks should only apply to a subset of the data.

```yaml
quality:
  - suite: premium-customer-checks
    target: customers
    filter: "tier = 'premium'"
    checks:
      - type: completeness
        column: account_manager
        threshold: 1.0
      - type: validity
        column: credit_limit
        range:
          min: 10000
```

In this example, completeness and validity checks run only against rows where `tier = 'premium'`.

## Suite-Level Severity

The `severity` field sets the default severity for every check in the suite. Individual checks can override this default (see [Severity and Thresholds](./severity.md)).

The three severity levels control pipeline behavior on check failure:

| Severity | Behavior |
|----------|----------|
| `error` | Pipeline aborts. |
| `warn` | Warning is logged. Pipeline continues. |
| `info` | Metric is recorded silently. Pipeline continues. |

## Relationship to Assertions

The `quality` section is separate from the inline `assertion` transformation (Section 8.28 of the spec). The assertion transformation is a single-asset quality gate embedded directly in the DAG. The `quality` section is the recommended approach for comprehensive validation — it supports multiple quality dimensions, thresholds, severity levels, statistical checks, freshness validation, and cross-asset referential integrity.

Implementations should support both mechanisms.

## Complete Suite Example

The following example defines a suite that validates an orders dataset with checks spanning several quality dimensions.

```yaml
quality:
  - suite: orders-validation
    description: "Comprehensive quality checks for the orders dataset"
    target: validatedOrders
    severity: error
    checks:
      # Structural validation
      - type: schema
        columns:
          required: [order_id, customer_id, amount, created_at]
          forbidden: [internal_id]

      # No nulls allowed in the primary key
      - type: completeness
        column: customer_id
        threshold: 1.0

      # Order IDs must be unique
      - type: uniqueness
        columns: [order_id]

      # Status must be from a known set
      - type: validity
        column: status
        acceptedValues: [pending, confirmed, shipped, delivered, cancelled]

      # Positive amounts only
      - type: validity
        column: amount
        range:
          min: 0
          strictMin: true

      # Reasonable row count
      - type: volume
        rowCount:
          between: [100, 10000000]

      # Data must be recent
      - type: freshness
        column: created_at
        maxAge: "PT48H"

      # Foreign key to customers
      - type: referential
        column: customer_id
        reference:
          asset: customers
          column: id

      # Business logic: shipping after creation
      - type: crossColumn
        condition: "shipped_at IS NULL OR shipped_at >= created_at"
        description: "Shipping date must be after order creation"
```

This suite runs all checks against `validatedOrders`. Any failing check with `error` severity aborts the pipeline. Individual checks can override severity to `warn` or `info` for softer enforcement.
