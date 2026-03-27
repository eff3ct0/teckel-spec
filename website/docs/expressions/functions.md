# Functions

A conforming Teckel implementation must support the core functions listed on this page. Functions are called with standard syntax: `function_name(arg1, arg2, ...)`. Calls can be nested to arbitrary depth.

## Aggregate Functions

Aggregate functions operate on a set of rows and return a single value. They are used in `groupBy` transformations and in `select` with grouping.

| Function | Return Type | Description |
|----------|-------------|-------------|
| `count(expr)` | integer | Count of non-NULL values. |
| `count(*)` | integer | Total row count, including NULLs. |
| `count(DISTINCT expr)` | integer | Count of distinct non-NULL values. |
| `sum(expr)` | same as input | Sum of non-NULL values. NULL if all inputs are NULL. |
| `avg(expr)` | double | Average of non-NULL values. NULL if all inputs are NULL. |
| `min(expr)` | same as input | Minimum non-NULL value. NULL if all inputs are NULL. |
| `max(expr)` | same as input | Maximum non-NULL value. NULL if all inputs are NULL. |

### Examples

```yaml
- asset:
    ref: order_stats
    source:
      groupBy:
        from: orders
        grouping:
          - "customer_id"
        columns:
          - "customer_id"
          - "count(*) as total_orders"
          - "count(DISTINCT product_id) as unique_products"
          - "sum(amount) as total_spent"
          - "avg(amount) as avg_order_value"
          - "min(order_date) as first_order"
          - "max(order_date) as last_order"
```

### NULL Behavior in Aggregations

| Function | All values NULL | Mix of NULL and non-NULL |
|----------|-----------------|--------------------------|
| `count(expr)` | 0 | Count of non-NULL values |
| `count(*)` | Row count | Row count |
| `sum(expr)` | NULL | Sum of non-NULL values |
| `avg(expr)` | NULL | Average of non-NULL values |
| `min(expr)` | NULL | Minimum of non-NULL values |
| `max(expr)` | NULL | Maximum of non-NULL values |

## String Functions

| Function | Return Type | Description |
|----------|-------------|-------------|
| `concat(expr, ...)` | string | Concatenate arguments. NULL if any argument is NULL. |
| `upper(expr)` | string | Convert to uppercase. |
| `lower(expr)` | string | Convert to lowercase. |
| `trim(expr)` | string | Remove leading and trailing whitespace. |
| `ltrim(expr)` | string | Remove leading whitespace. |
| `rtrim(expr)` | string | Remove trailing whitespace. |
| `length(expr)` | integer | String length in characters. |
| `substring(expr, start, len)` | string | Extract substring. Positions are 1-indexed. |
| `replace(expr, search, replacement)` | string | Replace all occurrences of `search` with `replacement`. |
| `coalesce(expr, ...)` | same as first non-NULL | Return the first non-NULL argument. |

### Examples

```yaml
columns:
  - "concat(first_name, ' ', last_name) as full_name"
  - "upper(country_code) as country"
  - "lower(email) as email_normalized"
  - "trim(raw_input) as clean_input"
  - "length(description) as desc_length"
  - "substring(phone, 1, 3) as area_code"
  - "replace(name, 'Corp.', 'Corporation') as name_full"
  - "coalesce(nickname, first_name, 'Unknown') as display_name"
```

Nested string functions:

```yaml
columns:
  - "upper(trim(concat(first_name, ' ', last_name))) as full_name_upper"
```

## Numeric Functions

| Function | Return Type | Description |
|----------|-------------|-------------|
| `abs(expr)` | same as input | Absolute value. |
| `round(expr, scale)` | same as input | Round to `scale` decimal places. |
| `floor(expr)` | same as input | Round down to nearest integer. |
| `ceil(expr)` | same as input | Round up to nearest integer. |
| `power(base, exp)` | double | Exponentiation. |
| `sqrt(expr)` | double | Square root. |
| `mod(expr, divisor)` | same as input | Modulo (equivalent to the `%` operator). |

### Examples

```yaml
columns:
  - "abs(balance) as absolute_balance"
  - "round(price * tax_rate, 2) as tax_amount"
  - "floor(rating) as rating_floor"
  - "ceil(duration / 60.0) as duration_hours"
  - "power(growth_rate, years) as compound_factor"
  - "sqrt(variance) as std_deviation"
  - "mod(row_id, 10) as partition_bucket"
```

## Date/Time Functions

| Function | Return Type | Description |
|----------|-------------|-------------|
| `current_date()` | date | Current date at pipeline execution time. |
| `current_timestamp()` | timestamp | Current timestamp at pipeline execution time. |
| `year(expr)` | integer | Extract the year component. |
| `month(expr)` | integer | Extract the month (1–12). |
| `day(expr)` | integer | Extract the day of month (1–31). |
| `hour(expr)` | integer | Extract the hour (0–23). |
| `minute(expr)` | integer | Extract the minute (0–59). |
| `second(expr)` | integer | Extract the second (0–59). |
| `date_add(date, days)` | date | Add a number of days to a date. |
| `date_diff(end, start)` | integer | Number of days between two dates (`end - start`). |
| `to_date(expr, format)` | date | Parse a string into a date using the given format. |
| `to_timestamp(expr, format)` | timestamp | Parse a string into a timestamp using the given format. |

### Examples

```yaml
columns:
  - "current_date() as run_date"
  - "current_timestamp() as run_timestamp"
  - "year(order_date) as order_year"
  - "month(order_date) as order_month"
  - "day(order_date) as order_day"
  - "hour(event_time) as event_hour"
  - "date_add(start_date, 30) as due_date"
  - "date_diff(end_date, start_date) as duration_days"
  - "to_date(date_string, 'yyyy-MM-dd') as parsed_date"
  - "to_timestamp(ts_string, 'yyyy-MM-dd HH:mm:ss') as parsed_ts"
```

Date extraction is commonly paired with grouping:

```yaml
- asset:
    ref: monthly_revenue
    source:
      groupBy:
        from: orders
        grouping:
          - "year(order_date)"
          - "month(order_date)"
        columns:
          - "year(order_date) as year"
          - "month(order_date) as month"
          - "sum(amount) as revenue"
```

## Window Functions

Window functions compute values across a set of rows related to the current row without collapsing the result. They are used in `window` transformations with `partitionBy` and `orderBy` clauses.

| Function | Return Type | Description |
|----------|-------------|-------------|
| `row_number()` | integer | Sequential row number within the partition (1-based). |
| `rank()` | integer | Rank within the partition. Rows with equal values receive the same rank; the next rank has a gap. |
| `dense_rank()` | integer | Rank within the partition. No gaps between ranks for ties. |
| `lag(expr, offset)` | same as input | Value from `offset` rows before the current row. NULL if out of range. |
| `lead(expr, offset)` | same as input | Value from `offset` rows after the current row. NULL if out of range. |
| `first_value(expr)` | same as input | First value in the window frame. |
| `last_value(expr)` | same as input | Last value in the window frame. |
| `ntile(n)` | integer | Distributes rows into `n` approximately equal-sized buckets, numbered 1 through `n`. |

### Examples

```yaml
- asset:
    ref: ranked_employees
    source:
      window:
        from: employees
        columns:
          - column: "row_number() as rn"
            partitionBy:
              - "department"
            orderBy:
              - column: "salary"
                direction: desc
```

```yaml
- asset:
    ref: sales_with_context
    source:
      window:
        from: daily_sales
        columns:
          - column: "lag(revenue, 1) as prev_day_revenue"
            partitionBy:
              - "store_id"
            orderBy:
              - column: "sale_date"
                direction: asc
          - column: "lead(revenue, 1) as next_day_revenue"
            partitionBy:
              - "store_id"
            orderBy:
              - column: "sale_date"
                direction: asc
```

```yaml
- asset:
    ref: ranked_products
    source:
      window:
        from: product_sales
        columns:
          - column: "rank() as sales_rank"
            partitionBy:
              - "category"
            orderBy:
              - column: "total_sold"
                direction: desc
          - column: "dense_rank() as dense_sales_rank"
            partitionBy:
              - "category"
            orderBy:
              - column: "total_sold"
                direction: desc
          - column: "ntile(4) as quartile"
            partitionBy:
              - "category"
            orderBy:
              - column: "total_sold"
                direction: desc
```

Accessing boundary values in a partition:

```yaml
columns:
  - column: "first_value(price) as opening_price"
    partitionBy:
      - "symbol"
    orderBy:
      - column: "trade_date"
        direction: asc
  - column: "last_value(price) as closing_price"
    partitionBy:
      - "symbol"
    orderBy:
      - column: "trade_date"
        direction: asc
```

## Conditional Functions

Conditional functions handle NULL values and provide inline branching logic.

| Function | Return Type | Description |
|----------|-------------|-------------|
| `coalesce(expr, ...)` | varies | Return the first non-NULL argument. |
| `nullif(expr1, expr2)` | same as expr1 | Return NULL if `expr1 = expr2`, otherwise return `expr1`. |
| `ifnull(expr, default)` | varies | Return `default` if `expr` is NULL, otherwise return `expr`. Equivalent to `coalesce(expr, default)`. |

### Examples

```yaml
columns:
  # Use first available contact method
  - "coalesce(mobile_phone, home_phone, office_phone, 'no phone') as contact_phone"

  # Avoid division by zero: nullif returns NULL when divisor is 0,
  # which makes the division produce NULL instead of an error
  - "total / nullif(count, 0) as safe_average"

  # Provide a default for missing values
  - "ifnull(middle_name, '') as middle_name"
```

Note that `coalesce` also appears in the String Functions section because it is commonly used with string values, but it works with any data type.

For more advanced conditional logic, use the [CASE expression](syntax.md#case-expressions):

```yaml
columns:
  - "CASE WHEN score >= 90 THEN 'A' WHEN score >= 80 THEN 'B' WHEN score >= 70 THEN 'C' ELSE 'F' END as grade"
```
