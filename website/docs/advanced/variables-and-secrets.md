# Variables and Secrets

This chapter covers two mechanisms for parameterizing Teckel documents: variables for general-purpose substitution, and secrets for sensitive values.

---

![Variable and secret resolution](/img/diagrams/variable-resolution.svg)

## Variable Substitution

Variables allow Teckel documents to be parameterized with external values, making pipelines portable across environments.

### Syntax

Variables use the `${VAR}` syntax. An optional default value can be provided after a colon.

```
${VAR_NAME}              # required variable — error if unresolved
${VAR_NAME:default}      # variable with a default value
```

#### EBNF Grammar

```ebnf
variable        = "${", var_name, [ ":", default_value ], "}" ;
var_name        = identifier_char, { identifier_char } ;
identifier_char = letter | digit | "_" | "." ;
default_value   = { any_char - "}" } ;
escaped_dollar  = "$$" ;
```

### Resolution Order

When the runtime encounters a `${VAR}` reference, it resolves it using this priority order:

1. **Explicit variables map** — values passed directly by the runtime (for example, command-line arguments like `-DVAR=value`).
2. **Environment variables** — from the operating system environment.
3. **Default value** — the value after `:` in `${VAR:default}`.
4. **Error** — if none of the above resolve the variable, the implementation raises `E-VAR-001`.

### Examples

```yaml
version: "2.0"

input:
  - name: events
    format: parquet
    path: "${INPUT_PATH}/events"            # required: must be set externally

  - name: config
    format: csv
    path: "${CONFIG_PATH:data/config.csv}"  # uses default if not set
    options:
      header: true
      sep: "${SEPARATOR:,}"                 # defaults to comma

transformation:
  - name: filtered
    where:
      from: events
      filter: "${FILTER_EXPR:1=1}"          # defaults to no filtering

output:
  - name: filtered
    format: parquet
    mode: overwrite
    path: "${OUTPUT_PATH}/filtered_events"
```

Running this pipeline with explicit variables:

```bash
teckel run -f pipeline.yaml \
  -DINPUT_PATH=s3://bucket/raw \
  -DOUTPUT_PATH=s3://bucket/processed
```

### Escaping

To include a literal `${...}` in the YAML without triggering substitution, double the dollar sign:

```yaml
# This renders as the literal text: ${NOT_A_VARIABLE}
description: "$${NOT_A_VARIABLE}"
```

After substitution, `$$` becomes a single `$`, so `$${...}` becomes `${...}` as literal text.

### Single-Pass Rule

Variable substitution is a **single-pass** text replacement performed left to right on the raw YAML text before parsing. This has two important consequences:

1. **No nesting.** Constructs like `${A_${B}}` are not supported. The parser sees `${A_` as an incomplete variable reference.

2. **No re-expansion.** If the resolved value of a variable contains `${...}`, that text is treated as a literal string and is not expanded further.

```yaml
# If ENV_NAME resolves to "${OTHER_VAR}", the result is literally "${OTHER_VAR}"
# — it is NOT expanded again
path: "${ENV_NAME}"
```

### Scope

Variable substitution is applied to the **raw YAML text** before YAML parsing. Variables can appear in any string value: paths, expressions, option values, descriptions, and so on.

---

## Secrets

Secrets provide a secure mechanism for referencing sensitive values — passwords, API tokens, connection strings — that must not appear in plain text in the pipeline definition.

### Syntax

Secret references use double-brace syntax:

```
{{secrets.alias}}
```

#### EBNF Grammar

```ebnf
secret_ref    = "{{", "secrets", ".", alias, "}}" ;
alias         = letter, { letter | digit | "_" | "-" } ;
escaped_brace = "{{{{" ;   (* literal "{{" *)
```

### Declaration

Secrets are declared in the top-level `secrets` section. Each entry maps an alias to a key in a secret store.

```yaml
secrets:
  keys:
    db_password:
      scope: production           # optional: vault/scope/namespace
      key: database-password      # required: key name in the secret store

    api_token:
      key: enrichment-api-token
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `scope` | string | No | Vault or namespace for the secret |
| `key` | string | Yes | Key name in the secret store |

### Resolution

The runtime resolves secrets through a **SecretsProvider** interface. The concrete mechanism is implementation-defined (for example, HashiCorp Vault, AWS Secrets Manager, Azure Key Vault, or environment variables).

Resolution follows this fallback order:

1. The implementation's configured SecretsProvider.
2. Environment variable `TECKEL_SECRET__<ALIAS>` (alias uppercased, hyphens replaced with underscores).

If a secret cannot be resolved, the implementation raises `E-SECRET-001` **before** pipeline execution begins.

### Environment Variable Fallback Examples

| Alias in YAML | Environment Variable |
|---------------|---------------------|
| `db_password` | `TECKEL_SECRET__DB_PASSWORD` |
| `api-token` | `TECKEL_SECRET__API_TOKEN` |

### Security Rules

- Resolved secret values MUST NOT be logged, printed, or included in error messages.
- Implementations SHOULD clear secret values from memory after use.
- When displaying resolved YAML in debug mode, secret placeholders MUST be shown as `{{secrets.<alias>}}` or `***`, never as the actual value.
- Implementations MUST NOT write secret values to temporary files.

### Practical Example

A pipeline that reads from a JDBC source using secret credentials and calls an authenticated API:

```yaml
version: "2.0"

secrets:
  keys:
    db_password:
      scope: production
      key: database-password
    api_token:
      key: enrichment-api-token

input:
  - name: customers
    format: jdbc
    path: ""
    options:
      url: "jdbc:postgresql://${DB_HOST:localhost}:5432/mydb"
      user: "${DB_USER:admin}"
      password: "{{secrets.db_password}}"
      dbtable: customers

transformation:
  - name: enriched
    enrich:
      from: customers
      url: "https://api.example.com/v1/score/${keyColumn}"
      keyColumn: customer_id
      responseColumn: credit_score
      headers:
        Authorization: "Bearer {{secrets.api_token}}"
      onError: "null"

output:
  - name: enriched
    format: parquet
    mode: overwrite
    path: "${OUTPUT_PATH}/enriched_customers"
```

### Variables vs. Secrets: When to Use Which

| Concern | Variables (`${...}`) | Secrets (`{{secrets...}}`) |
|---------|---------------------|---------------------------|
| Paths and URIs | Yes | No |
| Filter expressions | Yes | No |
| Format options | Yes | No |
| Passwords | No | Yes |
| API tokens | No | Yes |
| Connection strings with credentials | No | Yes |
| Logged in debug output | Yes (visible) | No (masked) |
| Resolution timing | Before YAML parsing | After YAML parsing |
