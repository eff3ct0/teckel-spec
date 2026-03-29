# Filtering and Row Selection

This section covers transformations that project columns, filter rows, deduplicate, limit, and sample datasets.

---

## Select (8.1)

Projects specific columns or expressions from a dataset. The output contains only the listed columns, in the order specified.

**Schema:**

| Field     | Type                      | Required | Description                             |
|-----------|---------------------------|----------|-----------------------------------------|
| `from`    | AssetRef                  | Yes      | Source asset.                           |
| `columns` | NonEmptyList[Expression]  | Yes      | Column names or expressions to include. |

Each entry in `columns` can be a bare column name or an expression, optionally aliased with `as`.

**Example — basic projection with computed columns:**

```yaml
transformation:
  - name: projected
    select:
      from: employees
      columns:
        - id
        - name
        - "salary * 1.1 as adjusted_salary"
        - "upper(department) as dept"
```

> **Tip:** If a column name does not exist in the source, the runtime raises `E-COL-001`. Double-check your source schema.

---

## Where / Filter (8.2)

Filters rows based on a boolean condition. Only rows where the condition evaluates to `true` are kept.

**Schema:**

| Field    | Type      | Required | Description                          |
|----------|-----------|----------|--------------------------------------|
| `from`   | AssetRef  | Yes      | Source asset.                        |
| `filter` | Condition | Yes      | Boolean expression for row selection.|

Rows where `filter` evaluates to `NULL` are excluded — NULL is not truthy.

**Example — filtering active users by date:**

```yaml
transformation:
  - name: activeUsers
    where:
      from: users
      filter: "status = 'active' AND created_at >= '2025-01-01'"
```

**Example — numeric filter:**

```yaml
transformation:
  - name: highValueOrders
    where:
      from: orders
      filter: "amount > 500"
```

---

## Distinct (8.9)

Removes duplicate rows from a dataset.

**Schema:**

| Field     | Type          | Required | Default      | Description                              |
|-----------|---------------|----------|--------------|------------------------------------------|
| `from`    | AssetRef      | Yes      | —            | Source asset.                            |
| `columns` | List[Column]  | No       | all columns  | Subset of columns for deduplication.     |

When `columns` is omitted, all columns are used. When specified, one arbitrary row per group is kept — there is no guarantee which row is retained.

> **Tip:** If you need deterministic deduplication, use `orderBy` followed by a `window` function with `row_number()` and then filter.

**Example — full row deduplication:**

```yaml
transformation:
  - name: uniqueEvents
    distinct:
      from: rawEvents
```

**Example — deduplicate by specific columns:**

```yaml
transformation:
  - name: latestPerUser
    distinct:
      from: userActions
      columns:
        - user_id
        - action_type
```

NULL values are considered equal for deduplication purposes.

---

## Limit (8.10)

Returns at most N rows from a dataset.

**Schema:**

| Field   | Type     | Required | Description                        |
|---------|----------|----------|------------------------------------|
| `from`  | AssetRef | Yes      | Source asset.                      |
| `count` | integer  | Yes      | Maximum rows to return. Must be >= 0. |

Setting `count: 0` produces an empty dataset with the same schema.

> **Tip:** Without a preceding `orderBy`, the selected rows are non-deterministic. Combine with `orderBy` for predictable results.

**Example — top 100 rows after sorting:**

```yaml
transformation:
  - name: sorted
    orderBy:
      from: sales
      columns:
        - column: amount
          direction: desc

  - name: top100
    limit:
      from: sorted
      count: 100
```

---

## Sample (8.19)

Returns a random sample of rows from a dataset.

**Schema:**

| Field             | Type    | Required | Default  | Description                          |
|-------------------|---------|----------|----------|--------------------------------------|
| `from`            | AssetRef| Yes      | —        | Source asset.                        |
| `fraction`        | double  | Yes      | —        | Sampling fraction in (0.0, 1.0].     |
| `withReplacement` | boolean | No       | `false`  | Whether to sample with replacement.  |
| `seed`            | integer | No       | (random) | Random seed for reproducibility.     |

**Example — 10% sample for development:**

```yaml
transformation:
  - name: devSample
    sample:
      from: production_data
      fraction: 0.1
      seed: 42
```

**Example — sample with replacement:**

```yaml
transformation:
  - name: bootstrapSample
    sample:
      from: training_data
      fraction: 0.5
      withReplacement: true
      seed: 12345
```

> **Tip:** Use the `seed` parameter to get reproducible samples across pipeline runs. Without it, each run produces different results.

---

## Offset (8.32) {#offset}

*New in v3.0.*

Skips the first N rows from a dataset.

**Schema:**

| Field   | Type     | Required | Description                              |
|---------|----------|----------|------------------------------------------|
| `from`  | AssetRef | Yes      | Source asset.                            |
| `count` | integer  | Yes      | Rows to skip. Must be >= 0.              |

Setting `count: 0` is a no-op.

> **Tip:** Without a preceding `orderBy`, the skipped rows are non-deterministic. Combine with `orderBy` for predictable results.

**Example -- skip the first 50 rows:**

```yaml
transformation:
  - name: sorted
    orderBy:
      from: events
      columns:
        - column: event_time
          direction: asc

  - name: skipped
    offset:
      from: sorted
      count: 50
```

**Example -- pagination with offset and limit:**

```yaml
transformation:
  - name: page3
    offset:
      from: sorted
      count: 200

  - name: page3Limited
    limit:
      from: page3
      count: 100
```

---

## Tail (8.33) {#tail}

*New in v3.0.*

Returns the last N rows from a dataset.

**Schema:**

| Field   | Type     | Required | Description                                  |
|---------|----------|----------|----------------------------------------------|
| `from`  | AssetRef | Yes      | Source asset.                                |
| `count` | integer  | Yes      | Maximum rows from the end. Must be >= 0.      |

Setting `count: 0` produces an empty dataset with the same schema.

> **Tip:** `tail` requires materializing the entire input, so it may have performance implications on large datasets. Prefer `orderBy` + `limit` when possible.

**Example -- last 10 events:**

```yaml
transformation:
  - name: sorted
    orderBy:
      from: events
      columns:
        - column: event_time
          direction: asc

  - name: latestEvents
    tail:
      from: sorted
      count: 10
```

---

## Drop NA (8.35) {#dropna}

*New in v3.0.*

Drops rows with NULL values.

**Schema:**

| Field          | Type          | Required | Default  | Description                                            |
|----------------|---------------|----------|----------|--------------------------------------------------------|
| `from`         | AssetRef      | Yes      | --       | Source asset.                                          |
| `columns`      | List[Column]  | No       | all      | Columns to check for NULLs.                           |
| `how`          | `"any"` or `"all"` | No | `"any"`  | Drop if any/all target columns are NULL.               |
| `minNonNulls`  | integer       | No       | --       | Keep row only if >= N non-NULL values. Overrides `how`. |

**Example -- drop rows where any of the key columns are NULL:**

```yaml
transformation:
  - name: complete
    dropNa:
      from: users
      how: any
      columns: [name, email]
```

**Example -- keep rows with at least 3 non-NULL values:**

```yaml
transformation:
  - name: sufficient
    dropNa:
      from: survey_responses
      minNonNulls: 3
```

> **Tip:** Use `how: "all"` to only drop rows where every checked column is NULL. This is less aggressive than the default `"any"` mode.
