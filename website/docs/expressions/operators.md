# Operators

Teckel's expression language provides arithmetic, comparison, logical, and special operators. This page documents each category and defines the precedence rules that govern evaluation order.

## Operator Precedence Table

Operators are listed from highest precedence (evaluated first) to lowest precedence (evaluated last).

| Precedence | Operator | Associativity | Description |
|------------|----------|---------------|-------------|
| 1 | `()`, function calls | -- | Grouping, function application |
| 2 | unary `-` | Right | Numeric negation |
| 3 | `*`, `/`, `%` | Left | Multiplication, division, modulo |
| 4 | `+`, `-` | Left | Addition, subtraction |
| 5 | `=`, `!=`, `<>`, `<`, `>`, `<=`, `>=`, `IS`, `IN`, `BETWEEN`, `LIKE` | -- | Comparison and special operators |
| 6 | `NOT` | Right | Logical negation |
| 7 | `AND` | Left | Logical conjunction |
| 8 | `OR` | Left | Logical disjunction |
| 9 | `as` | -- | Aliasing (lowest) |

Parentheses override default precedence. When in doubt, use them for clarity.

**Precedence example:**

```
NOT a AND b OR c
```

This parses as `((NOT a) AND b) OR c` because `NOT` binds tighter than `AND`, which binds tighter than `OR`.

## Arithmetic Operators

Arithmetic operators work on numeric types (`integer`, `long`, `float`, `double`, `decimal`).

| Operator | Description | Example | Result |
|----------|-------------|---------|--------|
| `+` | Addition | `price + tax` | Sum of price and tax |
| `-` | Subtraction | `total - discount` | Difference |
| `*` | Multiplication | `price * quantity` | Product |
| `/` | Division | `total / count` | Quotient |
| `%` | Modulo | `id % 10` | Remainder after division |
| unary `-` | Negation | `-balance` | Negated value |

```yaml
columns:
  - "price * quantity as line_total"
  - "(price * quantity) - discount as net_total"
  - "total / count as average"
  - "id % 100 as bucket"
  - "-balance as inverted_balance"
```

Any arithmetic operation involving NULL produces NULL:

```
x + NULL   -->  NULL
NULL * 5   -->  NULL
```

## Comparison Operators

Comparison operators return a boolean result (or NULL when either operand is NULL).

| Operator | Description | Example |
|----------|-------------|---------|
| `=` | Equal to | `status = 'active'` |
| `!=` | Not equal to | `status != 'cancelled'` |
| `<>` | Not equal to (alternative) | `status <> 'cancelled'` |
| `<` | Less than | `age < 18` |
| `>` | Greater than | `amount > 1000` |
| `<=` | Less than or equal to | `score <= 100` |
| `>=` | Greater than or equal to | `balance >= 0` |

### Canonical Equality

The canonical equality operator is `=` (single equals), consistent with ANSI SQL. The double-equals form `==` is accepted as an alias and is treated identically, but `=` is the preferred form.

```yaml
# Preferred
condition: "status = 'active'"

# Also accepted, but not canonical
condition: "status == 'active'"
```

### NULL Comparison Behavior

Comparing anything with NULL using `=`, `!=`, or any other comparison operator produces NULL, not `true` or `false`:

```
NULL = NULL     -->  NULL  (not true)
NULL != NULL    -->  NULL  (not true)
42 = NULL       -->  NULL
```

To test for NULL, use `IS NULL` or `IS NOT NULL` (see Special Operators below).

## Logical Operators

Logical operators combine boolean expressions. Teckel follows SQL three-valued logic where the third value is NULL.

| Operator | Description | Example |
|----------|-------------|---------|
| `AND` | Logical conjunction | `age >= 18 AND status = 'active'` |
| `OR` | Logical disjunction | `role = 'admin' OR role = 'owner'` |
| `NOT` | Logical negation | `NOT is_deleted` |

### Three-Valued Logic Truth Tables

**AND:**

| Left | Right | Result |
|------|-------|--------|
| true | true | true |
| true | false | false |
| true | NULL | NULL |
| false | true | false |
| false | false | false |
| false | NULL | false |
| NULL | true | NULL |
| NULL | false | false |
| NULL | NULL | NULL |

**OR:**

| Left | Right | Result |
|------|-------|--------|
| true | true | true |
| true | false | true |
| true | NULL | true |
| false | true | true |
| false | false | false |
| false | NULL | NULL |
| NULL | true | true |
| NULL | false | NULL |
| NULL | NULL | NULL |

**NOT:**

| Input | Result |
|-------|--------|
| true | false |
| false | true |
| NULL | NULL |

```yaml
# Combine conditions
condition: "age >= 18 AND country = 'ES' AND NOT is_blacklisted"

# Either condition
condition: "role = 'admin' OR role = 'superadmin'"

# Grouping with parentheses
condition: "(status = 'active' OR status = 'pending') AND amount > 0"
```

## Special Operators

### IS NULL / IS NOT NULL

The only operators guaranteed to return `true` or `false` (never NULL) when testing for null values.

```yaml
condition: "email IS NOT NULL"
condition: "deleted_at IS NULL"
```

| Expression | Value is NULL | Value is not NULL |
|------------|---------------|-------------------|
| `x IS NULL` | true | false |
| `x IS NOT NULL` | false | true |

### IN

Tests whether a value matches any element in a list.

```yaml
condition: "status IN ('active', 'pending', 'review')"
condition: "country_code IN ('ES', 'FR', 'DE', 'IT')"
```

The negated form excludes matches:

```yaml
condition: "status NOT IN ('deleted', 'archived')"
```

### BETWEEN

Tests whether a value falls within a closed range (inclusive of both endpoints).

```yaml
condition: "age BETWEEN 18 AND 65"
condition: "order_date BETWEEN '2025-01-01' AND '2025-12-31'"
```

`BETWEEN` is equivalent to `age >= 18 AND age <= 65`. The negated form:

```yaml
condition: "salary NOT BETWEEN 0 AND 999"
```

### LIKE

Pattern matching for strings. Supports two wildcards:

| Wildcard | Meaning |
|----------|---------|
| `%` | Matches zero or more characters |
| `_` | Matches exactly one character |

```yaml
condition: "name LIKE 'John%'"          # starts with "John"
condition: "email LIKE '%@example.com'"  # ends with "@example.com"
condition: "code LIKE 'A_B'"            # "A", any single char, "B"
condition: "name NOT LIKE '%test%'"      # does not contain "test"
```

## Combined Examples

Operators can be freely combined, respecting the precedence table:

```yaml
# Arithmetic inside comparison inside logical
condition: "price * quantity > 100 AND status = 'confirmed'"

# Multiple special operators
condition: "age BETWEEN 18 AND 65 AND country IN ('ES', 'FR') AND email IS NOT NULL"

# Parentheses to override default precedence
condition: "(priority = 'high' OR priority = 'critical') AND assigned_to IS NOT NULL"

# Expression with alias
columns:
  - "price * (1 - discount / 100.0) as discounted_price"
```
