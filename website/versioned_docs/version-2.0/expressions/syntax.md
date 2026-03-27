# Expression Language Syntax

Teckel uses a SQL-like expression language for filters, column definitions, aggregations, conditions, and computed values. Expressions appear throughout a Teckel document wherever a value needs to be computed rather than stated literally.

> **Formal reference:** [Section 9 — Expression Language](https://github.com/eff3ct0/teckel-spec/blob/main/spec/v2.0/teckel-spec.md#9-expression-language) in the Teckel Specification.

![Expression anatomy](/img/diagrams/expression-tree.svg)

## Literals

The expression language supports five literal types.

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
| `integer` / `int` | `array<element_type>` |
| `long` | `map<key_type, value_type>` |
| `float` | `struct<name: type, ...>` |
| `double` | |
| `boolean` | |
| `date` | |
| `timestamp` | |
| `binary` | |

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
