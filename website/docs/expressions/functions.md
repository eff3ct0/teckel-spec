# Functions

A conforming Teckel implementation must support the core functions listed on this page. Functions are called with standard syntax: `function_name(arg1, arg2, ...)`. Calls can be nested to arbitrary depth. Named arguments (`name => value`) are also supported in v3.0.

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

---

## Collection Functions (v3.0) {#collection-functions}

Collection functions operate on arrays and maps. These are new in Teckel 3.0.

| Function | Return Type | Description |
|----------|-------------|-------------|
| `size(expr)` | integer | Number of elements in array or entries in map. |
| `array_contains(array, value)` | boolean | True if array contains the value. |
| `element_at(array_or_map, key)` | varies | Element at index (array, 0-based) or key (map). |
| `explode(expr)` | rows | Expands array/map into multiple rows. |
| `explode_outer(expr)` | rows | Like `explode`, but preserves NULL/empty as a single row. |
| `posexplode(expr)` | rows | Like `explode`, but also produces a position column. |
| `flatten(array)` | array | Flattens a nested array by one level. |
| `array_distinct(array)` | array | Removes duplicates from an array. |
| `array_sort(array)` | array | Sorts array elements in ascending order. |
| `array_union(a1, a2)` | array | Union of two arrays (no duplicates). |
| `array_intersect(a1, a2)` | array | Elements common to both arrays. |
| `array_except(a1, a2)` | array | Elements in a1 but not a2. |
| `array_join(array, delim)` | string | Concatenates array elements with a delimiter. |
| `array_position(array, elem)` | integer | 1-based position of element (0 if not found). |
| `array_remove(array, elem)` | array | Removes all occurrences of element. |
| `array_repeat(elem, count)` | array | Creates an array repeating element count times. |
| `arrays_zip(a1, a2, ...)` | array | Merges arrays into an array of structs. |
| `array_compact(array)` | array | Removes NULL elements from an array. |
| `map_keys(map)` | array | Returns the map's keys as an array. |
| `map_values(map)` | array | Returns the map's values as an array. |
| `map_concat(m1, m2, ...)` | map | Merges multiple maps. Later keys overwrite. |
| `map_from_arrays(keys, values)` | map | Creates a map from key and value arrays. |
| `map_from_entries(array)` | map | Creates a map from key-value struct entries. |
| `map_entries(map)` | array | Returns key-value struct entries as an array. |

### Examples

```yaml
columns:
  - "size(tags) as tag_count"
  - "array_contains(roles, 'admin') as is_admin"
  - "array_join(tags, ', ') as tags_string"
  - "map_keys(attributes) as attr_names"
```

## Higher-Order Functions (v3.0) {#higher-order-functions}

Higher-order functions accept lambda expressions as arguments. See [Lambda Expressions](syntax.md#lambda-expressions).

| Function | Return Type | Description |
|----------|-------------|-------------|
| `transform(array, func)` | array | Apply function to each element. |
| `filter(array, func)` | array | Keep elements matching predicate. |
| `aggregate(array, zero, merge)` | varies | Reduce array to single value. |
| `exists(array, func)` | boolean | True if any element matches predicate. |
| `forall(array, func)` | boolean | True if all elements match predicate. |
| `transform_keys(map, func)` | map | Apply function to each key. |
| `transform_values(map, func)` | map | Apply function to each value. |
| `map_filter(map, func)` | map | Keep entries matching predicate. |
| `zip_with(a1, a2, func)` | array | Merge two arrays element-wise using function. |

### Examples

```yaml
columns:
  - "transform(prices, x -> x * 1.1) as prices_with_tax"
  - "filter(scores, x -> x >= 60) as passing_scores"
  - "aggregate(amounts, 0, (acc, x) -> acc + x) as total"
  - "exists(tags, t -> t = 'urgent') as has_urgent"
  - "transform_values(metrics, (k, v) -> round(v, 2)) as rounded_metrics"
```

## Struct Functions (v3.0) {#struct-functions}

Functions for creating and manipulating struct values.

| Function | Return Type | Description |
|----------|-------------|-------------|
| `struct(expr, ...)` | struct | Creates a struct from positional values. |
| `named_struct(name, val, ...)` | struct | Creates a struct with named fields. |
| `with_field(struct, name, value)` | struct | Adds or replaces a field in a struct. |
| `drop_fields(struct, name, ...)` | struct | Removes fields from a struct. |

### Examples

```yaml
columns:
  - "named_struct('name', full_name, 'age', age) as person"
  - "with_field(address, 'country', 'US') as updated_address"
  - "drop_fields(record, 'internal_id', 'debug_info') as clean_record"
```

## JSON Functions (v3.0) {#json-functions}

Functions for parsing, generating, and querying JSON data.

| Function | Return Type | Description |
|----------|-------------|-------------|
| `from_json(string, schema)` | struct | Parse JSON string into a struct. |
| `to_json(expr)` | string | Convert struct/array/map to JSON string. |
| `get_json_object(string, path)` | string | Extract value by JSONPath. |
| `json_tuple(string, key, ...)` | tuple | Extract multiple values from JSON string. |
| `schema_of_json(string)` | string | Infer schema of a JSON string as DDL. |
| `parse_json(string)` | variant | Parse JSON string to variant type. |

### Examples

```yaml
columns:
  - "get_json_object(payload, '$.user.name') as user_name"
  - "to_json(named_struct('id', id, 'name', name)) as json_output"
  - "from_json(raw_json, 'struct<name: string, age: int>') as parsed"
```

## Interval and Temporal Functions (v3.0) {#interval-functions}

Extended temporal functions including interval construction and additional date/time operations.

| Function | Return Type | Description |
|----------|-------------|-------------|
| `make_interval(years, months, weeks, days, hours, mins, secs)` | interval | Construct a calendar interval. |
| `make_ym_interval(years, months)` | interval | Construct a year-month interval. |
| `make_dt_interval(days, hours, mins, secs)` | interval | Construct a day-time interval. |
| `extract(field FROM expr)` | integer | Extract field from date/timestamp/interval. |
| `date_trunc(unit, expr)` | timestamp | Truncate timestamp to specified unit. |
| `months_between(end, start)` | double | Number of months between two dates. |
| `add_months(date, n)` | date | Add N months to a date. |
| `last_day(date)` | date | Last day of the month. |
| `next_day(date, dayOfWeek)` | date | Next occurrence of the given day of week. |
| `current_timestamp_ntz()` | timestamp_ntz | Current local timestamp without timezone. |
| `to_timestamp_ntz(expr, format)` | timestamp_ntz | Parse string to timestamp without timezone. |
| `current_time()` | time | Current time of day. |
| `make_time(hour, min, sec)` | time | Construct time from components. |

### Examples

```yaml
columns:
  - "extract(QUARTER FROM order_date) as quarter"
  - "date_trunc('month', event_timestamp) as month_start"
  - "months_between(end_date, start_date) as duration_months"
  - "last_day(report_date) as month_end"
  - "current_timestamp_ntz() as local_now"
```

## Statistical Aggregate Functions (v3.0) {#statistical-functions}

Statistical functions for advanced analytics.

| Function | Return Type | Description |
|----------|-------------|-------------|
| `stddev(expr)` | double | Sample standard deviation. |
| `stddev_samp(expr)` | double | Sample standard deviation. |
| `stddev_pop(expr)` | double | Population standard deviation. |
| `variance(expr)` | double | Sample variance. |
| `var_samp(expr)` | double | Sample variance. |
| `var_pop(expr)` | double | Population variance. |
| `corr(expr1, expr2)` | double | Pearson correlation coefficient. |
| `covar_samp(expr1, expr2)` | double | Sample covariance. |
| `covar_pop(expr1, expr2)` | double | Population covariance. |
| `skewness(expr)` | double | Skewness. |
| `kurtosis(expr)` | double | Excess kurtosis. |
| `percentile(expr, p)` | double | Exact percentile (p in [0, 1]). |
| `percentile_approx(expr, p, accuracy)` | double | Approximate percentile. |
| `grouping(expr)` | integer | 1 if column is aggregated in a grouping set, 0 otherwise. |
| `grouping_id(expr, ...)` | integer | Bitmask of grouping columns. |

### Examples

```yaml
# In a groupBy transformation
agg:
  - "stddev(salary) as salary_stddev"
  - "corr(hours_worked, output) as productivity_correlation"
  - "percentile_approx(response_time, 0.95) as p95_latency"
  - "skewness(order_amount) as amount_skew"
```

## Variant Functions (v3.0) {#variant-functions}

Functions for working with the semi-structured `variant` data type.

| Function | Return Type | Description |
|----------|-------------|-------------|
| `parse_json(string)` | variant | Parse JSON string to variant. |
| `to_json(variant)` | string | Convert variant to JSON string. |
| `variant_get(variant, path, type)` | typed | Extract and cast value from variant by JSONPath. |
| `try_variant_get(variant, path, type)` | typed | Like `variant_get`, returns NULL on failure. |
| `is_variant_null(variant)` | boolean | True if variant value is JSON null. |
| `schema_of_variant(variant)` | string | Infer schema of variant as DDL string. |

### Examples

```yaml
columns:
  - "parse_json(raw_payload) as data"
  - "variant_get(data, '$.user.name', 'string') as user_name"
  - "try_variant_get(data, '$.count', 'integer') as count"
  - "is_variant_null(data) as is_empty"
```
