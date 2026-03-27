# Conformance

This page defines the conformance levels for Teckel implementations, extension mechanisms, and forward compatibility rules.

> **Formal reference:** [Section 27 — Conformance](https://github.com/eff3ct0/teckel-spec/blob/main/spec/v2.0/teckel-spec.md#27-conformance) in the Teckel Specification.

---

## Conformance Levels

Teckel defines three conformance levels. Each level builds on the previous one.

### Core

The Core level covers the fundamental pipeline model: document structure, inputs, outputs, basic transformations, the expression language, data types, null semantics, variables, and the execution model.

**Required sections:**

| Sections | Coverage |
|----------|----------|
| 1--7 | Document structure, input, output |
| 8.1--8.10 | Basic transformations: select, where, group, orderBy, join, union, intersect, except, distinct, limit |
| 9 | Expression language (grammar, precedence, core aggregates and comparison operators) |
| 10 | Data types (simple types only) |
| 11 | Null semantics |
| 12 | Variable substitution |
| 22 | Path resolution |
| 23 | Validation rules |
| 24 | Execution model |
| 25 | Error catalog |

A Core implementation supports the essential building blocks for declarative ETL pipelines: reading data, filtering, joining, aggregating, sorting, and writing results.

### Extended

The Extended level adds all transformations, full function support, parameterized types, secrets, configuration, hooks, data quality, metadata, exposures, and config merging.

**Required sections (in addition to Core):**

| Sections | Coverage |
|----------|----------|
| 8.11--8.31 | All transformations: addColumns, dropColumns, renameColumns, castColumns, window, pivot, unpivot, flatten, sample, conditional, split, sql, rollup, cube, scd2, enrich, schemaEnforce, assertion, repartition, coalesce, custom |
| 9.6 | All core functions (aggregate, string, numeric, date/time, window, conditional) |
| 10 | All data types including parameterized (decimal, array, map, struct) |
| 13 | Secrets |
| 14 | Configuration |
| 16 | Hooks |
| 17 | Data quality |
| 18 | Metadata |
| 19 | Exposures |
| 21 | Config merging |

### Streaming

The Streaming level adds continuous processing capabilities on top of the Extended level.

**Required sections (in addition to Extended):**

| Sections | Coverage |
|----------|----------|
| 15 | Streaming inputs and outputs, triggers, output modes, checkpointing |

---

## Conformance Declaration

An implementation claiming conformance must:

1. **State the conformance level** -- Core, Extended, or Streaming.
2. **List any optional features that are not supported.** For example, a Core implementation might note that it does not support the `delta` format.
3. **Document any implementation-specific extensions** -- additional formats, functions, or transformations beyond what the specification requires.
4. **Pass the conformance test suite** for the claimed level (when the test suite is available).

### Example Declaration

```
Teckel-Spark v1.0
Conformance: Extended
Unsupported optional features:
  - enrich transformation (HTTP enrichment not available)
  - continuous trigger (only processingTime and once supported)
Extensions:
  - Additional format: "delta" (Delta Lake)
  - Additional format: "iceberg" (Apache Iceberg)
  - Additional functions: array_contains(), explode(), posexplode()
```

---

## Extension Mechanism

### Extension Keys (`x-`)

Top-level keys prefixed with `x-` are extension keys. Implementations must ignore unrecognized `x-` keys without raising an error. This allows documents to carry implementation-specific metadata without breaking other runtimes.

```yaml
version: "2.0"

x-spark-config:
  spark.sql.shuffle.partitions: 200
  spark.executor.memory: "4g"

x-custom-metadata:
  team: data-engineering
  cost-center: DE-042

input:
  - name: data
    format: parquet
    path: "data/input/"

output:
  - name: data
    format: parquet
    mode: overwrite
    path: "data/output/"
```

### Custom Transformations

Custom transformations are handled through the `custom` operation key (Section 8.31). This provides a standard interface for implementation-specific logic without requiring new operation keys.

```yaml
transformation:
  - name: scored
    custom:
      from: data
      component: mlScorer
      options:
        model: "v3.2"
```

### Additional Functions

Implementations may support additional functions in the expression language beyond the core set. Additional functions must not shadow (replace) core functions. Implementations should document any extra functions they provide.

---

## Forward Compatibility

A document with `version: "2.0"` processed by a runtime that supports a later version (for example, 2.1) must be processed according to v2.0 rules. The runtime must not apply v2.1-specific behavior to a v2.0 document.

A document with an unrecognized version must be rejected with error `E-VERSION-001`.

This ensures that pipeline definitions remain stable and predictable as the specification evolves.
