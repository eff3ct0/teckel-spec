# Security Considerations

This page covers the security risks that Teckel implementations must address.

---

## Expression Injection

The Teckel expression language and the SQL pass-through (`sql` transformation) accept arbitrary string expressions. Implementations that construct backend queries from these expressions must sanitize inputs to prevent injection attacks.

**Risk:** If a Teckel expression is passed directly to a SQL engine without sanitization, an attacker who controls variable values or input data could inject malicious SQL.

**Mitigation:** Implementations must parse and validate expressions against the Teckel grammar before passing them to the backend. The `sql` transformation's `query` field is inherently a raw SQL pass-through; implementations should document the SQL dialect and any restrictions they enforce.

---

## Shell Command Injection

Hooks execute shell commands via the `command` field. If hook commands are constructed from user-provided variable substitutions without proper escaping, an attacker could inject arbitrary shell commands.

**Risk:** A variable value like `; rm -rf /` could be injected into a hook command if the value is interpolated directly into the shell string.

**Mitigation:**

- Implementations should execute hooks via `sh -c` (or equivalent) with the command as a single string argument, not via shell interpolation of user inputs.
- The `command` field must not be constructed from untrusted variable substitutions without proper escaping.
- In multi-tenant environments, consider restricting or disabling hooks entirely.

---

## Secret Exposure

Resolved secret values are sensitive data that must be protected throughout the pipeline lifecycle.

**Rules:**

- Secret values must not appear in log output, error messages, or diagnostic dumps.
- Implementations must not write secret values to temporary files.
- When displaying the resolved YAML (for example, in debug mode), secret placeholders must be shown as `{{secrets.<alias>}}` or `***`, never as the resolved value.
- Implementations should clear secret values from memory after use.

**Example of correct debug output:**

```
Resolved configuration:
  options:
    password: "{{secrets.db_password}}"   # masked
    user: "admin"                          # not a secret, shown as-is
```

---

## HTTP Enrichment

The `enrich` transformation makes outbound HTTP requests to external APIs. This creates several security concerns.

**Rules:**

- Implementations must validate that the `url` uses `https://` in production configurations. HTTP (`http://`) should produce a warning.
- The `timeout` and `maxRetries` limits must be respected to prevent resource exhaustion (for example, an API that never responds could block the pipeline indefinitely without a timeout).
- Implementations must not follow redirects to different domains without explicit configuration.

**Risks:**

- An attacker who controls the `url` could direct requests to internal services (server-side request forgery).
- Sensitive data in the `keyColumn` could be exfiltrated via the URL.
- Headers (including `Authorization`) could be sent to unintended endpoints if redirects are followed.

---

## Path Traversal

Input and output `path` values must be validated to prevent path traversal attacks.

**Risk:** A path like `../../etc/passwd` or `../../../sensitive/data` could allow reading or writing files outside the intended data directories.

**Mitigation:**

- Implementations should restrict file access to a configurable set of allowed directories.
- Paths should be canonicalized (resolved to absolute form) before access, and the canonicalized path should be checked against the allowed directory list.
- Relative paths are resolved relative to the working directory of the runtime process.

---

## Resource Limits

Without limits, a malicious or poorly written pipeline could exhaust system resources.

**Recommended limits:**

| Resource | Description |
|----------|-------------|
| Maximum number of assets | Prevents excessively large DAGs |
| Maximum DAG depth | Prevents deeply nested dependency chains |
| Maximum enrich API calls | Prevents excessive outbound HTTP requests per pipeline execution |
| Maximum total data size | Prevents reading or writing unbounded amounts of data |

Implementations should make these limits configurable and document their defaults.
