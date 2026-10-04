import { AsyncLocalStorage } from 'node:async_hooks';
import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const scopes = new AsyncLocalStorage();
const file = process.env.GLASS_TIMINGS_FILE;
if (file) mkdirSync(dirname(file), { recursive: true });
let sequence = 0;

export function withGlassScope(scope, task) {
  return scopes.run(scope, task);
}

// Static harness labels only: never record operation arguments, DOM text,
// account identifiers, requests, tokens, or exception contents.
export async function timeGlassOperation(operation, task) {
  if (!file) return task();
  const id = `${process.pid}:${++sequence}`;
  const start = performance.now();
  const record = { id, scope: scopes.getStore() ?? 'fixture', operation, diagnostic: process.env.GLASS_DIAGNOSTIC === '1' };
  appendFileSync(file, JSON.stringify({ ...record, event: 'start', atMs: start }) + '\n');
  let completed = false;
  try {
    const result = await task();
    completed = true;
    return result;
  } finally {
    const end = performance.now();
    appendFileSync(file, JSON.stringify({ ...record, event: 'end', atMs: end, durationMs: end - start, completed }) + '\n');
  }
}
