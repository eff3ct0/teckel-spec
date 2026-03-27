# Exposures

Exposures declare **downstream consumers** of the pipeline's outputs — dashboards, notebooks, ML models, applications, or other pipelines. They complete the lineage graph by connecting data production to data consumption.

Exposures are metadata-only. They do not affect pipeline execution.

## Structure

```yaml
exposures:
  - name: <string>
    type: <string>
    description: <string>
    url: <string>
    maturity: <string>
    owner:
      name: <string>
      email: <string>
    depends_on: [<AssetRef>]
    tags: [<string>]
    meta:
      <key>: <any>
```

## Fields

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `name` | string | **Yes** | — | Exposure identifier. |
| `type` | string | **Yes** | — | Consumer type (see below). |
| `description` | string | No | — | What this consumer does with the data. |
| `url` | string | No | — | Link to the consumer (dashboard URL, notebook link, etc.). |
| `maturity` | string | No | — | Maturity level: `"high"`, `"medium"`, or `"low"`. |
| `owner` | Owner | No | — | Consumer owner or team. |
| `depends_on` | NonEmptyList[AssetRef] | **Yes** | — | Assets consumed. Must reference asset names defined in the pipeline. |
| `tags` | List[string] | No | `[]` | Classification labels. |
| `meta` | Map[string, any] | No | `{}` | Custom metadata. |

## Exposure Types

| Type | Description |
|------|-------------|
| `dashboard` | BI dashboard or report. |
| `notebook` | Jupyter or Zeppelin notebook, or exploratory analysis. |
| `analysis` | Ad-hoc analysis or query. |
| `ml` | Machine learning model or feature store. |
| `application` | Application or microservice consuming the data. |
| `pipeline` | Another data pipeline that depends on this pipeline's outputs. |

## The `depends_on` Field

The `depends_on` field lists the assets that the exposure consumes. These must reference assets defined in the pipeline (inputs, transformations, or outputs).

This field is what connects the exposure to the pipeline DAG and enables impact analysis.

```yaml
exposures:
  - name: revenue_dashboard
    type: dashboard
    depends_on: [daily_revenue, monthly_summary]
```

When `daily_revenue` or `monthly_summary` changes schema or breaks, the implementation can trace the impact to `revenue_dashboard`.

## Impact Analysis

Exposures enable **downstream impact analysis**. Given any asset in the pipeline, the implementation can answer:

- **What consumes this asset?** — Follow the `depends_on` references backward from exposures.
- **What breaks if this asset changes?** — Identify all exposures (and their owners) that depend on the affected asset.

This complements the upstream lineage that is implicit in the DAG. Together, they provide full bidirectional traceability from source data to end consumers.

## Examples

### Dashboard

```yaml
exposures:
  - name: revenue_dashboard
    type: dashboard
    maturity: high
    url: "https://bi.company.com/dashboards/revenue"
    description: "Executive daily revenue tracking"
    owner:
      name: Analytics Team
      email: analytics@company.com
    depends_on: [daily_revenue, monthly_summary]
    tags: [executive, finance]
```

### ML Model

```yaml
exposures:
  - name: churn_model
    type: ml
    description: "Customer churn prediction model"
    owner:
      name: ML Engineering
      email: ml@company.com
    depends_on: [customer_features]
    tags: [ml, production]
    meta:
      model_version: "3.2"
      framework: xgboost
```

### Notebook

```yaml
exposures:
  - name: quarterly_analysis
    type: notebook
    maturity: low
    url: "https://notebooks.company.com/analysis/q1-revenue"
    description: "Quarterly revenue deep-dive analysis"
    owner:
      name: Sarah Chen
      email: sarah@company.com
    depends_on: [daily_revenue]
    tags: [analysis, finance]
```

### Application

```yaml
exposures:
  - name: billing_service
    type: application
    maturity: high
    url: "https://github.com/company/billing-service"
    description: "Billing microservice reads customer subscription data"
    owner:
      name: Billing Team
      email: billing@company.com
    depends_on: [customer_subscriptions]
    tags: [production, billing]
```

### Downstream Pipeline

```yaml
exposures:
  - name: marketing_pipeline
    type: pipeline
    description: "Marketing attribution pipeline consumes customer segments"
    owner:
      name: Marketing Engineering
      email: mktg-eng@company.com
    depends_on: [customer_segments, daily_revenue]
    tags: [marketing, production]
    meta:
      pipeline_id: "com.company.marketing.attribution"
```

## Complete Example with Multiple Exposures

```yaml
exposures:
  - name: revenue_dashboard
    type: dashboard
    maturity: high
    url: "https://bi.company.com/dashboards/revenue"
    description: "Executive daily revenue tracking"
    owner:
      name: Analytics Team
      email: analytics@company.com
    depends_on: [daily_revenue, monthly_summary]
    tags: [executive, finance]

  - name: churn_model
    type: ml
    description: "Customer churn prediction model v3.2"
    owner:
      name: ML Engineering
      email: ml@company.com
    depends_on: [customer_features]
    tags: [ml, production]
    meta:
      model_version: "3.2"
      framework: xgboost

  - name: billing_service
    type: application
    maturity: high
    description: "Reads subscription data for invoice generation"
    owner:
      name: Billing Team
      email: billing@company.com
    depends_on: [customer_subscriptions]
    tags: [production, billing]

  - name: marketing_pipeline
    type: pipeline
    description: "Downstream marketing attribution pipeline"
    owner:
      name: Marketing Engineering
      email: mktg-eng@company.com
    depends_on: [customer_segments, daily_revenue]
    tags: [marketing]
```

With these declarations, an implementation can determine that changing the `daily_revenue` asset impacts both the `revenue_dashboard` and the `marketing_pipeline`, and can notify the respective owners.
