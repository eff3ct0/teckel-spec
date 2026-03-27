# Introduction

Teckel is a declarative language for building data pipelines. You describe your data sources, transformations, and outputs in YAML, and a runtime engine takes care of execution. No imperative code, no boilerplate -- just a clear description of what your data should look like when it comes out the other end.

## The Problem

Building ETL pipelines typically means writing a lot of glue code: reading files, wiring up transformations, handling write modes, managing dependencies between steps. The logic of *what* you want to do gets buried in the mechanics of *how* to do it.

Teckel separates the two. You declare the "what" in a YAML document. The runtime handles the "how."

## Key Features

- **Declarative pipelines** -- Define inputs, transformations, and outputs as a directed acyclic graph (DAG). Teckel resolves execution order automatically from data dependencies.
- **Rich transformation library** -- Select, filter, join, group, window functions, pivoting, set operations, and more. All expressed in YAML with an embedded expression language.
- **Runtime-agnostic** -- The spec is not tied to any single engine. Implementations exist for Apache Spark, and the format is designed to support others (DuckDB, Polars, etc.).
- **Built-in data quality** -- Attach validation checks directly to your pipeline assets.
- **Metadata and governance** -- Describe ownership, tags, lineage, and downstream consumers alongside the pipeline logic itself.

## Who Is This For?

Teckel is designed for data engineers and analytics engineers who want to define batch (and streaming) data pipelines without writing application code. If you spend your days moving data between systems and transforming it along the way, Teckel gives you a structured, versionable, reviewable format for that work.

## A First Look

Here is the simplest possible Teckel pipeline. It reads a CSV file and writes it out as Parquet:

```yaml
version: "2.0"

input:
  - name: users
    format: csv
    path: "data/users.csv"
    options:
      header: true

output:
  - name: users
    format: parquet
    path: "data/output/users_parquet"
    mode: overwrite
```

That is a complete, valid Teckel document. The `output` references the `users` input by name, and the runtime reads the CSV, then writes it as Parquet. No transformation step is needed when you just want to convert formats.

Things get more interesting when you add transformations between input and output. The next section walks you through building a real pipeline step by step.

## How This Guide Is Organized

- **Getting Started** covers the basics: building your first pipeline, understanding the document structure, and learning the naming rules.
- **Core Concepts** dives into inputs, outputs, and how the pipeline DAG works.
- **Transformations** is a comprehensive reference for every operation Teckel supports.
- **Expression Language** documents the syntax for writing column expressions and conditions.
- **Data Quality**, **Metadata**, and **Advanced Topics** cover the features you will reach for as your pipelines grow in complexity.
- **Reference** contains the error catalog, conformance levels, and formal grammar.
