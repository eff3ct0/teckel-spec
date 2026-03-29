import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import useBaseUrl from '@docusaurus/useBaseUrl';

function Hero() {
  return (
    <section className="hero-section">
      <div className="hero-content">
        <div className="hero-badge">Specification v3.0</div>
        <h1 className="hero-title">
          Data pipelines,<br />declared in YAML.
        </h1>
        <p className="hero-subtitle">
          Teckel is a declarative language for building ETL pipelines.
          Describe your sources, transformations, and outputs — the runtime
          handles execution.
        </p>
        <div className="hero-actions">
          <Link className="hero-btn hero-btn-primary" to="/docs/intro">
            Get started
          </Link>
          <Link
            className="hero-btn hero-btn-secondary"
            to="https://github.com/eff3ct0/teckel-spec/blob/main/spec/v3.0/teckel-spec.md"
          >
            Read the spec
          </Link>
          <Link
            className="hero-btn hero-btn-secondary"
            to="https://github.com/eff3ct0/teckel-spec"
          >
            GitHub
          </Link>
        </div>
      </div>
    </section>
  );
}

function PipelineDiagram() {
  return (
    <section className="diagram-section">
      <img
        src={useBaseUrl('/img/diagrams/pipeline-flow.svg')}
        alt="Pipeline execution flow"
        className="diagram-img"
      />
    </section>
  );
}

function YamlExample() {
  return (
    <section className="example-section">
      <div className="example-grid">
        <div className="example-text">
          <h2 className="section-title">Write pipelines, not glue code</h2>
          <p className="section-desc">
            A complete Teckel document reads a CSV, joins it with another
            dataset, selects columns, and writes Parquet — all in under 30
            lines of YAML.
          </p>
          <ul className="feature-list">
            <li>45 transformation types</li>
            <li>SQL-like expression language</li>
            <li>Declarative data quality checks</li>
            <li>Runtime-agnostic specification</li>
          </ul>
        </div>
        <div className="example-code">
          <div className="code-header">
            <span className="code-dot code-dot-red" />
            <span className="code-dot code-dot-yellow" />
            <span className="code-dot code-dot-green" />
            <span className="code-filename">pipeline.yaml</span>
          </div>
          <pre className="code-block">
{`version: "3.0"

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
          condition: "orders.cid = customers.id"

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
    mode: overwrite`}
          </pre>
        </div>
      </div>
    </section>
  );
}

const features = [
  {
    title: '45 Transformations',
    description:
      'Select, filter, join, group, window, pivot, merge, as-of join, grouping sets, NA operations, and more. Every operation is a YAML key.',
    color: '#3b82f6',
  },
  {
    title: 'Expression Language',
    description:
      'SQL-like expressions for computed columns, conditions, and aggregations. CASE, CAST, nested functions — all inline.',
    color: '#a855f7',
  },
  {
    title: 'Data Quality',
    description:
      'Declarative quality suites with completeness, uniqueness, validity, freshness, referential integrity, and more.',
    color: '#22c55e',
  },
  {
    title: 'Runtime Agnostic',
    description:
      'The specification is not tied to any engine. Reference implementation on Apache Spark, designed for DuckDB, Polars, and others.',
    color: '#f59e0b',
  },
  {
    title: 'Metadata & Governance',
    description:
      'Pipeline ownership, tags, lineage tracking, exposures, catalog integration, and column-level documentation.',
    color: '#06b6d4',
  },
  {
    title: 'Variables & Secrets',
    description:
      'Parameterize pipelines with variables and environment overrides. Secrets are declared in YAML and resolved at runtime.',
    color: '#ef4444',
  },
];

function Features() {
  return (
    <section className="features-section">
      <h2 className="section-title section-title-center">
        Everything you need in a pipeline language
      </h2>
      <div className="features-grid">
        {features.map((f, i) => (
          <div key={i} className="feature-card">
            <div
              className="feature-indicator"
              style={{ backgroundColor: f.color }}
            />
            <h3 className="feature-title">{f.title}</h3>
            <p className="feature-desc">{f.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="cta-section">
      <h2 className="cta-title">Start building pipelines</h2>
      <p className="cta-desc">
        Read the documentation, explore the specification, or dive into the
        reference implementation.
      </p>
      <div className="hero-actions">
        <Link className="hero-btn hero-btn-primary" to="/docs/intro">
          Documentation
        </Link>
        <Link
          className="hero-btn hero-btn-secondary"
          to="https://github.com/eff3ct0/teckel"
        >
          Reference implementation
        </Link>
      </div>
    </section>
  );
}

export default function Home(): React.JSX.Element {
  return (
    <Layout
      title="Declarative YAML pipelines"
      description="Teckel is a declarative language for building data transformation pipelines in YAML."
    >
      <main className="landing">
        <Hero />
        <PipelineDiagram />
        <YamlExample />
        <Features />
        <CTA />
      </main>
    </Layout>
  );
}
