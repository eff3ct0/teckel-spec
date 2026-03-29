# Expression Language Syntax

Teckel uses a SQL-like expression language for filters, column definitions, aggregations, conditions, and computed values. Expressions appear throughout a Teckel document wherever a value needs to be computed rather than stated literally.

> **Formal reference:** [Section 9 — Expression Language](https://github.com/eff3ct0/teckel-spec/blob/main/spec/v3.0/teckel-spec.md#9-expression-language) in the Teckel Specification.

![Expression anatomy](/img/diagrams/expression-tree.svg)

:::info v3.0 Expression Language Enhancements
Teckel 3.0 significantly expands the expression language with the following new features:

- **Lambda expressions** (`x -> x + 1`) for use with higher-order functions
- **String concatenation operator** (`||`) as an alternative to the `concat` function
- **Null-safe equality operator** (`<=>`) that returns `true` when both operands are NULL
- **RLIKE operator** for regular expression matching (`name RLIKE '^A.*'`)
- **TRY_CAST** that returns NULL on failure instead of raising an error
- **Inline OVER clause** for window expressions in any expression context
- **Nested value access** with `.field` and `[key]` syntax for structs, maps, and arrays
- **Named arguments** in function calls (`substring(str => name, pos => 1, len => 3)`)
- **Typed literals** for DATE, TIMESTAMP, TIMESTAMP_NTZ, binary (`X'...'`), and INTERVAL values
- **Complex literals** for ARRAY, MAP, STRUCT, and NAMED_STRUCT construction

See the sections below and the [formal specification](https://github.com/eff3ct0/teckel-spec/blob/main/spec/v3.0/teckel-spec.md#9-expression-language) for details.
:::

## Literals

The expression language supports five literal types, plus typed and complex literals added in v3.0.

### String Literals

Strings are delimited by **single quotes**. To include a literal single quote inside a string, double it.

```yaml
# String literal examples
columns:
  - "'hello'"
  - "'it''s a value'"
  - "''"                  # empty string
```

There are no backslash escape sequences. Since Teckel expressions are embedded in YAML, use YAML's own escaping for special characters. For characters like newline, use function calls (e.g., `char(10)`).

### Integer Literals

Integers are sequences of digits, optionally preceded by a minus sign.

```
42
-1
0
```

### Double Literals

Doubles include a decimal point with digits on both sides, optionally preceded by a minus sign.

```
3.14
-0.5
100.0
```

### Boolean Literals

Boolean values are lowercase `true` and `false`.

```
true
false
```

### Null Literal

The null literal is written as `NULL` or `null`. Both forms are equivalent.

```
NULL
null
```

## Column References

### Unqualified References

An unqualified column reference is a plain identifier that resolves against the current dataset.

```yaml
columns:
  - "name"
  - "age"
  - "total_amount"
```

### Qualified References

A qualified reference uses dot notation to specify the source asset, which is essential in joins and other multi-source contexts.

```yaml
condition: "orders.customer_id = customers.id"
```

Here, `orders` and `customers` refer to the asset names declared elsewhere in the Teckel document, and `customer_id` and `id` are column names within those assets.

## Backtick-Quoted Identifiers

Identifiers that contain spaces, dots, hyphens, or that collide with reserved words must be enclosed in backticks.

```yaml
columns:
  - "`my column`"
  - "`order`"              # "order" is a reserved word
  - "`table.name`"         # literal dot in the column name, not a qualified reference
  - "`first-name`"         # hyphens require quoting
```

An identifier that follows the standard rules (starts with a letter, contains only letters, digits, and underscores) does not need backticks.

## CASE Expressions

The `CASE` expression provides conditional logic inline. It evaluates `WHEN` conditions in order and returns the `THEN` value for the first condition that is true. If no condition matches, it returns the `ELSE` value (or NULL if `ELSE` is omitted).

```yaml
columns:
  - "CASE WHEN amount > 1000 THEN 'high' WHEN amount > 100 THEN 'medium' ELSE 'low' END as tier"
```

A more elaborate example with nested expressions:

```yaml
columns:
  - >-
    CASE
      WHEN status = 'active' AND balance > 0 THEN 'healthy'
      WHEN status = 'active' AND balance <= 0 THEN 'at_risk'
      ELSE 'inactive'
    END as account_health
```

CASE expressions can appear anywhere an expression is valid, including inside function calls:

```yaml
columns:
  - "sum(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as completed_total"
```

## CAST Expressions

`CAST` converts a value from one type to another. The target type follows the `AS` keyword.

```yaml
columns:
  - "CAST(age as string)"
  - "CAST(price as decimal(10, 2))"
  - "CAST(event_date as timestamp)"
  - "CAST(raw_data as array<string>)"
```

The supported type names are:

| Simple Types | Parameterized Types |
|---|---|
| `string` | `decimal(precision, scale)` |
| `byte` / `tinyint` *(v3.0)* | `char(n)` *(v3.0)* |
| `short` / `smallint` *(v3.0)* | `varchar(n)` *(v3.0)* |
| `integer` / `int` | `time(precision)` *(v3.0)* |
| `long` / `bigint` | `interval qualifier` *(v3.0)* |
| `float` | `array<element_type>` |
| `double` | `map<key_type, value_type>` |
| `boolean` | `struct<name: type, ...>` |
| `date` | |
| `timestamp` | |
| `timestamp_ntz` *(v3.0)* | |
| `time` *(v3.0)* | |
| `binary` | |
| `variant` *(v3.0)* | |

Type names are case-insensitive: `String`, `STRING`, and `string` are all equivalent.

## Aliasing with `as`

Any expression can be given an alias using the `as` keyword. Aliasing has the **lowest precedence** of all operators, so it always applies to the entire expression.

```yaml
columns:
  - "name as customer_name"
  - "price * quantity as line_total"
  - "upper(trim(email)) as normalized_email"
  - "count(*) as total_rows"
  - "CAST(amount as double) as amount_dbl"
```

Aliases define the column name in the resulting dataset. In a `select` transformation, each column expression typically includes an alias to name the output column.

## Nested Function Calls

Functions can be nested to arbitrary depth:

```yaml
columns:
  - "upper(trim(concat(first_name, ' ', last_name))) as full_name"
  - "round(abs(balance - previous_balance), 2) as change"
```

## Typed Literals (v3.0) {#typed-literals}

Teckel 3.0 introduces typed literal syntax for unambiguous value specification.

| Literal Syntax | Type | Description |
|----------------|------|-------------|
| `DATE 'yyyy-MM-dd'` | `date` | Calendar date |
| `TIMESTAMP 'iso8601'` | `timestamp` | Timestamp with timezone |
| `TIMESTAMP_NTZ 'iso8601'` | `timestamp_ntz` | Timestamp without timezone |
| `X'hex'` | `binary` | Binary from hexadecimal |
| `INTERVAL n UNIT [m UNIT ...]` | interval | Interval literal |

```yaml
columns:
  - "DATE '2025-06-15' as release_date"
  - "TIMESTAMP '2025-06-15T10:30:00Z' as event_ts"
  - "INTERVAL 30 DAYS as retention_period"
  - "order_date + INTERVAL 7 DAYS as due_date"
```

## Complex Literals (v3.0) {#complex-literals}

Inline construction of arrays, maps, and structs.

```yaml
columns:
  - "ARRAY(1, 2, 3) as numbers"
  - "MAP('key1', 'val1', 'key2', 'val2') as metadata"
  - "NAMED_STRUCT('name', full_name, 'age', age) as person"
```

## String Concatenation Operator (v3.0) {#string-concat-operator}

The `||` operator concatenates two values as strings. Non-string operands are implicitly cast to string.

```yaml
columns:
  - "first_name || ' ' || last_name as full_name"
  - "name || ' (' || id || ')' as label"
```

If either operand is NULL, the result is NULL.

## Null-safe Equality (v3.0) {#null-safe-equality}

The `<=>` operator returns `true` when both operands are NULL, and `false` (not NULL) when exactly one operand is NULL. This is useful for comparing columns that may contain NULL values.

```yaml
filter: "a <=> b"
# NULL <=> NULL  -> true
# NULL <=> 1     -> false
# 1    <=> 1     -> true
```

## RLIKE (Regex Match) (v3.0) {#rlike}

The `RLIKE` operator tests whether a string matches a regular expression.

```yaml
filter: "email RLIKE '.*@company\\.com$'"
filter: "name NOT RLIKE '^[0-9]'"
```

The regex syntax is implementation-defined (typically Java/PCRE).

## TRY_CAST (v3.0) {#try-cast}

`TRY_CAST` is a variant of `CAST` that returns NULL instead of raising an error when the cast fails.

```yaml
columns:
  - "TRY_CAST(raw_age AS integer) as age"
  - "TRY_CAST(date_string AS date) as parsed_date"
```

:::caution Migration Note
In Teckel v2.0, `CAST` used TRY semantics (NULL on failure). In v3.0, `CAST` follows ANSI SQL (error on failure). Existing pipelines using CAST for lenient parsing should migrate to `TRY_CAST`.
:::

## Lambda Expressions (v3.0) {#lambda-expressions}

Lambda expressions define inline functions for use with higher-order functions.

```yaml
columns:
  - "transform(scores, x -> x * 100) as percentages"
  - "filter(items, x -> x > 0) as positive_items"
  - "aggregate(values, 0, (acc, x) -> acc + x) as total"
```

Lambdas are valid only as arguments to higher-order functions. They cannot appear as standalone expressions.

## Named Arguments (v3.0) {#named-arguments}

Function calls may use named arguments with the `=>` operator. Positional arguments must precede named arguments.

```yaml
columns:
  - "substring(str => name, pos => 1, len => 3) as prefix"
  - "date_format(created_at, format => 'yyyy-MM-dd') as formatted"
```

## Nested Value Access (v3.0) {#nested-access}

Expressions support accessing nested values in structs, maps, and arrays.

| Syntax | Description |
|--------|-------------|
| `expr.field` | Access a struct field by name |
| `expr[key]` | Access a map value by key, or an array element by 0-based index |

Access is composable to arbitrary depth:

```yaml
columns:
  - "address.city as city"
  - "metadata['source'] as source"
  - "items[0] as first_item"
  - "orders[0].items[0].price as first_price"
```

## Inline Window Expressions (v3.0) {#inline-window}

Window functions may be used inline with the `OVER` clause in any expression context, as an alternative to the dedicated `window` transformation.

```yaml
columns:
  - "row_number() OVER (PARTITION BY department ORDER BY salary DESC) as rank"
  - "sum(salary) OVER (PARTITION BY department ORDER BY hire_date ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) as running_total"
  - "lag(salary, 1) OVER (PARTITION BY department ORDER BY hire_date) as prev_salary"
```

## Putting It All Together

A complete select transformation using various expression features:

```yaml
- asset:
    ref: customer_summary
    source:
      select:
        from: raw_customers
        columns:
          - "customer_id"
          - "upper(trim(name)) as name"
          - "CAST(signup_date as date) as signup_date"
          - "CASE WHEN lifetime_value > 10000 THEN 'platinum' WHEN lifetime_value > 1000 THEN 'gold' ELSE 'standard' END as tier"
          - "coalesce(email, 'unknown') as email"
          - "round(lifetime_value / order_count, 2) as avg_order_value"
```
