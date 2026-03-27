# Pipeline Metadata

The `pipeline` top-level key defines metadata about the pipeline as a whole. All fields are optional -- a minimal Teckel document works without any pipeline metadata.

> **Formal reference:** [Section 18 — Metadata](https://github.com/eff3ct0/teckel-spec/blob/main/spec/v2.0/teckel-spec.md#18-metadata) in the Teckel Specification.

## Structure

```yaml
pipeline:
  name: <string>
  namespace: <string>
  version: <string>
  description: <string>
  owner:
    name: <string>
    email: <string>
    type: <string>
  tags: [<string>]
  meta:
    <key>: <any>
  schedule: <string>
  freshness: <string>
  links:
    - label: <string>
      url: <string>
  contacts:
    - name: <string>
      email: <string>
      role: <string>
  catalog:
    target: <string>
    namespace: <string>
```

## Fields

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `name` | string | No | -- | Human-readable pipeline name. |
| `namespace` | string | No | -- | Globally unique namespace (e.g., `"com.company.finance"`). Combined with asset names to form URNs. |
| `version` | string | No | -- | Semantic version of the pipeline (e.g., `"1.2.0"`). |
| `description` | string | No | -- | Markdown-formatted description of the pipeline's purpose. |
| `owner` | Owner | No | -- | Primary pipeline owner. |
| `tags` | List[string] | No | `[]` | Pipeline-level classification labels. |
| `meta` | Map[string, any] | No | `{}` | Open key-value metadata for custom properties. |
| `schedule` | string | No | -- | Expected execution schedule as a cron expression or ISO 8601 duration. |
| `freshness` | string | No | -- | Expected end-to-end freshness as an ISO 8601 duration. |
| `links` | List[Link] | No | `[]` | External documentation links. |
| `contacts` | List[Contact] | No | `[]` | Stakeholder contacts. |
| `catalog` | CatalogConfig | No | -- | Data catalog integration configuration. |

## Owner

The `owner` field identifies the person or team responsible for the pipeline.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `name` | string | **Yes** | -- | Person or team name. |
| `email` | string | **Yes** | -- | Contact email. |
| `type` | string | No | `"technical"` | Owner role type. |

### Role Types

| Type | Description |
|------|-------------|
| `technical` | Engineer or team responsible for implementation and maintenance. |
| `business` | Business stakeholder who defines requirements. |
| `steward` | Data steward responsible for governance and quality. |

## Tags

Pipeline-level tags are classification labels. They are useful for filtering, grouping, and governance. Tags declared at the pipeline level are distinct from asset-level tags (they do not propagate into the DAG).

```yaml
pipeline:
  tags: [finance, daily, production]
```

## Meta

The `meta` field is an open map for arbitrary key-value pairs. Implementations MUST preserve and pass through `meta` values without interpretation. Use this for organization-specific metadata.

```yaml
pipeline:
  meta:
    cost_center: "CC-1234"
    team_slack: "#data-engineering"
    sla_tier: gold
```

## Schedule

Declares the expected execution schedule. Can be a cron expression or an ISO 8601 duration.

```yaml
pipeline:
  schedule: "0 6 * * *"        # daily at 06:00 UTC
```

```yaml
pipeline:
  schedule: "PT1H"             # every hour
```

## Freshness

Declares the expected maximum age of the pipeline's output data as an ISO 8601 duration. This is metadata only -- it does not enforce freshness at runtime. Use a `freshness` quality check to enforce freshness.

```yaml
pipeline:
  freshness: "PT24H"           # data should be at most 24 hours old
```

Common duration values:

| Duration | Meaning |
|----------|---------|
| `PT30M` | 30 minutes |
| `PT1H` | 1 hour |
| `PT24H` | 24 hours |
| `P1D` | 1 day |
| `P7D` | 7 days |

## Links

External documentation links associated with the pipeline.

```yaml
pipeline:
  links:
    - label: "Design Document"
      url: "https://wiki.company.com/data/revenue-pipeline"
    - label: "Runbook"
      url: "https://wiki.company.com/runbooks/revenue"
```

## Contacts

Stakeholder contacts beyond the primary owner. Each contact has a name, email, and optional role.

```yaml
pipeline:
  contacts:
    - name: Jane Smith
      email: jane@company.com
      role: analyst
    - name: Platform Team
      email: platform@company.com
      role: infrastructure
```

## Catalog Integration

The `catalog` field declares how metadata should be exported to an external data catalog system.

```yaml
pipeline:
  catalog:
    target: openmetadata
    namespace: finance.revenue
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `target` | string | **Yes** | Catalog system identifier (e.g., `"openmetadata"`, `"datahub"`, `"atlas"`). |
| `namespace` | string | No | Namespace within the catalog. |

The catalog integration mechanism is implementation-defined. Implementations should generate a metadata artifact (e.g., `manifest.json`) containing all pipeline, asset, and column metadata in a machine-readable format.

## Fully Annotated Example

```yaml
pipeline:
  # Identity
  name: Daily Revenue Pipeline
  namespace: com.company.finance
  version: "2.1.0"

  # Documentation
  description: |
    Aggregates transaction data from multiple sources into daily revenue
    summaries. Feeds the executive dashboard and finance reporting.

  # Ownership
  owner:
    name: Data Engineering
    email: data-eng@company.com
    type: technical

  # Classification
  tags: [finance, revenue, daily, production]

  # Custom metadata
  meta:
    cost_center: "CC-4200"
    team_slack: "#revenue-pipeline"
    sla_tier: gold
    jira_project: DE

  # Execution
  schedule: "0 6 * * *"            # daily at 06:00 UTC
  freshness: "PT24H"               # data should be at most 24 hours old

  # External references
  links:
    - label: "Design Document"
      url: "https://wiki.company.com/data/revenue-pipeline"
    - label: "Runbook"
      url: "https://wiki.company.com/runbooks/revenue"
    - label: "Dashboard"
      url: "https://bi.company.com/dashboards/revenue"

  # Stakeholders
  contacts:
    - name: Sarah Chen
      email: sarah@company.com
      role: business owner
    - name: Platform Team
      email: platform@company.com
      role: infrastructure
    - name: Alex Rivera
      email: alex@company.com
      role: data steward

  # Catalog export
  catalog:
    target: openmetadata
    namespace: finance.revenue
```
