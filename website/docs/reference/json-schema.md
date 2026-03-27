# JSON Schema

The Teckel specification includes a machine-readable JSON Schema for validating Teckel v2.0 documents.

---

## Location

The JSON Schema is published alongside the specification at:

```
spec/v2.0/teckel-schema.json
```

This schema defines the structure of a valid Teckel v2.0 document, including all top-level keys, input/output definitions, transformation operations, configuration, secrets, hooks, quality suites, metadata, and exposures.

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
with open("spec/v2.0/teckel-schema.json") as f:
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
ajv validate -s spec/v2.0/teckel-schema.json -d pipeline.json
```

### Editor Integration

Many code editors support JSON Schema for autocompletion and inline validation of YAML files. To associate the Teckel schema with your pipeline files, add a schema reference comment or configure your editor's settings.

**VS Code (with YAML extension):**

Add to your `.vscode/settings.json`:

```json
{
  "yaml.schemas": {
    "./spec/v2.0/teckel-schema.json": "*.teckel.yaml"
  }
}
```

---

## Scope

The JSON Schema covers structural validation: required fields, types, enumerations, and nesting rules. It does not cover semantic validation (such as reference integrity, cycle detection, or expression type checking), which must be performed by the runtime as described in the Validation Rules (Section 23 of the specification).
