// Load job, L-WARM-1 and L-COLD-1 of the test plan. Starts nothing: it expects the composed service with the demo
// profile already up (`docker compose --profile demo up -d --build`), which answers from the stub upstream.
// Exits 1 when a threshold fails.
import { readFileSync } from 'node:fs';

import autocannon from 'autocannon';

const API_URL = process.env.API_URL ?? 'http://localhost:3001/graphql';
const QUERY = readFileSync(
  new URL('../test/schema/queries/default.graphql', import.meta.url),
  'utf8',
);
const WARM_CITY = 'Biarritz';
// Not queried before in a fresh stack, so its first request fetches through the stub upstream.
const COLD_CITY = 'Dubai';
const CONNECTIONS = 50;
const DURATION_S = 10;
const SAMPLE_SIZE = 20;
const WARM_P95_MS = 300;
const COLD_MS = 3000;

function requestBody(city) {
  return JSON.stringify({ query: QUERY, variables: { city } });
}

async function post(city) {
  const started = performance.now();
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: requestBody(city),
  });
  const body = await response.json();
  const ms = performance.now() - started;
  return { ms, status: response.status, errors: body.errors?.length ?? 0 };
}

function percentile(sorted, fraction) {
  return sorted[Math.min(sorted.length - 1, Math.ceil(fraction * sorted.length) - 1)];
}

// autocannon reports p90 and p97.5 but not p95, so the job keeps every response time and computes it.
async function warmRun() {
  const times = [];
  const tracker = autocannon({
    url: API_URL,
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: requestBody(WARM_CITY),
    connections: CONNECTIONS,
    duration: DURATION_S,
  });
  tracker.on('response', (_client, _status, _bytes, responseTime) => times.push(responseTime));
  const result = await tracker;
  const sorted = times.sort((left, right) => left - right);
  return {
    requests: result.requests.total,
    p95: percentile(sorted, 0.95),
    max: sorted.at(-1),
    serverErrors: result['5xx'] + result.errors + result.timeouts,
  };
}

async function sampleErrors() {
  let errors = 0;
  for (let index = 0; index < SAMPLE_SIZE; index += 1) {
    const { status, errors: graphqlErrors } = await post(WARM_CITY);
    errors += graphqlErrors + (status === 200 ? 0 : 1);
  }
  return errors;
}

function printTable(rows) {
  const header = ['check', 'value', 'threshold', 'result'];
  const lines = [
    header,
    ...rows.map((row) => [row.check, row.value, row.threshold, row.pass ? 'pass' : 'FAIL']),
  ];
  const widths = header.map((_, column) =>
    Math.max(...lines.map((line) => String(line[column]).length)),
  );
  for (const line of lines) {
    console.log(line.map((cell, column) => String(cell).padEnd(widths[column])).join('  '));
  }
}

async function main() {
  const priming = await post(WARM_CITY);
  const warm = await warmRun();
  const errors = await sampleErrors();
  const cold = await post(COLD_CITY);
  const rows = [
    {
      check: `warm p95 ms (${WARM_CITY}, ${CONNECTIONS} conn, ${DURATION_S} s)`,
      value: warm.p95.toFixed(1),
      threshold: `< ${WARM_P95_MS}`,
      pass: warm.p95 < WARM_P95_MS,
    },
    { check: 'warm max ms', value: warm.max.toFixed(1), threshold: '-', pass: true },
    { check: 'warm requests', value: warm.requests, threshold: '-', pass: warm.requests > 0 },
    {
      check: '5xx, socket errors, timeouts',
      value: warm.serverErrors,
      threshold: '= 0',
      pass: warm.serverErrors === 0,
    },
    {
      check: `GraphQL errors in ${SAMPLE_SIZE + 1} samples`,
      value: errors + priming.errors,
      threshold: '= 0',
      pass: errors + priming.errors === 0,
    },
    {
      check: `cold ms (${COLD_CITY}, one request)`,
      value: cold.ms.toFixed(0),
      threshold: `< ${COLD_MS}`,
      pass: cold.ms < COLD_MS && cold.status === 200 && cold.errors === 0,
    },
  ];
  printTable(rows);
  if (rows.some((row) => !row.pass)) {
    process.exitCode = 1;
  }
}

await main();
