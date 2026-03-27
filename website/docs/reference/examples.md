# Complete Examples

This page contains fully annotated Teckel pipeline examples, from simple format conversion to multi-step pipelines with extended features.

---

## Basic ETL: CSV to Parquet

The simplest possible pipeline: read a CSV file and write it as Parquet.

```yaml
# Teckel spec version (required)
version: "2.0"

# Input section: define data sources
input:
  - name: raw                       # Asset name -- used to reference this data
    format: csv                     # File format
    path: "data/csv/employees.csv"  # Path to the source file
    options:
      header: true                  # First row contains column names
      sep: ","                      # Field delimiter

# Output section: define data destinations
output:
  - name: raw                       # References the "raw" input asset above
    format: parquet                 # Write as Parquet (columnar, compressed)
    mode: overwrite                 # Replace if output already exists
    path: "data/parquet/employees"  # Output directory
```

This pipeline has no transformations. The `raw` input is read and written directly to the output. The output `name: raw` is not a new asset -- it references the existing `raw` input.

---

## Multi-Step Pipeline with Core Transformations

A pipeline that reads two data sources, joins them, aggregates, sorts, and limits the result.

```yaml
version: "2.0"

input:
  # Employee records from CSV
  - name: employees
    format: csv
    path: "data/csv/employees.csv"
    options:
      header: true
      sep: ","

  # Department reference data from Parquet
  - name: departments
    format: parquet
    path: "data/parquet/departments"

transformation:
  # Step 1: Filter to only active employees
  - name: active
    where:
      from: employees               # References the "employees" input
      filter: "status = 'active'"   # Keep only rows where status is 'active'

  # Step 2: Join active employees with department names
  - name: enriched
    join:
      left: active                  # Left side: filtered employees
      right:
        - name: departments         # Right side: department lookup
          type: inner               # Only employees with a matching department
          on:
            # Qualified column references required in join conditions
            - "active.dept_id = departments.id"

  # Step 3: Select only the columns we need
  - name: projected
    select:
      from: enriched
      columns:
        - "active.name"             # Employee name
        - "active.salary"           # Employee salary
        - "departments.dept_name"   # Department name from the join

  # Step 4: Aggregate by department
  - name: summary
    group:
      from: projected
      by:
        - dept_name                 # Group by department
      agg:
        - "count(1) as headcount"   # Number of employees per department
        - "avg(salary) as avg_salary"   # Average salary
        - "sum(salary) as total_salary" # Total salary spend

  # Step 5: Sort by total salary, highest first
  - name: ranked
    orderBy:
      from: summary
      columns:
        - column: total_salary
          direction: desc           # Descending order

  # Step 6: Keep only the top 10 departments
  - name: top10
    limit:
      from: ranked
      count: 10

output:
  # Write the top 10 departments to Parquet
  - name: top10
    format: parquet
    mode: overwrite
    path: "data/output/top_departments"
```

The DAG for this pipeline:

```
employees --> active --> enriched --> projected --> summary --> ranked --> top10
                            ^
departments ----------------+
```

---

## Pipeline with Extended Features

A pipeline that uses secrets, assertions, split, HTTP enrichment, conditional logic, window functions, and variables.

```yaml
version: "2.0"

# Pipeline configuration
config:
  cache:
    autoCacheThreshold: 2           # Cache assets used by 2+ downstream nodes

# Secret declarations -- actual values come from a SecretsProvider at runtime
secrets:
  keys:
    api_token:
      key: enrichment-api-token     # Key name in the secret store

# Inputs use variables for environment portability
input:
  - name: orders
    format: parquet
    path: "${INPUT_BASE}/orders"    # Variable: set via CLI or environment

  - name: customers
    format: parquet
    path: "${INPUT_BASE}/customers"

transformation:
  # Validate order data before processing
  # The assertion transformation checks quality rules without modifying data
  - name: validOrders
    assertion:
      from: orders
      checks:
        - column: order_id
          rule: not_null            # Built-in rule: order_id must not be NULL
          description: "Order ID must not be null"
        - column: amount
          rule: "amount > 0"       # Custom expression rule
          description: "Amount must be positive"
      onFailure: drop              # Remove failing rows (alternatives: fail, warn)

  # Split orders into high-value and standard based on amount
  # This creates two new referenceable assets: highValueOrders and standardOrders
  # The split name "splitOrders" itself is NOT referenceable
  - name: splitOrders
    split:
      from: validOrders
      condition: "amount > 1000"
      pass: highValueOrders         # Rows where amount > 1000
      fail: standardOrders          # Rows where amount <= 1000 (or NULL)

  # Enrich high-value orders by calling an external API
  # The API is called once per distinct customer_id; results are cached
  - name: enrichedHV
    enrich:
      from: highValueOrders
      url: "https://api.example.com/v1/risk-score"
      keyColumn: customer_id        # Column value sent to the API
      responseColumn: risk_score    # New column holding the API response
      headers:
        # Secret reference -- resolved at runtime, never logged
        Authorization: "Bearer {{secrets.api_token}}"
      onError: "null"               # If API fails, set risk_score to NULL

  # Categorize by risk using conditional logic (equivalent to SQL CASE WHEN)
  - name: categorized
    conditional:
      from: enrichedHV
      outputColumn: risk_category   # New column name
      branches:
        - condition: "risk_score > 80"
          value: "'high_risk'"      # String literals use single quotes
        - condition: "risk_score > 50"
          value: "'medium_risk'"
      otherwise: "'low_risk'"       # Default if no branch matches

  # Apply window function: rank orders within each risk category
  - name: ranked
    window:
      from: categorized
      partitionBy: [risk_category]  # Separate ranking per category
      orderBy:
        - column: amount
          direction: desc           # Highest amount = rank 1
      functions:
        - expression: "row_number()"
          alias: rank_in_category   # New column with the rank

# Outputs: write both result sets
output:
  # High-value orders with risk analysis
  - name: ranked
    format: parquet
    mode: overwrite
    path: "${OUTPUT_BASE}/high_value_analysis"

  # Standard orders pass through without enrichment
  - name: standardOrders
    format: parquet
    mode: overwrite
    path: "${OUTPUT_BASE}/standard_orders"
```

The DAG for this pipeline:

```
orders --> validOrders --> splitOrders
                              |
                    +---------+---------+
                    |                   |
              highValueOrders    standardOrders --> [output]
                    |
              enrichedHV --> categorized --> ranked --> [output]
```

Running this pipeline:

```bash
teckel run -f pipeline.yaml \
  -DINPUT_BASE=s3://data-lake/raw \
  -DOUTPUT_BASE=s3://data-lake/processed
```

The `customers` input is declared but not used in this example's transformations. In a real pipeline, it might be joined with orders for additional context.
