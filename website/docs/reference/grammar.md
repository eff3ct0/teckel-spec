# EBNF Grammar

This page collects all grammar productions from the Teckel specification in one place. The grammar uses Extended Backus-Naur Form (EBNF) as defined in ISO/IEC 14977.

> **Formal reference:** [Appendix A — EBNF Grammar Summary](https://github.com/eff3ct0/teckel-spec/blob/main/spec/v2.0/teckel-spec.md#appendix-a-ebnf-grammar-summary) in the Teckel Specification.

### Notation

```
=           definition
;           termination
|           alternation
,           concatenation
[...]       optional (0 or 1)
{...}       repetition (0 or more)
(...)       grouping
"..."       terminal string (case-sensitive)
'...'       terminal string (case-sensitive)
(* ... *)   comment
? ... ?     special sequence (described in prose)
-           exception
```

---

## Asset References

Asset references are the identifiers used to name inputs, transformations, and outputs. They must start with a letter and contain only ASCII letters, digits, underscores, and hyphens (1--128 characters).

```ebnf
asset_ref = letter, { letter | digit | "_" | "-" } ;
letter    = "A" | "B" | ... | "Z" | "a" | "b" | ... | "z" ;
digit     = "0" | "1" | ... | "9" ;
```

---

## Column References

Columns can be referenced either bare (unqualified) or prefixed with an asset name (qualified). Qualified references are required in join conditions and recommended when ambiguity is possible.

```ebnf
column_ref       = unqualified_ref | qualified_ref ;
unqualified_ref  = identifier ;
qualified_ref    = asset_ref, ".", identifier ;
identifier       = letter, { letter | digit | "_" }
                 | "`", { any_char - "`" }, "`" ;
```

---

## Expressions

The expression grammar defines the SQL-like language used in filters, column definitions, aggregations, and computed values. Productions are ordered from lowest to highest precedence.

```ebnf
(* Top-level expression *)
expression     = or_expr, [ "as", identifier ] ;

(* Logical operators -- lowest precedence *)
or_expr        = and_expr, { "OR", and_expr } ;
and_expr       = not_expr, { "AND", not_expr } ;
not_expr       = [ "NOT" ], comparison ;

(* Comparison *)
comparison     = addition, [ comp_op, addition ]
               | addition, "IS", [ "NOT" ], "NULL"
               | addition, [ "NOT" ], "IN", "(", expression_list, ")"
               | addition, [ "NOT" ], "BETWEEN", addition, "AND", addition
               | addition, [ "NOT" ], "LIKE", string_literal ;

comp_op        = "=" | "!=" | "<>" | "<" | ">" | "<=" | ">=" ;

(* Arithmetic *)
addition       = multiplication, { ( "+" | "-" ), multiplication } ;
multiplication = unary, { ( "*" | "/" | "%" ), unary } ;
unary          = [ "-" ], primary ;

(* Primary expressions *)
primary        = literal | column_ref | function_call | case_expr
               | cast_expr | "(", expression, ")" ;

(* Literals *)
literal        = string_literal | integer_literal | double_literal
               | boolean_literal | null_literal ;

string_literal  = "'", { any_char - "'" | "''" }, "'" ;
integer_literal = [ "-" ], digit, { digit } ;
double_literal  = [ "-" ], digit, { digit }, ".", digit, { digit } ;
boolean_literal = "true" | "false" ;
null_literal    = "NULL" | "null" ;

(* Column reference *)
column_ref     = identifier, [ ".", identifier ] ;

(* Function call *)
function_call  = identifier, "(", [ function_args ], ")" ;
function_args  = [ "DISTINCT" ], expression_list ;
expression_list = expression, { ",", expression } ;

(* CASE expression *)
case_expr      = "CASE", { "WHEN", expression, "THEN", expression },
                 [ "ELSE", expression ], "END" ;

(* CAST expression *)
cast_expr      = "CAST", "(", expression, "AS", type_name, ")" ;
```

---

## Type Names

Type names appear in `CAST` expressions and in the `castColumns` and `schemaEnforce` transformations. Simple types are single keywords; parameterized types accept type arguments.

```ebnf
type_name          = simple_type | parameterized_type ;
simple_type        = "string" | "integer" | "int" | "long" | "float"
                   | "double" | "boolean" | "date" | "timestamp" | "binary" ;
parameterized_type = "decimal", "(", integer_literal, ",", integer_literal, ")"
                   | "array", "<", type_name, ">"
                   | "map", "<", type_name, ",", type_name, ">"
                   | "struct", "<", struct_fields, ">" ;
struct_fields      = struct_field, { ",", struct_field } ;
struct_field       = identifier, ":", type_name ;
```

---

## Variable Substitution

Variables are resolved via single-pass text replacement on the raw YAML before parsing. The `$$` escape produces a literal `$`.

```ebnf
variable        = "${", var_name, [ ":", default_value ], "}" ;
var_name        = identifier_char, { identifier_char } ;
identifier_char = letter | digit | "_" | "." ;
default_value   = { any_char - "}" } ;
escaped_dollar  = "$$" ;
```

---

## Secret References

Secret references are resolved after YAML parsing, via the runtime's SecretsProvider.

```ebnf
secret_ref = "{{", "secrets", ".", alias, "}}" ;
alias      = letter, { letter | digit | "_" | "-" } ;
```
