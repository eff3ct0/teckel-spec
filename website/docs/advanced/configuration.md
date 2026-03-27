# Configuration and Config Merging

This chapter covers the pipeline configuration section and the rules for merging multiple Teckel documents.

---

## Configuration

The `config` top-level section controls pipeline-wide settings.

### Schema

```yaml
config:
  backend: <string>
  cache:
    autoCacheThreshold: <integer>
    defaultStorageLevel: <string>
  notifications:
    onSuccess: <List[NotificationTarget]>
    onFailure: <List[NotificationTarget]>
  components:
    readers: <List[ComponentDef]>
    transformers: <List[ComponentDef]>
    writers: <List[ComponentDef]>
```

All config fields are optional. Implementations define their own defaults.

### Backend Hint

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `backend` | string | No | impl-defined | Hint for the execution backend |

The `backend` field suggests which engine should execute the pipeline. This is advisory; the runtime may ignore it if it only supports one backend.

```yaml
config:
  backend: spark       # or "datafusion", "duckdb", etc.
```

### Cache Configuration

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `autoCacheThreshold` | integer | No | impl-defined | Auto-cache assets consumed by N or more downstream assets |
| `defaultStorageLevel` | string | No | impl-defined | Default storage level for caching |

When an intermediate asset is referenced by multiple downstream transformations, caching avoids redundant computation. The `autoCacheThreshold` tells the runtime to automatically cache any asset consumed by at least that many downstream assets.

```yaml
config:
  cache:
    autoCacheThreshold: 2                   # cache if 2+ downstream consumers
    defaultStorageLevel: "MEMORY_AND_DISK"  # spill to disk if memory is full
```

### Notifications

Notifications alert on pipeline success or failure.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `channel` | string | Yes | -- | `"log"`, `"webhook"`, or `"file"` |
| `url` | string | Conditional | -- | Required for `"webhook"` |
| `path` | string | Conditional | -- | Required for `"file"` |

```yaml
config:
  notifications:
    onSuccess:
      - channel: log
      - channel: webhook
        url: "https://hooks.slack.com/services/T00/B00/xxx"
    onFailure:
      - channel: webhook
        url: "https://hooks.slack.com/services/T00/B00/xxx"
      - channel: file
        path: "logs/failures.log"
```

### Components

The `components` section registers custom readers, transformers, and writers that can be referenced by the `custom` transformation.

```yaml
config:
  components:
    readers:
      - name: myCustomReader
        class: "com.example.CustomReader"
    transformers:
      - name: deduplicate
        class: "com.example.DeduplicateTransformer"
    writers:
      - name: deltaWriter
        class: "com.example.DeltaWriter"
```

### Complete Configuration Example

```yaml
version: "2.0"

config:
  backend: spark
  cache:
    autoCacheThreshold: 2
    defaultStorageLevel: "MEMORY_AND_DISK"
  notifications:
    onSuccess:
      - channel: log
    onFailure:
      - channel: webhook
        url: "https://alerts.example.com/pipeline-failure"
  components:
    transformers:
      - name: mlScore
        class: "com.example.MLScoringTransformer"

input:
  - name: data
    format: parquet
    path: "data/input/"

transformation:
  - name: scored
    custom:
      from: data
      component: mlScore
      options:
        model_path: "models/v3.2"

output:
  - name: scored
    format: parquet
    mode: overwrite
    path: "data/output/scored"
```

---

## Config Merging

Multiple Teckel documents can be merged into a single pipeline. This enables environment-specific overrides (for example, a base pipeline definition with a development overlay).

### Merge Semantics

| Value Type | Merge Behavior |
|------------|---------------|
| Object (YAML mapping) | **Deep merge**: overlay fields override base fields recursively |
| Array (YAML sequence) | **Replaced** entirely by the overlay |
| Scalar | **Replaced** by the overlay |

The key distinction is between objects and arrays. Objects are merged field by field (recursively), while arrays are replaced wholesale.

### Merge Order

Files are merged left to right. The rightmost file has the **highest** precedence.

```
base.yaml + dev.yaml  -->  merged result
```

If three files are provided:

```
base.yaml + common.yaml + dev.yaml  -->  merged result
```

Each subsequent file overlays the accumulated result.

### Example

**base.yaml** -- the production pipeline definition:

```yaml
version: "2.0"

config:
  cache:
    autoCacheThreshold: 3
    defaultStorageLevel: "MEMORY_AND_DISK"

input:
  - name: source
    format: parquet
    path: "${INPUT_PATH}"

output:
  - name: source
    format: parquet
    mode: overwrite
    path: "${OUTPUT_PATH}"
```

**dev.yaml** -- the development overlay:

```yaml
input:
  - name: source
    format: csv
    path: "data/local/input.csv"
    options:
      header: true

output:
  - name: source
    path: "data/local/output"
```

**Merged result:**

The `input` and `output` arrays from `dev.yaml` completely **replace** those from `base.yaml` (arrays are replaced, not merged element by element). The `config` section is preserved from `base.yaml` because `dev.yaml` does not declare a `config` section. If `dev.yaml` had a `config` key, it would be deep-merged with the base `config` object.

The effective merged document is:

```yaml
version: "2.0"

config:
  cache:
    autoCacheThreshold: 3
    defaultStorageLevel: "MEMORY_AND_DISK"

input:
  - name: source
    format: csv
    path: "data/local/input.csv"
    options:
      header: true

output:
  - name: source
    path: "data/local/output"
```

### Deep Merge for Objects

When both base and overlay have the same object key, fields are merged recursively:

**base.yaml:**

```yaml
config:
  cache:
    autoCacheThreshold: 3
    defaultStorageLevel: "MEMORY_AND_DISK"
  notifications:
    onFailure:
      - channel: webhook
        url: "https://alerts.example.com"
```

**overlay.yaml:**

```yaml
config:
  cache:
    autoCacheThreshold: 2
```

**Result:**

```yaml
config:
  cache:
    autoCacheThreshold: 2                   # overridden by overlay
    defaultStorageLevel: "MEMORY_AND_DISK"  # preserved from base
  notifications:                             # preserved from base
    onFailure:
      - channel: webhook
        url: "https://alerts.example.com"
```

The `autoCacheThreshold` scalar is replaced, `defaultStorageLevel` is preserved because the overlay does not mention it, and the entire `notifications` object is preserved.
