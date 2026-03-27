# Streaming

This chapter covers Teckel's streaming capabilities, which extend the batch processing model for continuous data processing.

---

## Overview

Streaming extends the standard batch pipeline model by introducing two new top-level sections: `streamingInput` for continuous data sources and `streamingOutput` for continuous data sinks. Transformations are shared between batch and streaming -- the same transformation definitions work with both.

---

## Streaming Inputs

A streaming input defines a continuous data source.

### Schema

```yaml
streamingInput:
  - name: <AssetRef>
    format: <string>
    path: <string>
    options: <Map[string, primitive]>
    trigger: <string>
```

### Fields

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `name` | AssetRef | Yes | -- | Unique asset name |
| `format` | string | Yes | -- | Stream format (e.g., `"kafka"`, `"json"`, `"csv"`) |
| `path` | string | No | -- | For file-based streams, the monitored directory |
| `options` | Map[string, primitive] | No | `{}` | Source-specific options |
| `trigger` | string | No | impl-defined | Trigger specification |

### Kafka Input Example

```yaml
streamingInput:
  - name: clickEvents
    format: kafka
    options:
      kafka.bootstrap.servers: "broker1:9092,broker2:9092"
      subscribe: click-events
      startingOffsets: earliest
    trigger: "processingTime:10 seconds"
```

### File-Based Streaming Input

File-based streaming monitors a directory for new files:

```yaml
streamingInput:
  - name: newFiles
    format: json
    path: "data/incoming/"
    options:
      maxFilesPerTrigger: 10
    trigger: "processingTime:30 seconds"
```

---

## Streaming Outputs

A streaming output defines a continuous data sink.

### Schema

```yaml
streamingOutput:
  - name: <AssetRef>
    format: <string>
    path: <string>
    options: <Map[string, primitive]>
    outputMode: <string>
    checkpointLocation: <string>
    trigger: <string>
```

### Fields

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `name` | AssetRef | Yes | -- | Must match an existing asset |
| `format` | string | Yes | -- | Output format |
| `path` | string | No | -- | Output path (for file-based sinks) |
| `options` | Map[string, primitive] | No | `{}` | Sink-specific options |
| `outputMode` | string | No | `"append"` | Output mode |
| `checkpointLocation` | string | No | -- | Path for streaming state checkpointing |
| `trigger` | string | No | impl-defined | Trigger specification |

### Output Modes

| Mode | Description |
|------|-------------|
| `append` | Only new rows since the last trigger are written to the sink. Suitable for insert-only workloads. |
| `update` | Only rows that were updated since the last trigger are written. Suitable for upsert-style workloads. |
| `complete` | The entire result table is written on every trigger. Required for aggregation queries where the full result changes. |

### Checkpointing

The `checkpointLocation` field specifies a path where the streaming engine stores progress information. This enables exactly-once processing and recovery after failures. It is recommended for all production streaming pipelines.

```yaml
streamingOutput:
  - name: aggregated
    format: parquet
    path: "data/output/stream_results"
    outputMode: append
    checkpointLocation: "data/checkpoints/aggregated"
    trigger: "processingTime:1 minute"
```

---

## Triggers

Triggers control how frequently the streaming engine processes new data.

| Trigger | Syntax | Description |
|---------|--------|-------------|
| Processing time | `"processingTime:<interval>"` | Micro-batch at the given interval |
| Once | `"once"` | Process all available data once, then stop |
| Continuous | `"continuous:<interval>"` | Low-latency continuous processing |

### Examples

```yaml
# Process every 10 seconds in micro-batch mode
trigger: "processingTime:10 seconds"

# Process every 5 minutes
trigger: "processingTime:5 minutes"

# Run once (useful for backfill or testing)
trigger: "once"

# Low-latency continuous processing with 1-second checkpoint interval
trigger: "continuous:1 second"
```

The `once` trigger is particularly useful for testing streaming pipelines in a batch-like fashion, or for one-time backfill operations.

---

## Batch and Streaming Interaction

Streaming inputs and batch inputs can coexist in the same Teckel document. This enables patterns such as stream-static joins, where a continuous data stream is enriched with reference data from a batch source.

### Rules

- Transformations can reference both streaming and batch assets.
- Batch assets are available as static lookups when referenced by streaming transformations.
- The implementation must ensure batch data is loaded and accessible before the streaming query starts.

### Example: Stream-Static Join

```yaml
version: "2.0"

# Batch input: reference data
input:
  - name: products
    format: parquet
    path: "data/products/"

# Streaming input: real-time events
streamingInput:
  - name: orderStream
    format: kafka
    options:
      kafka.bootstrap.servers: "broker:9092"
      subscribe: orders
      startingOffsets: latest
    trigger: "processingTime:10 seconds"

# Join streaming orders with static product catalog
transformation:
  - name: enrichedOrders
    join:
      left: orderStream
      right:
        - name: products
          type: inner
          on:
            - "orderStream.product_id = products.id"

  - name: summary
    select:
      from: enrichedOrders
      columns:
        - "orderStream.order_id"
        - "products.product_name"
        - "orderStream.quantity"
        - "orderStream.quantity * products.price as total"

# Write enriched stream to output
streamingOutput:
  - name: summary
    format: parquet
    path: "data/output/enriched_orders"
    outputMode: append
    checkpointLocation: "data/checkpoints/enriched_orders"
    trigger: "processingTime:30 seconds"
```

### Example: Streaming Aggregation

```yaml
version: "2.0"

streamingInput:
  - name: sensorData
    format: kafka
    options:
      kafka.bootstrap.servers: "broker:9092"
      subscribe: sensor-readings
    trigger: "processingTime:1 minute"

transformation:
  - name: avgByDevice
    group:
      from: sensorData
      by: [device_id]
      agg:
        - "avg(temperature) as avg_temp"
        - "max(temperature) as max_temp"
        - "count(1) as reading_count"

streamingOutput:
  - name: avgByDevice
    format: kafka
    options:
      kafka.bootstrap.servers: "broker:9092"
      topic: device-averages
    outputMode: complete
    checkpointLocation: "data/checkpoints/avg_by_device"
```

---

## Conformance

Streaming support is defined at the **Streaming** conformance level, which builds on the Extended level. An implementation claiming Streaming conformance must support `streamingInput`, `streamingOutput`, triggers, output modes, and checkpointing as defined in this section.
