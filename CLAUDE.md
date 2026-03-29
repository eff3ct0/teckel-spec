# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Teckel Specification — a declarative YAML-based language for defining data transformation pipelines. This repo contains the formal spec (v2.0), a JSON Schema for validation, and a Docusaurus documentation site with an interactive playground.

Reference implementation: https://github.com/eff3ct0/teckel — Scala/Apache Spark.

## Common Commands

All commands run from the `website/` directory:

```bash
npm ci                  # Install dependencies (use ci, not install)
npm run start           # Dev server with hot reload
npm run build           # Production build
npm run serve           # Serve production build locally
npm run typecheck       # TypeScript type checking (tsc)
```

## Architecture

### Spec (`spec/v2.0/`)
- `teckel-spec.md` — Formal specification (27 sections, RFC 2119 conventions, EBNF grammar, 31 transformation types, 3 conformance levels: Core/Extended/Streaming)
- `teckel-schema.json` — JSON Schema (draft 2020-12) for validating Teckel YAML documents

### Documentation Site (`website/`)
- Docusaurus 3.9 with versioned docs (current stable: v2.0)
- 38 markdown files in `docs/` covering transformations, expressions, data quality, metadata, and reference material
- `src/pages/playground.tsx` — Interactive YAML validator using ajv + js-yaml for real-time schema validation
- `src/pages/index.tsx` — Landing page
- `src/css/custom.css` — All custom styling
- `sidebars.ts` — Documentation navigation structure
- `versioned_docs/` and `versioned_sidebars/` — Historical version snapshots

### Schema Sync Requirement
`spec/v2.0/teckel-schema.json` and `website/static/teckel-schema.json` must be identical. CI enforces this — when editing the schema, update both files.

## CI Pipeline (`.github/workflows/`)

- **ci.yml** (PR/push to main): builds site, runs TypeScript type check, validates schema JSON, checks schema sync between spec/ and website/static/
- **deploy-docs.yml** (push to main): builds and deploys to GitHub Pages at teckel.rafaelfernandez.dev
- **release.yml** (v* tags): creates GitHub release with spec markdown, schema JSON, and tarball artifacts. Tags like `v1.0.0` are stable; `rc/alpha/beta` suffixes create pre-releases

## Key Conventions

- Docusaurus strict mode: broken links throw errors — all internal links must resolve
- Schema uses `$defs` for shared type definitions; asset references follow pattern `^[a-zA-Z][a-zA-Z0-9_-]{0,127}$`
- Extension fields use `x-` prefix throughout the schema
- Node >= 20 required
