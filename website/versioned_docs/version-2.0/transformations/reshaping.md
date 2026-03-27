# Reshaping Transformations

This section covers transformations that change the shape or structure of your data: pivoting, unpivoting, flattening nested structures, conditional column creation, and splitting datasets.

---

## Pivot (8.16)

Rotates rows into columns (long to wide format). Distinct values from a chosen column become new column headers, with aggregated values filling the cells.

**Schema:**

| Field         | Type                      | Required | Default       | Description                                |
|---------------|---------------------------|----------|---------------|--------------------------------------------|
| `from`        | AssetRef                  | Yes      | —             | Source asset.                              |
| `groupBy`     | NonEmptyList[Column]      | Yes      | —             | Columns to group by (these remain as rows).|
| `pivotColumn` | Column                    | Yes      | —             | Column whose distinct values become new columns. |
| `values`      | List[string]              | No       | all distinct  | Specific values to pivot on.               |
| `agg`         | NonEmptyList[Expression]  | Yes      | —             | Aggregate expressions applied per pivot value. |

**Example — sales by region and product:**

```yaml
transformation:
  - name: salesPivot
    pivot:
      from: sales
      groupBy: [region]
      pivotColumn: product
      values: ["A", "B", "C"]
      agg:
        - "sum(amount)"
```

Given input like:

| region | product | amount |
|--------|---------|--------|
| East   | A       | 100    |
| East   | B       | 200    |
| West   | A       | 150    |

The output becomes:

| region | A   | B   | C    |
|--------|-----|-----|------|
| East   | 100 | 200 | NULL |
| West   | 150 | NULL| NULL |

> **Tip:** Specify `values` explicitly when you know the expected pivot values. If omitted, all distinct values are used, but this requires an extra pass over the data and may produce unpredictable column ordering.

---

## Unpivot (8.17)

Rotates columns into rows (wide to long format). The inverse of pivot.

**Schema:**

| Field            | Type                  | Required | Description                                        |
|------------------|-----------------------|----------|----------------------------------------------------|
| `from`           | AssetRef              | Yes      | Source asset.                                      |
| `ids`            | NonEmptyList[Column]  | Yes      | Columns to keep as identifiers.                    |
| `values`         | NonEmptyList[Column]  | Yes      | Columns to unpivot into rows.                      |
| `variableColumn` | string                | Yes      | Name for the column holding original column names. |
| `valueColumn`    | string                | Yes      | Name for the column holding the values.            |

**Example — unpivot quarterly sales columns:**

```yaml
transformation:
  - name: longFormat
    unpivot:
      from: quarterlySales
      ids: [region, product]
      values: [q1_sales, q2_sales, q3_sales, q4_sales]
      variableColumn: quarter
      valueColumn: sales_amount
```

Given input:

| region | product | q1_sales | q2_sales | q3_sales | q4_sales |
|--------|---------|----------|----------|----------|----------|
| East   | Widget  | 100      | 120      | 90       | 150      |

The output becomes:

| region | product | quarter  | sales_amount |
|--------|---------|----------|--------------|
| East   | Widget  | q1_sales | 100          |
| East   | Widget  | q2_sales | 120          |
| East   | Widget  | q3_sales | 90           |
| East   | Widget  | q4_sales | 150          |

---

## Flatten (8.18)

Flattens nested structures (structs and optionally arrays) into a flat schema.

**Schema:**

| Field           | Type     | Required | Default | Description                                        |
|-----------------|----------|----------|---------|----------------------------------------------------|
| `from`          | AssetRef | Yes      | —       | Source asset.                                      |
| `separator`     | string   | No       | `"_"`   | Separator between parent and child field names.    |
| `explodeArrays` | boolean  | No       | `false` | If true, array fields produce multiple rows.       |

**Example — flatten nested JSON data:**

```yaml
transformation:
  - name: flat
    flatten:
      from: nestedJson
      separator: "_"
      explodeArrays: false
```

Given a struct field `address` with subfields `city` and `zip`, the output columns become `address_city` and `address_zip`.

**Semantics:**
- Flattening is recursive — nested structs within nested structs are fully flattened.
- When `explodeArrays` is `true`, a row with an array of N elements produces N rows. Empty or NULL arrays cause the row to be dropped.

**Example — flatten and explode arrays:**

```yaml
transformation:
  - name: exploded
    flatten:
      from: ordersWithItems
      separator: "_"
      explodeArrays: true
```

> **Tip:** If your data has deeply nested JSON or Parquet structs, flatten first and then use `select` or `dropColumns` to keep only the fields you need.

---

## Conditional (8.20)

Adds a column with values determined by conditional logic, equivalent to SQL `CASE WHEN`.

**Schema:**

| Field          | Type                    | Required | Default | Description                              |
|----------------|-------------------------|----------|---------|------------------------------------------|
| `from`         | AssetRef                | Yes      | —       | Source asset.                            |
| `outputColumn` | string                  | Yes      | —       | Name for the new column.                 |
| `branches`     | NonEmptyList[Branch]    | Yes      | —       | Conditions evaluated in order.           |
| `otherwise`    | Expression              | No       | `NULL`  | Default value if no branch matches.      |

**Branch object:**

| Field       | Type       | Required | Description                      |
|-------------|------------|----------|----------------------------------|
| `condition` | Condition  | Yes      | Boolean condition.               |
| `value`     | Expression | Yes      | Value if the condition is true.  |

Branches are evaluated in order. The first matching condition determines the value.

**Example — categorize orders by size:**

```yaml
transformation:
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

**Example — business logic with multiple conditions:**

```yaml
transformation:
  - name: riskScored
    conditional:
      from: transactions
      outputColumn: risk_level
      branches:
        - condition: "amount > 10000 AND country != 'US'"
          value: "'high'"
        - condition: "amount > 5000 OR previous_fraud = true"
          value: "'medium'"
        - condition: "account_age_days < 30"
          value: "'review'"
      otherwise: "'low'"
```

> **Tip:** String literal values in `value` must be quoted within the expression (e.g., `"'large'"`). Without inner quotes, the runtime interprets it as a column reference.

---

## Split (8.21)

Splits a dataset into two named assets based on a boolean condition. This is the only transformation that produces two output assets.

**Schema:**

| Field       | Type      | Required | Description                                        |
|-------------|-----------|----------|----------------------------------------------------|
| `from`      | AssetRef  | Yes      | Source asset.                                      |
| `condition` | Condition | Yes      | Boolean condition.                                 |
| `pass`      | AssetRef  | Yes      | Name for rows where condition is true.             |
| `fail`      | AssetRef  | Yes      | Name for rows where condition is false or NULL.    |

The `name` of the split transformation itself is **not** a referenceable asset. Only `pass` and `fail` are referenceable by downstream transformations. Both names must be unique in the document namespace.

Rows where `condition` evaluates to `NULL` go to `fail`.

**Example — split API results by status:**

```yaml
transformation:
  - name: splitByStatus
    split:
      from: apiResults
      condition: "status_code = 200"
      pass: successRecords
      fail: failedRecords

  # Use the pass output downstream
  - name: successSummary
    group:
      from: successRecords
      by: [endpoint]
      agg: ["count(1) as calls"]

  # Use the fail output downstream
  - name: errorReport
    select:
      from: failedRecords
      columns:
        - endpoint
        - status_code
        - error_message
```

> **Tip:** Split is useful for data quality workflows where you want to route valid and invalid records to separate processing paths.
