# Column Operations

This section covers transformations that add, remove, rename, or change the type of columns in a dataset.

---

## Add Columns (8.11)

Adds one or more computed columns to a dataset.

**Schema:**

| Field     | Type                       | Required | Description               |
|-----------|----------------------------|----------|---------------------------|
| `from`    | AssetRef                   | Yes      | Source asset.             |
| `columns` | NonEmptyList[ColumnDef]    | Yes      | Columns to add.           |

**ColumnDef object:**

| Field        | Type       | Required | Description                            |
|--------------|------------|----------|----------------------------------------|
| `name`       | string     | Yes      | Name of the new column.                |
| `expression` | Expression | Yes      | Expression to compute the column value.|

**Example — derived columns:**

```yaml
transformation:
  - name: withDerived
    addColumns:
      from: orders
      columns:
        - name: total
          expression: "quantity * unit_price"
        - name: processed_at
          expression: "current_timestamp()"
        - name: category
          expression: "case when amount > 1000 then 'high' else 'low' end"
```

**Key behaviors:**
- If a column with the same name already exists, it is **replaced** (overwritten).
- Expressions can reference existing columns and previously added columns in the same `addColumns` list (evaluated in order).

> **Tip:** Use `addColumns` to build derived fields step by step. Since columns are evaluated in order, later columns can reference earlier ones defined in the same list.

---

## Drop Columns (8.12)

Removes columns from a dataset.

**Schema:**

| Field     | Type                   | Required | Description           |
|-----------|------------------------|----------|-----------------------|
| `from`    | AssetRef               | Yes      | Source asset.         |
| `columns` | NonEmptyList[Column]   | Yes      | Columns to remove.    |

**Example — remove sensitive fields before output:**

```yaml
transformation:
  - name: sanitized
    dropColumns:
      from: customers
      columns:
        - ssn
        - credit_card_number
        - date_of_birth
```

**Constraints:**
- If a named column does not exist, the runtime raises `E-COL-001`.
- Dropping all columns is an error (`E-SCHEMA-002`) — at least one column must remain.

---

## Rename Columns (8.13)

Renames columns using a mapping of old names to new names.

**Schema:**

| Field      | Type                  | Required | Description                                          |
|------------|-----------------------|----------|------------------------------------------------------|
| `from`     | AssetRef              | Yes      | Source asset.                                        |
| `mappings` | Map[Column, string]   | Yes      | Old name to new name mapping. At least one entry.    |

**Example — standardize column names:**

```yaml
transformation:
  - name: renamed
    renameColumns:
      from: rawData
      mappings:
        first_name: firstName
        last_name: lastName
        e_mail: email
        phone_number: phone
```

**Constraints:**
- If an old name does not exist, the runtime raises `E-COL-001`.
- If a new name collides with an existing (unrenamed) column, the runtime raises `E-NAME-003`.

> **Tip:** Rename is useful after joins to resolve qualified column names like `employees.name` into cleaner names.

---

## Cast Columns (8.14)

Changes the data type of one or more columns.

**Schema:**

| Field     | Type                   | Required | Description           |
|-----------|------------------------|----------|-----------------------|
| `from`    | AssetRef               | Yes      | Source asset.         |
| `columns` | NonEmptyList[CastDef]  | Yes      | Cast definitions.     |

**CastDef object:**

| Field        | Type   | Required | Description                             |
|--------------|--------|----------|-----------------------------------------|
| `name`       | Column | Yes      | Column to cast.                         |
| `targetType` | string | Yes      | Target data type (see Data Types section).|

**Example — cast string columns to proper types:**

```yaml
transformation:
  - name: typed
    castColumns:
      from: csvImport
      columns:
        - name: age
          targetType: integer
        - name: salary
          targetType: double
        - name: hire_date
          targetType: date
        - name: is_active
          targetType: boolean
```

**Key behaviors:**
- If a value cannot be cast (e.g., `"abc"` to `integer`), the value becomes `NULL`. The pipeline does **not** fail for individual cast failures.
- Type names are case-insensitive: `Integer`, `INTEGER`, and `integer` are all equivalent.

> **Tip:** To enforce strict casting where invalid values should fail the pipeline, follow `castColumns` with an `assertion` transformation that checks for unexpected NULLs.

---

## Fill NA (8.34) {#fillna}

*New in v3.0.*

Replaces NULL values in specified columns with a fill value.

**Schema:**

| Field     | Type                   | Required    | Default | Description                             |
|-----------|------------------------|-------------|---------|-----------------------------------------|
| `from`    | AssetRef               | Yes         | --      | Source asset.                           |
| `columns` | List[Column]           | No          | all     | Columns to fill.                        |
| `value`   | primitive              | Conditional | --      | Single fill value for all target columns. |
| `values`  | Map[Column, primitive] | Conditional | --      | Per-column fill values.                  |

Exactly one of `value` or `values` must be provided. Providing both or neither raises `E-OP-004`.

**Example -- fill all NULLs with a single value:**

```yaml
transformation:
  - name: filled
    fillNa:
      from: metrics
      value: 0
```

**Example -- per-column fill values:**

```yaml
transformation:
  - name: filled
    fillNa:
      from: users
      values:
        name: "unknown"
        age: 0
        active: false
```

> **Tip:** Use `fillNa` as a cleaner alternative to multiple `addColumns` with `coalesce` expressions when you need to replace NULLs with defaults.

---

## Replace (8.36) {#replace}

*New in v3.0.*

Replaces specific values in specified columns with new values.

**Schema:**

| Field      | Type                      | Required | Default | Description                           |
|------------|---------------------------|----------|---------|---------------------------------------|
| `from`     | AssetRef                  | Yes      | --      | Source asset.                         |
| `columns`  | List[Column]              | No       | all     | Columns to apply replacements.         |
| `mappings` | NonEmptyList[Replacement] | Yes      | --      | Old to new value pairs.                |

**Replacement object:**

| Field | Type      | Required | Description         |
|-------|-----------|----------|---------------------|
| `old` | primitive | Yes      | Value to match.     |
| `new` | primitive | Yes      | Replacement value.  |

**Example -- normalize status values:**

```yaml
transformation:
  - name: cleaned
    replace:
      from: orders
      columns: [status]
      mappings:
        - old: "N/A"
          new: "unknown"
        - old: ""
          new: "unknown"
        - old: "cancelled"
          new: "canceled"
```

**Example -- replace values across all columns:**

```yaml
transformation:
  - name: sanitized
    replace:
      from: survey
      mappings:
        - old: -999
          new: 0
```

> **Tip:** `replace` is useful for data cleaning tasks where specific sentinel values need to be normalized. For NULL replacement, use `fillNa` instead.

---

## Parse (8.38) {#parse}

*New in v3.0.*

Parses string columns containing structured data (CSV or JSON) into typed columns.

**Schema:**

| Field    | Type                | Required | Default    | Description                               |
|----------|---------------------|----------|------------|-------------------------------------------|
| `from`   | AssetRef            | Yes      | --         | Source asset.                             |
| `column` | Column              | Yes      | --         | String column to parse.                   |
| `format` | `"json"` or `"csv"` | Yes      | --         | Parse format.                             |
| `schema` | List[SchemaColumn]  | No       | (inferred) | Expected schema for parsed data.          |
| `options` | Map[string, string] | No      | `{}`       | Format-specific options.                  |

The `schema` entries use the same format as `schemaEnforce` columns (with `name` and `dataType` fields).

**Example -- parse JSON payload into typed columns:**

```yaml
transformation:
  - name: parsedEvents
    parse:
      from: rawLogs
      column: payload
      format: json
      schema:
        - name: event_type
          dataType: string
        - name: timestamp
          dataType: timestamp
        - name: metadata
          dataType: "map<string, string>"
```

**Example -- parse embedded CSV data:**

```yaml
transformation:
  - name: parsedCSV
    parse:
      from: rawData
      column: csv_field
      format: csv
      options:
        delimiter: "|"
        header: "true"
```

**Key behaviors:**
- The parsed column is replaced by the structured result columns.
- Malformed values produce NULL for the affected fields.
- If `schema` is omitted, the implementation attempts schema inference.

> **Tip:** Always provide `schema` in production pipelines for predictable results. Schema inference can be unreliable with inconsistent data.
