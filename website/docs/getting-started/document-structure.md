# Document Structure

Every Teckel document is a YAML file with a defined set of top-level keys. This page explains what each key does and how they fit together.

> **Formal reference:** [Section 4 — Document Structure](https://github.com/eff3ct0/teckel-spec/blob/main/spec/v2.0/teckel-spec.md#4-document-structure) in the Teckel Specification.

## Skeleton Document

Here is a complete skeleton showing every top-level key with comments:

```yaml
# REQUIRED -- spec version this document conforms to
version: "2.0"

# OPTIONAL -- pipeline-level metadata (name, description, owner)
pipeline:
  name: "my-pipeline"
  description: "What this pipeline does"
  owner:
    name: "Data Team"
    email: "data@example.com"

# OPTIONAL -- pipeline-wide configuration (Spark conf, variables, etc.)
config:
  spark:
    spark.sql.shuffle.partitions: 200

# OPTIONAL -- secret key declarations (resolved at runtime)
secrets:
  db_password:
    provider: env
    key: DB_PASSWORD

# OPTIONAL -- lifecycle hooks (run before/after the pipeline)
hooks:
  pre:
    - command: "echo 'Starting pipeline'"
  post:
    - command: "echo 'Pipeline complete'"

# OPTIONAL -- reusable transformation templates
templates:
  - name: standard-filter
    # ...template definition...

# OPTIONAL -- data quality check suites
quality:
  - suite: input-checks
    # ...checks...

# REQUIRED -- at least one data source
input:
  - name: raw_data
    format: csv
    path: "data/input.csv"

# OPTIONAL -- streaming data sources
streamingInput:
  - name: events
    format: kafka
    # ...streaming config...

# OPTIONAL -- transformation steps
transformation:
  - name: cleaned
    where:
      from: raw_data
      filter: "status IS NOT NULL"

# REQUIRED -- at least one data destination
output:
  - name: cleaned
    format: parquet
    path: "data/output/"
    mode: overwrite

# OPTIONAL -- streaming data destinations
streamingOutput:
  - name: events_out
    format: kafka
    # ...streaming config...

# OPTIONAL -- downstream consumer declarations
exposures:
  - name: dashboard
    type: dashboard
    # ...exposure config...
```

## Required vs. Optional

Only three keys are required in every document:

| Key | Required | Purpose |
|-----|----------|---------|
| `version` | Yes | Declares which spec version this document targets. Must be `"2.0"`. |
| `input` | Yes | At least one data source. Without data to read, there is no pipeline. |
| `output` | Yes | At least one data destination. The pipeline must write something. |

Everything else is optional. The simplest valid document has just `version`, one `input`, and one `output`.

## Top-Level Keys at a Glance

### version

A string that must be `"2.0"` for the current spec. This field exists so that tooling and runtimes can detect which version of the spec a document was written for.

```yaml
version: "2.0"
```

### input

A list of data sources. Each entry has a `name`, `format`, `path`, and optional `options`. See [Inputs](../core-concepts/inputs.md) for the full reference.

### transformation

A list of transformation steps. Each entry has a `name` and exactly one operation key (`select`, `where`, `group`, `join`, `orderBy`, etc.). Transformations reference other assets via the `from` field. See the [Transformations](../transformations/overview.md) section.

### output

A list of data destinations. Each entry references an existing input or transformation asset by name and specifies where and how to write the data. See [Outputs](../core-concepts/outputs.md) for details.

### pipeline

Metadata about the pipeline itself -- its human-readable name, a description, and an owner. This information is for documentation and governance; it does not affect execution.

### config

Pipeline-wide configuration. This is where you put engine-specific settings (like Spark configuration) and define variables for use in `${...}` substitution.

### secrets

Declares secret keys that will be resolved at runtime from environment variables, vaults, or other providers. Referenced in the document via `{{secrets.key_name}}` placeholders.

### hooks

Lifecycle hooks that run before (`pre`) or after (`post`) pipeline execution. Useful for setup, teardown, notifications, or validation scripts.

### quality

Data quality check suites. Attach validation rules to your assets -- null checks, uniqueness constraints, range checks, and more.

### templates

Reusable transformation definitions that can be referenced elsewhere in the document, reducing duplication across similar pipelines.

### streamingInput / streamingOutput

Streaming counterparts of `input` and `output` for real-time pipelines (e.g., Kafka sources and sinks).

### exposures

Declarations of downstream consumers -- dashboards, reports, ML models, or other systems that depend on this pipeline's output. This is metadata for lineage tracking, not executable logic.

## Extension Keys

Any top-level key prefixed with `x-` is treated as an extension key. Runtimes that do not recognize an extension key will ignore it. This lets you add custom metadata without breaking compatibility:

```yaml
x-team: platform-engineering
x-cost-center: "CC-1234"
```

> **Warning:** Top-level keys that are not in the list above and do not start with `x-` will cause a validation error. Teckel rejects unknown keys to catch typos early.

## Processing Order

When a runtime executes a Teckel document, it processes the file in this order:

1. **Variable substitution** -- `${...}` placeholders are replaced with values from config or environment.
2. **Config merging** -- If multiple files are provided, they are merged.
3. **YAML parsing** -- The resolved text is parsed as YAML 1.2.
4. **Secret resolution** -- `{{secrets.*}}` placeholders are resolved.
5. **Schema validation** -- The document structure is checked against the spec.
6. **Semantic validation** -- Cross-references, types, and constraints are verified.
7. **DAG construction** -- The dependency graph is built from asset references.
8. **Pre-hooks** -- `hooks.pre` commands run.
9. **Pipeline execution** -- The DAG is executed in topological order.
10. **Post-hooks** -- `hooks.post` commands run.

> **Note:** Textual order within the YAML file has no effect on execution. A transformation listed first can depend on one listed last. The runtime resolves everything through the DAG.
