# JSON Schema

The Teckel specification includes a machine-readable JSON Schema for validating Teckel documents.

> **Formal reference:** [Appendix B — JSON Schema](https://github.com/eff3ct0/teckel-spec/blob/main/spec/v3.0/teckel-spec.md#appendix-b-json-schema) in the Teckel Specification. Download the schema: [`teckel-schema.json`](https://github.com/eff3ct0/teckel-spec/blob/main/spec/v3.0/teckel-schema.json).

---

## Location

The JSON Schema is published alongside the specification at:

```
spec/v3.0/teckel-schema.json
```

This schema defines the structure of a valid Teckel v3.0 document, including all top-level keys, input/output definitions, transformation operations (including the 14 new v3.0 transforms), configuration, secrets, hooks, quality suites, metadata, and exposures.

:::info v3.0 Schema
The v3.0 schema adds support for the 14 new transformation types introduced in Teckel 3.0 (offset, tail, fillNa, dropNa, replace, merge, parse, asOfJoin, lateralJoin, transpose, groupingSets, describe, crosstab, hint), new data types (byte, short, char, varchar, timestamp_ntz, time, intervals, variant), and the expanded expression language. A hosted copy is available at [`/teckel-schema-v3.json`](/teckel-schema-v3.json).
:::

---

## Usage

### Validating a Teckel Document

You can use any JSON Schema validator to check a Teckel YAML file. First convert the YAML to JSON (since JSON Schema validators operate on JSON), then validate against the schema.

**Using Python (jsonschema + PyYAML):**

```python
import yaml
import json
from jsonschema import validate, ValidationError

# Load the schema
with open("spec/v3.0/teckel-schema.json") as f:
    schema = json.load(f)

# Load and convert the Teckel YAML document
with open("pipeline.yaml") as f:
    document = yaml.safe_load(f)

# Validate
try:
    validate(instance=document, schema=schema)
    print("Document is valid.")
except ValidationError as e:
    print(f"Validation error: {e.message}")
```

**Using a CLI tool (e.g., ajv-cli):**

```bash
# Convert YAML to JSON first
yq eval -o=json pipeline.yaml > pipeline.json

# Validate against the schema
ajv validate -s spec/v3.0/teckel-schema.json -d pipeline.json
```

### Editor Integration

Many code editors support JSON Schema for autocompletion and inline validation of YAML files. To associate the Teckel schema with your pipeline files, add a schema reference comment or configure your editor's settings.

**VS Code (with YAML extension):**

Add to your `.vscode/settings.json`:

```json
{
  "yaml.schemas": {
    "./spec/v3.0/teckel-schema.json": "*.teckel.yaml"
  }
}
```

---

## Scope

The JSON Schema covers structural validation: required fields, types, enumerations, and nesting rules. It does not cover semantic validation (such as reference integrity, cycle detection, or expression type checking), which must be performed by the runtime as described in the Validation Rules (Section 23 of the specification).
