# Window Functions

The `window` transformation applies window functions over partitions of a dataset. Window functions compute values across a set of rows related to the current row, without collapsing rows like `group` does.

---

![Window functions](/img/diagrams/window-function.svg)

## Schema

```yaml
- name: <AssetRef>
  window:
    from: <AssetRef>
    partitionBy: <NonEmptyList[Column]>
    orderBy: <List[SortColumn]>
    frame: <FrameSpec>
    functions: <NonEmptyList[WindowFuncDef]>
```

| Field         | Type                         | Required | Default   | Description                         |
|---------------|------------------------------|----------|-----------|-------------------------------------|
| `from`        | AssetRef                     | Yes      | —         | Source asset.                       |
| `partitionBy` | NonEmptyList[Column]         | Yes      | —         | Partition columns.                  |
| `orderBy`     | List[SortColumn]             | No       | `[]`      | Sort within each partition.         |
| `frame`       | FrameSpec                    | No       | see below | Window frame specification.         |
| `functions`   | NonEmptyList[WindowFuncDef]  | Yes      | —         | Window functions to apply.          |

---

## Window Function Definitions

Each function produces a new column in the output.

| Field        | Type       | Required | Description                        |
|--------------|------------|----------|------------------------------------|
| `expression` | Expression | Yes      | Window function expression.        |
| `alias`      | string     | Yes      | Output column name.                |

Common window function expressions include:
- `row_number()` — sequential row number within the partition
- `rank()` — rank with gaps for ties
- `dense_rank()` — rank without gaps
- `lag(column, N)` — value from N rows before
- `lead(column, N)` — value from N rows after
- `sum(column)` — running or total sum
- `avg(column)` — running or total average
- `min(column)`, `max(column)` — running or total min/max
- `first_value(column)`, `last_value(column)` — first/last in the frame
- `ntile(N)` — divide into N roughly equal groups

---

## Frame Specification

The frame defines which rows within the partition are included in the calculation for each row.

| Field   | Type                      | Required | Default                  | Description             |
|---------|---------------------------|----------|--------------------------|-------------------------|
| `type`  | `"rows"` or `"range"`     | No       | `"range"`                | Frame type.             |
| `start` | string                    | No       | `"unbounded preceding"`  | Frame start boundary.   |
| `end`   | string                    | No       | `"current row"`          | Frame end boundary.     |

### Frame Types

- **`rows`** — the frame is defined by a physical number of rows before and after the current row, regardless of values.
- **`range`** — the frame is defined by a logical range of values relative to the current row's sort key.

### Boundary Values

| Boundary                | Meaning                                    |
|-------------------------|--------------------------------------------|
| `"unbounded preceding"` | From the beginning of the partition.       |
| `"N preceding"`         | N rows/values before the current row.      |
| `"current row"`         | The current row.                           |
| `"N following"`         | N rows/values after the current row.       |
| `"unbounded following"` | To the end of the partition.               |

### Default Frame

- When `orderBy` is specified: `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW` (cumulative from start to current).
- When `orderBy` is omitted: the entire partition (`RANGE BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING`).

---

## Examples

### Ranking Within Partitions

Rank employees by salary within each department:

```yaml
transformation:
  - name: withRanking
    window:
      from: employees
      partitionBy: [department]
      orderBy:
        - column: salary
          direction: desc
      functions:
        - expression: "row_number()"
          alias: rank
        - expression: "dense_rank()"
          alias: dense_rank
```

### Running Totals

Calculate a running total of sales per region, ordered by date:

```yaml
transformation:
  - name: runningTotals
    window:
      from: sales
      partitionBy: [region]
      orderBy:
        - column: sale_date
          direction: asc
      frame:
        type: rows
        start: "unbounded preceding"
        end: "current row"
      functions:
        - expression: "sum(amount)"
          alias: running_total
        - expression: "count(1)"
          alias: running_count
```

### Lag and Lead

Compare each row to previous and next values:

```yaml
transformation:
  - name: withComparison
    window:
      from: dailyMetrics
      partitionBy: [metric_name]
      orderBy:
        - column: date
          direction: asc
      functions:
        - expression: "lag(value, 1)"
          alias: prev_value
        - expression: "lead(value, 1)"
          alias: next_value
        - expression: "value - lag(value, 1)"
          alias: daily_change
```

### Moving Average

Calculate a 7-day moving average:

```yaml
transformation:
  - name: movingAvg
    window:
      from: dailySales
      partitionBy: [store_id]
      orderBy:
        - column: sale_date
          direction: asc
      frame:
        type: rows
        start: "6 preceding"
        end: "current row"
      functions:
        - expression: "avg(revenue)"
          alias: moving_avg_7d
        - expression: "min(revenue)"
          alias: min_7d
        - expression: "max(revenue)"
          alias: max_7d
```

> **Tip:** For a moving average over the last 7 rows, use `type: rows` with `start: "6 preceding"` — this includes the current row plus the 6 rows before it.

### Top-N Per Group

Combine window functions with a filter to get the top 3 highest-paid employees per department:

```yaml
transformation:
  - name: ranked
    window:
      from: employees
      partitionBy: [department]
      orderBy:
        - column: salary
          direction: desc
      functions:
        - expression: "row_number()"
          alias: rn

  - name: top3PerDept
    where:
      from: ranked
      filter: "rn <= 3"
```

> **Tip:** The `rows` frame type is predictable — it always covers a fixed number of rows. The `range` frame type groups rows with equal sort key values together, which can produce variable-sized frames. Choose based on whether you want physical row counts or logical value ranges.
