# Severity and Thresholds

Teckel's quality system uses severity levels to control how check failures affect pipeline execution. Severity can be set at the suite level, overridden per check, and escalated conditionally based on violation magnitude.

## Severity Levels

Three severity levels are defined:

| Severity | Pipeline Behavior |
|----------|-------------------|
| `error` | Pipeline MUST abort with error code `E-QUALITY-001`. |
| `warn` | A warning is logged with check details. Pipeline continues. |
| `info` | The metric is recorded silently. No warning is logged. Pipeline continues. |

The default severity for a suite is `error` if not specified.

## Suite-Level Severity

Set a default severity for all checks in a suite using the `severity` field on the suite object.

```yaml
quality:
  - suite: data-monitoring
    target: events
    severity: warn              # all checks in this suite default to warn
    checks:
      - type: completeness
        column: user_id
        threshold: 0.99
      - type: volume
        rowCount:
          min: 1000
```

Both checks above inherit the suite-level `warn` severity. Failures are logged but do not stop the pipeline.

## Per-Check Overrides

Individual checks can override the suite-level default by specifying their own `severity` field.

```yaml
quality:
  - suite: orders-quality
    target: orders
    severity: error                     # suite default
    checks:
      - type: completeness
        column: email
        threshold: 0.95
        severity: warn                  # override: just warn for email

      - type: uniqueness
        columns: [order_id]
        # inherits suite severity: error

      - type: validity
        column: notes
        lengthBetween: [0, 5000]
        severity: info                  # override: record metric only
```

In this example:
- The `email` completeness check warns but does not abort.
- The `order_id` uniqueness check inherits `error` and aborts on failure.
- The `notes` length check is informational only.

## Conditional Escalation

Checks support the `escalate` field for threshold-based severity escalation. This lets you define a "soft" threshold that warns and a "hard" threshold that errors.

```yaml
- type: completeness
  column: customer_id
  threshold: 0.99
  severity: warn
  escalate:
    threshold: 0.90
    severity: error
```

The behavior based on observed completeness:

| Observed Value | Result |
|----------------|--------|
| >= 0.99 | **pass** -- check passes |
| < 0.99 and >= 0.90 | **warn** -- primary severity applies |
| < 0.90 | **error** -- escalated severity applies, pipeline aborts |

The `escalate` block defines a second, stricter threshold. When the observed value falls below the escalation threshold, the severity is promoted to the escalated level.

### Escalation Structure

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `escalate.threshold` | double | **Yes** | The escalation threshold. Must be less than or equal to the check's primary threshold. |
| `escalate.severity` | string | **Yes** | The escalated severity level. Typically stricter than the check's primary severity. |

## Threshold-Based Soft Checks

Combining thresholds with severity levels enables soft checks that tolerate small amounts of bad data while catching significant regressions.

### Example: Graduated Email Validation

```yaml
quality:
  - suite: contact-quality
    target: customers
    checks:
      - type: validity
        column: email
        format: email
        threshold: 0.98
        severity: warn
        escalate:
          threshold: 0.80
          severity: error
```

This check:
- Passes if 98% or more of emails are valid.
- Warns if between 80% and 98% are valid.
- Errors (aborts the pipeline) if fewer than 80% are valid.

### Example: Volume With Escalation

```yaml
quality:
  - suite: feed-monitoring
    target: daily_events
    checks:
      - type: volume
        rowCount:
          min: 10000
        severity: warn
        escalate:
          threshold: 0.50        # interpreted as 50% of the min bound
          severity: error

      - type: freshness
        column: event_time
        maxAge: "PT6H"
        severity: warn
        escalate:
          threshold: 0.0         # any freshness violation escalates
          severity: error
```

### Example: Mixed Severity Suite

A complete suite demonstrating the interplay of suite defaults, per-check overrides, and escalation.

```yaml
quality:
  - suite: revenue-pipeline-checks
    description: "Quality gates for the daily revenue pipeline"
    target: daily_revenue
    severity: warn                        # default: warn for most checks
    checks:
      # Critical: primary key must be unique -- override to error
      - type: uniqueness
        columns: [transaction_id]
        severity: error

      # Soft: completeness with escalation
      - type: completeness
        column: customer_email
        threshold: 0.95
        severity: warn
        escalate:
          threshold: 0.70
          severity: error

      # Informational: track statistical drift
      - type: statistical
        column: amount
        mean:
          between: [100, 500]
        severity: info

      # Standard: inherits suite warn
      - type: validity
        column: currency
        acceptedValues: [USD, EUR, GBP, JPY]

      # Freshness with escalation
      - type: freshness
        column: created_at
        maxAge: "PT12H"
        severity: warn
        escalate:
          threshold: 0.0
          severity: error
```

The resulting behavior:

1. `transaction_id` uniqueness -- errors immediately on any duplicate.
2. `customer_email` completeness -- warns if below 95%, errors if below 70%.
3. `amount` statistics -- silently records whether the mean is in range.
4. `currency` validity -- warns on unexpected values (inherits suite default).
5. `created_at` freshness -- warns if data is older than 12 hours, errors on any freshness failure via escalation.
