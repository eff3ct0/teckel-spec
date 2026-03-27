import React, { useState, useCallback, useEffect, useRef } from 'react';
import Layout from '@theme/Layout';
import yaml from 'js-yaml';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const DEFAULT_YAML = `version: "2.0"

input:
  - name: orders
    format: csv
    path: "data/orders.csv"
    options:
      header: true

  - name: customers
    format: parquet
    path: "data/customers.parquet"

transformation:
  - name: enriched
    join:
      left: orders
      right:
        - asset: customers
          type: inner
          condition: "orders.customer_id = customers.id"

  - name: summary
    select:
      from: enriched
      columns:
        - "customer_id"
        - "upper(name) as name"
        - "amount"
        - "order_date"

output:
  - name: summary
    format: parquet
    path: "out/summary"
    mode: overwrite
`;

interface DiagnosticMessage {
  type: 'error' | 'warning' | 'success';
  message: string;
  path?: string;
}

function formatPath(path: string): string {
  return path.replace(/\//g, '.').replace(/^\./, '');
}

function Playground(): React.JSX.Element {
  const [yamlText, setYamlText] = useState(DEFAULT_YAML);
  const [diagnostics, setDiagnostics] = useState<DiagnosticMessage[]>([]);
  const [schema, setSchema] = useState<object | null>(null);
  const [stats, setStats] = useState<string>('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch('/teckel-schema.json')
      .then((r) => r.json())
      .then((s) => setSchema(s))
      .catch(() =>
        setDiagnostics([
          { type: 'warning', message: 'Could not load JSON Schema. YAML syntax checks still work.' },
        ])
      );
  }, []);

  const validate = useCallback(
    (text: string) => {
      const msgs: DiagnosticMessage[] = [];
      let parsed: unknown;

      // Step 1: YAML parsing
      try {
        parsed = yaml.load(text);
      } catch (e: any) {
        const line = e.mark?.line != null ? e.mark.line + 1 : '?';
        msgs.push({
          type: 'error',
          message: `YAML syntax error at line ${line}: ${e.reason || e.message}`,
        });
        setDiagnostics(msgs);
        setStats('');
        return;
      }

      if (parsed == null || typeof parsed !== 'object') {
        msgs.push({ type: 'error', message: 'Document must be a YAML mapping (object).' });
        setDiagnostics(msgs);
        setStats('');
        return;
      }

      msgs.push({ type: 'success', message: 'YAML syntax is valid.' });

      // Step 2: JSON Schema validation
      if (schema) {
        try {
          const ajv = new Ajv({ allErrors: true, strict: false });
          addFormats(ajv);
          const valid = ajv.validate(schema, parsed);
          if (valid) {
            msgs.push({ type: 'success', message: 'Schema validation passed.' });
          } else {
            for (const err of ajv.errors || []) {
              const path = err.instancePath || '/';
              msgs.push({
                type: 'error',
                message: `${formatPath(path)}: ${err.message}`,
                path: err.instancePath,
              });
            }
          }
        } catch (e: any) {
          msgs.push({
            type: 'warning',
            message: `Schema validator error: ${e.message}`,
          });
        }
      }

      // Step 3: Semantic hints
      const doc = parsed as Record<string, any>;
      const inputNames = new Set<string>();
      const transformNames = new Set<string>();
      const outputNames = new Set<string>();

      if (Array.isArray(doc.input)) {
        for (const inp of doc.input) {
          if (inp.name) inputNames.add(inp.name);
        }
      }
      if (Array.isArray(doc.transformation)) {
        for (const t of doc.transformation) {
          if (t.name) transformNames.add(t.name);
        }
      }
      if (Array.isArray(doc.output)) {
        for (const o of doc.output) {
          if (o.name) outputNames.add(o.name);
        }
      }

      // Check for duplicate asset names
      const allNames = [...inputNames, ...transformNames, ...outputNames];
      const seen = new Set<string>();
      for (const n of allNames) {
        if (seen.has(n) && !outputNames.has(n)) {
          msgs.push({
            type: 'warning',
            message: `Duplicate asset name: "${n}". Asset names should be unique across inputs and transformations.`,
          });
        }
        seen.add(n);
      }

      // Stats
      const parts: string[] = [];
      if (inputNames.size) parts.push(`${inputNames.size} input${inputNames.size > 1 ? 's' : ''}`);
      if (transformNames.size) parts.push(`${transformNames.size} transformation${transformNames.size > 1 ? 's' : ''}`);
      if (outputNames.size) parts.push(`${outputNames.size} output${outputNames.size > 1 ? 's' : ''}`);
      setStats(parts.join(' · '));
      setDiagnostics(msgs);
    },
    [schema]
  );

  // Validate on change with debounce
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => validate(yamlText), 300);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [yamlText, validate]);

  const errorCount = diagnostics.filter((d) => d.type === 'error').length;
  const warnCount = diagnostics.filter((d) => d.type === 'warning').length;
  const successCount = diagnostics.filter((d) => d.type === 'success').length;

  return (
    <Layout
      title="Playground"
      description="Validate Teckel YAML documents against the v2.0 JSON Schema."
    >
      <main className="playground-main">
        <div className="playground-header">
          <div>
            <h1 className="playground-title">Playground</h1>
            <p className="playground-desc">
              Write or paste a Teckel YAML document. Validation runs in real time against the{' '}
              <a href="https://github.com/eff3ct0/teckel-spec/blob/main/spec/v2.0/teckel-schema.json">
                v2.0 JSON Schema
              </a>.
            </p>
          </div>
          <div className="playground-stats">
            {stats && <span className="stats-text">{stats}</span>}
            <span className={`stats-badge ${errorCount > 0 ? 'stats-badge-error' : 'stats-badge-ok'}`}>
              {errorCount > 0
                ? `${errorCount} error${errorCount > 1 ? 's' : ''}`
                : 'Valid'}
            </span>
          </div>
        </div>

        <div className="playground-grid">
          <div className="playground-editor-wrap">
            <div className="playground-panel-header">
              <span className="panel-dot panel-dot-green" />
              <span className="panel-label">pipeline.yaml</span>
            </div>
            <textarea
              className="playground-editor"
              value={yamlText}
              onChange={(e) => setYamlText(e.target.value)}
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
            />
          </div>

          <div className="playground-diagnostics-wrap">
            <div className="playground-panel-header">
              <span className="panel-label">Diagnostics</span>
              {warnCount > 0 && (
                <span className="diag-count diag-count-warn">{warnCount}</span>
              )}
              {errorCount > 0 && (
                <span className="diag-count diag-count-error">{errorCount}</span>
              )}
              {errorCount === 0 && warnCount === 0 && successCount > 0 && (
                <span className="diag-count diag-count-ok">{successCount}</span>
              )}
            </div>
            <div className="playground-diagnostics">
              {diagnostics.length === 0 && (
                <div className="diag-empty">Start typing to see validation results.</div>
              )}
              {diagnostics.map((d, i) => (
                <div key={i} className={`diag-item diag-${d.type}`}>
                  <span className="diag-icon">
                    {d.type === 'error' ? '✕' : d.type === 'warning' ? '!' : '✓'}
                  </span>
                  <span className="diag-msg">{d.message}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </Layout>
  );
}

export default Playground;
