# Check Types

Teckel defines 10 check types covering different quality dimensions. Each check has a `type` field that determines how validation is performed.

---

## Schema

Validates the structural shape of the dataset: which columns must exist, which must not, and expected data types.

```yaml
- type: schema
  columns:
    required: [id, name, email]
    forbidden: [ssn, credit_card]
  types:
    id: integer
    amount: double
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `columns.required` | List[string] | No | Columns that MUST be present in the dataset. |
| `columns.forbidden` | List[string] | No | Columns that MUST NOT be present. Supports glob patterns (e.g., `pii_*`). |
| `types` | Map[string, string] | No | Expected data types per column. |

---

## Completeness

Validates that required values are present (non-null) in a column.

```yaml
- type: completeness
  column: email
  threshold: 0.95
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `column` | Column | **Yes** | -- | Column to check. |
| `threshold` | double | No | `1.0` | Minimum fraction of non-null values (0.0 to 1.0). |

A threshold of `1.0` means all values must be non-null. A threshold of `0.95` allows up to 5% nulls.

---

## Uniqueness

Validates that values are unique across the dataset. Supports composite keys.

```yaml
- type: uniqueness
  columns: [customer_id]
```

```yaml
# Composite uniqueness
- type: uniqueness
  columns: [order_id, line_item_id]
  threshold: 1.0
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `columns` | NonEmptyList[Column] | **Yes** | -- | Columns forming the uniqueness key. |
| `threshold` | double | No | `1.0` | Minimum fraction of unique values. |

---

## Validity

Validates that values conform to expected formats, ranges, or sets. This is the most versatile check type, supporting five validation modes.

### Accepted Values

Restrict a column to a fixed set of allowed values.

```yaml
- type: validity
  column: status
  acceptedValues: [active, inactive, pending]
```

### Range

Enforce numeric bounds. Use `strictMin` and `strictMax` for exclusive bounds.

```yaml
- type: validity
  column: amount
  range:
    min: 0
    max: 1000000
    strictMin: true       # > 0, not >= 0
```

**RangeSpec fields:**

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `min` | number | -- | Minimum value (inclusive by default). |
| `max` | number | -- | Maximum value (inclusive by default). |
| `strictMin` | boolean | `false` | Use exclusive lower bound (`>` instead of `>=`). |
| `strictMax` | boolean | `false` | Use exclusive upper bound (`<` instead of `<=`). |

### Pattern

Validate values against a regular expression.

```yaml
- type: validity
  column: email
  pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
```

### Format

Validate values against a built-in format validator.

```yaml
- type: validity
  column: phone
  format: phone
```

### Length

Enforce string length bounds (inclusive).

```yaml
- type: validity
  column: code
  lengthBetween: [3, 10]
```

### Validity Fields Summary

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `column` | Column | **Yes** | -- | Column to validate. |
| `acceptedValues` | List[string] | No | -- | Allowed values (enumeration). |
| `range` | RangeSpec | No | -- | Numeric range constraint. |
| `pattern` | string | No | -- | Regular expression pattern. |
| `format` | string | No | -- | Built-in format name. |
| `lengthBetween` | [integer, integer] | No | -- | `[min, max]` string length (inclusive). |
| `threshold` | double | No | `1.0` | Minimum fraction of valid values. |

### Built-in Format Validators

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

---

## Statistical

Validates statistical properties of numeric columns: mean, standard deviation, min, max, sum, and quantiles.

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

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `column` | Column | **Yes** | Numeric column to analyze. |
| `mean` | BoundSpec | No | Expected mean bounds. |
| `min` | BoundSpec | No | Expected minimum value bounds. |
| `max` | BoundSpec | No | Expected maximum value bounds. |
| `sum` | BoundSpec | No | Expected sum bounds. |
| `stdev` | BoundSpec | No | Expected standard deviation bounds. |
| `quantiles` | Map[double, BoundSpec] | No | Quantile bounds. Key is the percentile (0.0 to 1.0). |

**BoundSpec fields:**

| Field | Type | Description |
|-------|------|-------------|
| `min` | number | Minimum expected value. |
| `max` | number | Maximum expected value. |
| `between` | [number, number] | `[min, max]` range (inclusive). |

---

## Volume

Validates the size of the dataset by row count and/or column count.

```yaml
- type: volume
  rowCount:
    between: [1000, 100000]
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `rowCount` | BoundSpec | No | Expected row count bounds. |
| `columnCount` | BoundSpec | No | Expected column count bounds. |

---

## Freshness

Validates data recency by checking a timestamp column against the current time.

```yaml
- type: freshness
  column: updated_at
  maxAge: "PT24H"
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `column` | Column | **Yes** | Timestamp column to check. |
| `maxAge` | string | **Yes** | ISO 8601 duration. The maximum value in the column must be within this duration of the current time. |

Common durations:

- `PT1H` -- 1 hour
- `PT24H` -- 24 hours
- `P1D` -- 1 day
- `P7D` -- 7 days

---

## Referential

Validates referential integrity -- that values in a column exist in another asset (foreign key relationship).

```yaml
- type: referential
  column: customer_id
  reference:
    asset: customers
    column: id
  threshold: 1.0
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `column` | Column | **Yes** | -- | Column in the target asset. |
| `reference.asset` | AssetRef | **Yes** | -- | The referenced asset. |
| `reference.column` | Column | **Yes** | -- | Column in the referenced asset. |
| `threshold` | double | No | `1.0` | Minimum fraction of values that must exist in the reference. |

---

## Cross-Column

Validates relationships between columns within the same dataset.

```yaml
- type: crossColumn
  condition: "start_date <= end_date"
  description: "Start date must not be after end date"
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `condition` | Condition | **Yes** | -- | Boolean expression referencing columns in the target asset. |
| `description` | string | No | -- | Human-readable description. |
| `threshold` | double | No | `1.0` | Minimum fraction of rows satisfying the condition. |

---

## Custom

Validates using an arbitrary boolean expression evaluated per row.

```yaml
- type: custom
  condition: "amount > 0 AND currency IS NOT NULL"
  description: "All transactions must have positive amount and currency"
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `condition` | Condition | **Yes** | -- | Boolean expression evaluated per row. |
| `description` | string | No | -- | Human-readable description. |
| `threshold` | double | No | `1.0` | Minimum fraction of rows passing. |

---

## Check Result Model

Each check execution produces a result object with the following fields:

| Field | Type | Description |
|-------|------|-------------|
| `suite` | string | Suite name. |
| `check_type` | string | Check type identifier. |
| `target` | string | Asset name. |
| `column` | string? | Column name (if applicable). |
| `status` | string | Outcome: `"pass"`, `"warn"`, `"fail"`, or `"error"`. |
| `severity` | string | Configured severity level. |
| `observed_value` | any | Computed metric value. |
| `expected` | string | Threshold or assertion description. |
| `failing_rows` | integer? | Number of rows failing (for row-level checks). |
| `failing_percent` | double? | Percentage of rows failing. |
| `description` | string? | Check description. |
| `timestamp` | string | ISO 8601 execution timestamp. |

---

## Comprehensive Example

The following suite combines multiple check types to validate an orders dataset end-to-end.

```yaml
quality:
  - suite: orders-full-validation
    description: "End-to-end quality validation for the orders dataset"
    target: orders
    severity: error
    checks:
      # 1. Schema: enforce required columns and types
      - type: schema
        columns:
          required: [order_id, customer_id, amount, status, created_at]
          forbidden: [internal_id, debug_flag]
        types:
          order_id: string
          amount: double
          created_at: timestamp

      # 2. Completeness: critical fields must not be null
      - type: completeness
        column: customer_id
        threshold: 1.0

      - type: completeness
        column: email
        threshold: 0.95
        severity: warn

      # 3. Uniqueness: order_id is the primary key
      - type: uniqueness
        columns: [order_id]

      # 4. Validity: status must be from known values
      - type: validity
        column: status
        acceptedValues: [pending, confirmed, shipped, delivered, cancelled]

      # 5. Validity: amount must be positive
      - type: validity
        column: amount
        range:
          min: 0
          strictMin: true

      # 6. Validity: email format
      - type: validity
        column: email
        format: email
        threshold: 0.99
        severity: warn

      # 7. Statistical: amount distribution sanity
      - type: statistical
        column: amount
        mean:
          between: [50, 500]
        quantiles:
          0.99: { max: 10000 }

      # 8. Volume: expected dataset size
      - type: volume
        rowCount:
          between: [100, 10000000]

      # 9. Freshness: data should be recent
      - type: freshness
        column: created_at
        maxAge: "PT48H"

      # 10. Referential: customer_id must exist in customers
      - type: referential
        column: customer_id
        reference:
          asset: customers
          column: id

      # 11. Cross-column: business logic
      - type: crossColumn
        condition: "shipped_at IS NULL OR shipped_at >= created_at"
        description: "Shipping date must be after order creation"

      # 12. Custom: composite business rule
      - type: custom
        condition: "amount > 0 AND currency IS NOT NULL"
        description: "All transactions must have positive amount and currency"
        threshold: 0.99
        severity: warn
```
