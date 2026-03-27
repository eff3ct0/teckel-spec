# Aggregation and Sorting

This section covers transformations for grouping, sorting, and multi-level aggregation including rollup and cube.

---

## Group By (8.3)

Groups rows by one or more columns and applies aggregate functions.

**Schema:**

| Field  | Type                      | Required | Description                                      |
|--------|---------------------------|----------|--------------------------------------------------|
| `from` | AssetRef                  | Yes      | Source asset.                                    |
| `by`   | NonEmptyList[Column]      | Yes      | Grouping columns.                                |
| `agg`  | NonEmptyList[Expression]  | Yes      | Aggregate expressions (optionally aliased with `as`). |

The output dataset contains the `by` columns plus the `agg` result columns. Only aggregate expressions and columns listed in `by` are valid in the `agg` list.

**Example -- sales summary by region and product:**

```yaml
transformation:
  - name: salesSummary
    group:
      from: sales
      by:
        - region
        - product
      agg:
        - "sum(amount) as total"
        - "count(1) as num_sales"
        - "avg(price) as avg_price"
```

**Null behavior in aggregations:**
- NULL values in grouping columns form their own group (all NULLs are grouped together).
- `count` over an empty group returns `0`.
- `sum`, `avg`, `min`, and `max` over an empty group return `NULL`.
- Grouping an empty dataset produces an empty dataset (zero groups).

---

## Order By (8.4)

Sorts rows by one or more columns. The operation key is `orderBy` (not `order`).

**Schema:**

| Field     | Type                      | Required | Description                 |
|-----------|---------------------------|----------|-----------------------------|
| `from`    | AssetRef                  | Yes      | Source asset.               |
| `columns` | NonEmptyList[SortColumn]  | Yes      | Sort specifications.        |

### Sort Column Syntax

Each entry in `columns` can be either:

1. **A bare column name** -- defaults to ascending direction, nulls last.
2. **An object** with explicit direction and null placement.

| Field       | Type                    | Required | Default   | Description          |
|-------------|-------------------------|----------|-----------|----------------------|
| `column`    | Column                  | Yes      | --        | Column to sort by.   |
| `direction` | `"asc"` or `"desc"`     | No       | `"asc"`   | Sort direction.      |
| `nulls`     | `"first"` or `"last"`   | No       | `"last"`  | Null placement.      |

**Example -- simple sort (all ascending, nulls last):**

```yaml
transformation:
  - name: sorted
    orderBy:
      from: employees
      columns:
        - salary
        - name
```

**Example -- mixed directions with explicit null handling:**

```yaml
transformation:
  - name: ranked
    orderBy:
      from: employees
      columns:
        - column: salary
          direction: desc
          nulls: first
        - column: name
          direction: asc
```

In this example, employees are sorted by salary descending (with NULLs appearing first), then by name ascending within each salary group.

> **Tip:** The `nulls` field lets you control exactly where NULL values appear in the sort order. This is especially useful when sorting columns that may contain missing data.

**Semantics:**
- Sorting is stable: rows with equal sort keys preserve their relative order from the input.
- Default null ordering is `nulls last` for both `asc` and `desc`. Override per-column as needed.

---

## Rollup (8.23)

Hierarchical aggregation that produces subtotals. Rollup creates groups for progressively fewer columns, from the most specific to the grand total.

**Schema:**

| Field  | Type                      | Required | Description               |
|--------|---------------------------|----------|---------------------------|
| `from` | AssetRef                  | Yes      | Source asset.             |
| `by`   | NonEmptyList[Column]      | Yes      | Grouping columns (order matters). |
| `agg`  | NonEmptyList[Expression]  | Yes      | Aggregate expressions.    |

For `by: [A, B, C]`, rollup produces aggregation groups for:
- `(A, B, C)` -- most specific
- `(A, B)` -- subtotal across all C values
- `(A)` -- subtotal across all B and C values
- `()` -- grand total

Non-grouped columns in subtotal rows are `NULL`.

**Example -- sales rollup by region, country, and city:**

```yaml
transformation:
  - name: salesRollup
    rollup:
      from: sales
      by:
        - region
        - country
        - city
      agg:
        - "sum(amount) as total_sales"
        - "count(1) as num_transactions"
```

This produces rows for each city, each country subtotal, each region subtotal, and one grand total row.

> **Tip:** The order of columns in `by` matters for rollup. Place the broadest grouping first (e.g., region) and the most specific last (e.g., city).

---

## Cube (8.24)

Multi-dimensional aggregation that produces subtotals for all possible combinations of the grouping columns.

**Schema:**

| Field  | Type                      | Required | Description               |
|--------|---------------------------|----------|---------------------------|
| `from` | AssetRef                  | Yes      | Source asset.             |
| `by`   | NonEmptyList[Column]      | Yes      | Grouping columns.         |
| `agg`  | NonEmptyList[Expression]  | Yes      | Aggregate expressions.    |

For `by: [A, B]`, cube produces aggregation groups for:
- `(A, B)` -- both dimensions
- `(A)` -- subtotal across all B
- `(B)` -- subtotal across all A
- `()` -- grand total

**Example -- sales cube by region and product category:**

```yaml
transformation:
  - name: salesCube
    cube:
      from: sales
      by:
        - region
        - product_category
      agg:
        - "sum(amount) as total_sales"
        - "avg(amount) as avg_sale"
```

This produces rows for each (region, product_category) pair, totals per region, totals per product category, and a grand total.

> **Tip:** Cube is more expensive than rollup because it computes all 2^N combinations of N grouping columns. Use rollup when you only need hierarchical subtotals along one dimension.
