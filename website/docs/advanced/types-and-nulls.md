# Data Types and Null Semantics

This chapter covers the Teckel type system and the rules governing null values across all operations.

---

## Data Types

### Type System

Teckel supports the following data types. Type names are **case-insensitive**: `String`, `STRING`, and `string` are all equivalent.

#### Simple Types

| Type | Description | Example Values |
|------|-------------|----------------|
| `string` | Variable-length UTF-8 text | `'hello'`, `''` |
| `integer` or `int` | 32-bit signed integer | `42`, `-1`, `0` |
| `long` | 64-bit signed integer | `2147483648` |
| `float` | 32-bit IEEE 754 floating point | `3.14` |
| `double` | 64-bit IEEE 754 floating point | `3.141592653589793` |
| `boolean` | Boolean | `true`, `false` |
| `date` | Calendar date (no time component) | `2025-01-15` |
| `timestamp` | Date with time and timezone | `2025-01-15T10:30:00Z` |
| `binary` | Arbitrary binary data | -- |

#### Parameterized Types

| Type | Syntax | Example |
|------|--------|---------|
| `decimal` | `decimal(precision, scale)` | `decimal(10, 2)` |
| `array` | `array<elementType>` | `array<string>` |
| `map` | `map<keyType, valueType>` | `map<string, integer>` |
| `struct` | `struct<field: type, ...>` | `struct<name: string, age: int>` |

**Decimal** represents a fixed-point number. The first parameter is the total number of digits (precision), and the second is the number of digits after the decimal point (scale).

```yaml
# Cast a column to decimal with 10 digits total, 2 after the decimal
- name: withPrecision
  castColumns:
    from: orders
    columns:
      - name: amount
        targetType: "decimal(10, 2)"
```

**Array** holds an ordered collection of elements of a single type. Arrays can be nested.

```yaml
# An array of strings
targetType: "array<string>"

# An array of arrays of integers
targetType: "array<array<integer>>"
```

**Map** holds key-value pairs. Keys and values each have a declared type.

```yaml
# A map from string keys to integer values
targetType: "map<string, integer>"
```

**Struct** holds named fields, each with its own type. Field syntax uses `name: type` pairs separated by commas.

```yaml
# A struct with two fields
targetType: "struct<name: string, age: int>"

# A nested struct
targetType: "struct<address: struct<city: string, zip: string>, active: boolean>"
```

### EBNF Grammar for Type Names

```ebnf
type_name          = simple_type | parameterized_type ;
simple_type        = "string" | "integer" | "int" | "long" | "float"
                   | "double" | "boolean" | "date" | "timestamp" | "binary" ;
parameterized_type = "decimal", "(", integer_literal, ",", integer_literal, ")"
                   | "array", "<", type_name, ">"
                   | "map", "<", type_name, ",", type_name, ">"
                   | "struct", "<", struct_fields, ">" ;
struct_fields      = struct_field, { ",", struct_field } ;
struct_field       = identifier, ":", type_name ;
```

### Implicit Type Widening

When an operation involves mixed types, the runtime automatically widens the narrower type. Widening never loses information.

| From | To | Context |
|------|----|---------|
| `integer` | `long` | Arithmetic with a `long` operand |
| `integer`, `long` | `double` | Arithmetic with a `double` operand |
| `float` | `double` | Arithmetic with a `double` operand |
| `integer`, `long` | `decimal` | Arithmetic with a `decimal` operand |
| `date` | `timestamp` | Comparison with a `timestamp` operand |

If a widening cannot be performed safely, the implementation raises `E-TYPE-001`.

### Casting

The `castColumns` transformation explicitly changes column types. When a value cannot be cast (for example, `"abc"` to `integer`), the result is `NULL` rather than a pipeline failure.

```yaml
- name: typed
  castColumns:
    from: raw
    columns:
      - name: age
        targetType: integer
      - name: balance
        targetType: "decimal(12, 4)"
```

---

## Null Semantics

Teckel follows **SQL three-valued logic** (true, false, NULL) for null handling. Understanding how nulls propagate through operations is essential for writing correct pipelines.

### General Rules

Any operation involving a NULL operand produces NULL, unless the operation is specifically designed to handle nulls (such as `IS NULL`).

| Operation | Result |
|-----------|--------|
| `NULL = NULL` | `NULL` (not `true`) |
| `NULL != NULL` | `NULL` (not `true`) |
| `NULL AND true` | `NULL` |
| `NULL AND false` | `false` |
| `NULL OR true` | `true` |
| `NULL OR false` | `NULL` |
| `NOT NULL` | `NULL` |
| `x + NULL` | `NULL` (any arithmetic with NULL) |
| `concat('a', NULL)` | `NULL` |

### IS NULL / IS NOT NULL

These are the only operators guaranteed to return a definite boolean (never NULL) when testing for null values:

```
x IS NULL         -- true if x is NULL, false otherwise
x IS NOT NULL     -- true if x is not NULL, false otherwise
```

### Null-Safe Functions

Several functions are specifically designed to handle nulls:

| Function | Behavior |
|----------|----------|
| `coalesce(a, b, ...)` | Returns the first non-NULL argument |
| `ifnull(expr, default)` | Returns `default` if `expr` is NULL; alias for `coalesce(expr, default)` |
| `nullif(a, b)` | Returns NULL if `a = b`, otherwise returns `a` |

### Nulls in Comparisons

Standard comparison operators (`=`, `!=`, `<`, `>`, `<=`, `>=`) return NULL when either operand is NULL. This means a `where` filter excludes rows where the condition evaluates to NULL, because NULL is not truthy.

```yaml
# Rows where salary is NULL are EXCLUDED (NULL > 50000 evaluates to NULL)
- name: highEarners
  where:
    from: employees
    filter: "salary > 50000"

# To include NULLs, use IS NULL explicitly
- name: highOrUnknown
  where:
    from: employees
    filter: "salary > 50000 OR salary IS NULL"
```

### Nulls in Arithmetic

Any arithmetic expression involving NULL produces NULL.

```yaml
# If quantity or unit_price is NULL, total will be NULL
- name: withTotal
  addColumns:
    from: orders
    columns:
      - name: total
        expression: "quantity * unit_price"

# Use coalesce to provide defaults
      - name: safe_total
        expression: "coalesce(quantity, 0) * coalesce(unit_price, 0)"
```

### Nulls in Aggregation

Aggregate functions skip NULL values (except `count(*)`).

| Function | All NULLs | Mix of NULL and values |
|----------|-----------|----------------------|
| `count(expr)` | `0` | Count of non-NULL values |
| `count(*)` | Row count | Row count (includes NULL rows) |
| `sum(expr)` | `NULL` | Sum of non-NULL values |
| `avg(expr)` | `NULL` | Average of non-NULL values |
| `min(expr)` | `NULL` | Minimum of non-NULL values |
| `max(expr)` | `NULL` | Maximum of non-NULL values |

### Nulls in Sorting

By default, NULL values sort **last** regardless of sort direction.

| Direction | Null Position |
|-----------|---------------|
| `asc` | Nulls last |
| `desc` | Nulls last |

This default can be overridden per-column:

```yaml
- name: sorted
  orderBy:
    from: data
    columns:
      - column: salary
        direction: desc
        nulls: first       # NULLs appear before non-NULL values
      - column: name
        direction: asc     # NULLs appear last (default)
```

### Nulls in Grouping

NULL values in grouping columns form a **single group**. All rows with NULL in a grouping column are placed together.

```yaml
# If department contains NULLs, there will be one group for NULL
- name: byDept
  group:
    from: employees
    by: [department]
    agg:
      - "count(1) as headcount"
```

### Nulls in Distinct

For deduplication purposes, NULL values are considered **equal**. Two rows that differ only in having NULL in the same column are treated as duplicates.

```yaml
# Only one row with NULL in the status column will be kept
- name: uniqueStatuses
  distinct:
    from: orders
    columns: [status]
```

### Nulls in Joins

Join conditions follow standard comparison rules: `NULL = NULL` evaluates to NULL (falsy), so NULLs **do not match** in join conditions.

```yaml
# Rows where dept_id is NULL in either side will NOT match
- name: joined
  join:
    left: employees
    right:
      - name: departments
        type: inner
        on:
          - "employees.dept_id = departments.id"

# In outer joins, non-matching rows have NULL-filled columns
- name: outerJoined
  join:
    left: employees
    right:
      - name: departments
        type: left
        on:
          - "employees.dept_id = departments.id"
    # Employees with no matching department will have
    # NULL for all departments.* columns
```

### Common Null Operations Reference

| Expression | Input | Result |
|-----------|-------|--------|
| `x = NULL` | any `x` | `NULL` |
| `NULL = NULL` | -- | `NULL` |
| `x IS NULL` | `x` is NULL | `true` |
| `x IS NULL` | `x` is 42 | `false` |
| `x IS NOT NULL` | `x` is NULL | `false` |
| `coalesce(NULL, NULL, 3)` | -- | `3` |
| `ifnull(NULL, 0)` | -- | `0` |
| `nullif(5, 5)` | -- | `NULL` |
| `nullif(5, 3)` | -- | `5` |
| `NULL + 1` | -- | `NULL` |
| `NULL > 0` | -- | `NULL` |
| `count(column_with_nulls)` | -- | count of non-NULL values |
| `count(*)` | -- | total row count |
| `sum(column_with_all_nulls)` | -- | `NULL` |
