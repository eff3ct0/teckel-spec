# Hooks

Hooks execute external shell commands at pipeline lifecycle events. They enable integration with external systems for tasks such as sending notifications, running pre-flight checks, or cleaning up resources.

---

## Schema

```yaml
hooks:
  preExecution:
    - name: <string>
      command: <string>
  postExecution:
    - name: <string>
      command: <string>
```

### Fields

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `name` | string | Yes | — | Hook identifier (used in log messages) |
| `command` | string | Yes | — | Shell command to execute |

---

## Execution Rules

### Pre-Execution Hooks

- Run **sequentially** in the order they are declared.
- Execute **before** any pipeline asset is processed.
- If any pre-execution hook exits with a non-zero code, the pipeline **does not start**. The implementation raises `E-HOOK-001`.
- This is a **fail-fast** model: if the first hook fails, subsequent pre-execution hooks are not run.

### Post-Execution Hooks

- Run **sequentially** in the order they are declared.
- Execute **after** the pipeline completes, regardless of whether the pipeline succeeded or failed.
- If a post-execution hook fails, the implementation logs the failure but **does not change** the pipeline's overall status. A successful pipeline remains successful; a failed pipeline remains failed.

---

## Execution Environment

### Working Directory

Hooks execute with the working directory set to the **directory containing the Teckel YAML file**.

### Environment Variables

Hooks inherit the runtime's environment, plus these additional variables:

| Variable | Available To | Value |
|----------|-------------|-------|
| `TECKEL_PIPELINE_STATUS` | Post-execution hooks | `"SUCCESS"` or `"FAILURE"` |
| `TECKEL_PIPELINE_FILE` | All hooks | Absolute path to the Teckel YAML file |

Pre-execution hooks do not have `TECKEL_PIPELINE_STATUS` because the pipeline has not run yet.

---

## Examples

### Basic Pre/Post Hooks

```yaml
version: "2.0"

hooks:
  preExecution:
    - name: check-connectivity
      command: "ping -c 1 database.example.com"
    - name: validate-inputs
      command: "test -d data/input && echo 'Input directory exists'"

  postExecution:
    - name: notify-success
      command: |
        if [ "$TECKEL_PIPELINE_STATUS" = "SUCCESS" ]; then
          curl -X POST https://hooks.slack.com/services/T00/B00/xxx \
            -d '{"text":"Pipeline completed successfully"}'
        fi
    - name: cleanup-temp
      command: "rm -rf /tmp/pipeline-temp/*"

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

### Pre-Flight Database Check

```yaml
hooks:
  preExecution:
    - name: check-db
      command: "pg_isready -h ${DB_HOST:localhost} -p 5432"
    - name: check-disk-space
      command: |
        available=$(df --output=avail /data | tail -1)
        if [ "$available" -lt 1048576 ]; then
          echo "Less than 1GB disk space available"
          exit 1
        fi
```

If `check-db` fails (returns non-zero), the `check-disk-space` hook is skipped and the pipeline does not start.

### Post-Execution Logging

```yaml
hooks:
  postExecution:
    - name: log-result
      command: |
        echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) \
          pipeline=$TECKEL_PIPELINE_FILE \
          status=$TECKEL_PIPELINE_STATUS" >> /var/log/teckel/runs.log
    - name: archive-yaml
      command: |
        cp "$TECKEL_PIPELINE_FILE" \
          "/archive/$(date +%Y%m%d)-$(basename $TECKEL_PIPELINE_FILE)"
```

### Using Variables in Hook Commands

Hook commands can reference environment variables (both standard OS variables and those set by the runtime). However, Teckel `${...}` variable substitution is applied to the raw YAML before parsing, so Teckel variables are also expanded in hook commands:

```yaml
hooks:
  postExecution:
    - name: upload-results
      command: "aws s3 sync ${OUTPUT_PATH} s3://archive/${RUN_DATE}/"
```

---

## Security Considerations

Hook commands execute shell commands on the host system. Be aware of the following:

- The `command` field should not be constructed from untrusted user-provided variable substitutions without proper escaping. This could enable shell command injection.
- Implementations should execute hooks via `sh -c` (or equivalent) with the command as a single string argument.
- Consider restricting which hooks are allowed in shared or multi-tenant environments.
