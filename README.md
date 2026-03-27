# Teckel Specification

**Teckel** is a declarative YAML-based language for defining data transformation pipelines. This repository contains the formal, language-agnostic specification of the Teckel format.

The specification defines the syntax, semantics, expression language, and runtime behavior that any conforming implementation must support — independent of programming language or execution engine.

## Status

| Version | Status | Date |
|---------|--------|------|
| 2.0     | Draft  | 2026-03-27 |

## Documentation

**[Read the documentation](https://eff3ct0.github.io/teckel-spec/)** — User-friendly guide with tutorials, examples, and reference material. Built with [Docusaurus](https://docusaurus.io).

## Specification

| Document | Description |
|----------|-------------|
| [Teckel Specification v2.0](spec/v2.0/teckel-spec.md) | Full formal specification: 27 sections covering document structure, 31 transformation types, expression language with EBNF grammar, data quality, metadata, exposures, null semantics, validation rules, execution model, error catalog, security considerations, and conformance levels. |
| [JSON Schema v2.0](spec/v2.0/teckel-schema.json) | Machine-readable JSON Schema for validating Teckel v2.0 documents. |

## Conformance Levels

| Level | Description |
|-------|-------------|
| **Core** | Input/Output, basic transformations (select, where, group, orderBy, join, union, intersect, except, distinct, limit), expression language, data types, null semantics, variable substitution, validation rules. |
| **Extended** | Core + all 31 transformations, secrets, configuration, hooks, config merging. |
| **Streaming** | Extended + streaming inputs and outputs. |

## Design Principles

- **RFC 2119** requirement levels (MUST, SHOULD, MAY) for normative precision.
- **EBNF grammar** for the expression language with explicit operator precedence.
- **Fixed-fields tables** (OpenAPI-style) for every construct.
- **Valid + invalid examples** (GraphQL-style) for disambiguation.
- **Standardized error codes** for interoperable diagnostics.
- **SQL three-valued logic** for null semantics.
- **`x-` extension mechanism** for forward compatibility.

## Reference Implementation

- [teckel](https://github.com/eff3ct0/teckel) — Scala/Apache Spark implementation.

## License

This specification is licensed under the [Apache License 2.0](LICENSE).
