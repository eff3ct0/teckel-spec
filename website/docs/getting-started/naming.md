# Naming and References

Every asset in a Teckel pipeline -- inputs, transformations, and outputs -- is identified by a name called an **AssetRef**. This page explains the naming rules, how references connect the pipeline together, and how to refer to columns unambiguously.

## AssetRef Rules

An AssetRef is the `name` field on any input or transformation entry. It must follow these rules:

1. **Starts with a letter** (A-Z or a-z).
2. **Contains only** ASCII letters, digits, underscores (`_`), and hyphens (`-`).
3. **Between 1 and 128 characters** long.
4. **Case-sensitive** -- `Orders` and `orders` are different assets.
5. Leading and trailing whitespace is stripped before validation.

### Valid Names

```yaml
input:
  - name: orders             # lowercase, simple
  - name: raw_events         # underscores are fine
  - name: staging-data       # hyphens are fine
  - name: Table1             # can start with uppercase
  - name: myDataSource2025   # mixed case with digits
```

### Invalid Names

```yaml
input:
  - name: 1table             # starts with a digit
  # ERROR [E-NAME-002]: must start with a letter

  - name: my table           # contains a space
  # ERROR [E-NAME-002]: only letters, digits, _, and - are allowed

  - name: my.table           # contains a dot
  # ERROR [E-NAME-002]: dots are not allowed in asset names

  - name: ""                 # empty string
  # ERROR [E-NAME-002]: name must be at least 1 character
```

> **Note:** Dots are reserved for qualified column references (see below). They cannot appear in asset names.

## How References Work

References are what connect the pipeline DAG together. There are two kinds of references:

### Transformation References (the `from` field)

Most transformations have a `from` field that names the upstream asset they consume:

```yaml
input:
  - name: users
    format: csv
    path: "data/users.csv"

transformation:
  - name: activeUsers
    where:
      from: users              # references the input above
      filter: "active = true"

  - name: sortedUsers
    orderBy:
      from: activeUsers        # references the transformation above
      columns:
        - name
```

The `from` value must match the `name` of an existing input or transformation. It cannot reference an output.

### Output References (the `name` field)

Outputs work differently. An output's `name` field is not creating a new asset -- it is **referencing** an existing one:

```yaml
output:
  - name: activeUsers          # references the transformation above
    format: parquet
    path: "data/output/active"
    mode: overwrite
```

This means the output writes whatever dataset the `activeUsers` transformation produced.

> **Warning:** Outputs are terminal nodes (sinks). You cannot reference an output from a transformation. If you try, you will get an undefined asset error.

### Join References

Joins reference multiple assets -- a `left` side and one or more `right` targets:

```yaml
transformation:
  - name: enriched
    join:
      left: orders             # references one asset
      right:
        - name: customers      # references another asset
          type: inner
          on:
            - "orders.customer_id = customers.id"
```

## Namespace Rules

All asset names share a single, flat namespace within a document. This means:

- An input and a transformation **cannot** have the same name.
- An output **can** reuse the name of an input or transformation (because it is a reference, not a new name).
- Split transformations produce two named assets (`pass` and `fail`), and both names must be unique in the namespace.

### Valid namespace usage

```yaml
input:
  - name: orders

transformation:
  - name: filteredOrders       # different from "orders" -- OK

output:
  - name: filteredOrders       # references the transformation -- OK
  - name: orders               # references the input -- also OK
```

### Invalid namespace usage

```yaml
input:
  - name: data

transformation:
  - name: data                 # CONFLICT with input name
  # ERROR [E-NAME-001]: duplicate AssetRef "data"
```

## Qualified Column References

When you need to refer to a column in a specific asset, use dot notation:

```
asset_name.column_name
```

For example:

```yaml
on:
  - "orders.customer_id = customers.id"
```

This tells the runtime that `customer_id` comes from the `orders` asset and `id` comes from the `customers` asset.

### When Qualification Is Required

- **Join conditions** -- Always use qualified references. Unqualified column names in a join condition will produce error `E-JOIN-001` if the name is ambiguous.

### When Qualification Is Optional

- **Select, where, group, and other single-source transformations** -- Since there is only one upstream asset, column names are unambiguous. You can write just `amount` instead of `sales.amount`. However, qualified references are always accepted.

### Column Name Rules

Column identifiers (the part after the dot) follow similar rules to asset names:

- Must start with a letter.
- May contain letters, digits, and underscores (but not hyphens).

```yaml
# Valid column references
- "name"                       # unqualified
- "orders.total_amount"        # qualified
- "employees.dept_id"          # qualified

# Invalid column references
- "orders.1col"               # column starts with digit
- "orders.my-col"             # hyphens not allowed in column names
```

> **Note:** Hyphens are allowed in asset names but **not** in column identifiers. The grammar for column names is slightly stricter than for asset names.

## Quick Reference

| Rule | Asset Names | Column Names |
|------|------------|--------------|
| Starts with letter | Yes | Yes |
| Letters allowed | A-Z, a-z | A-Z, a-z |
| Digits allowed | Yes | Yes |
| Underscores | Yes | Yes |
| Hyphens | Yes | No |
| Dots | No | No (used as separator) |
| Case-sensitive | Yes | Yes |
| Max length | 128 | Not specified |
