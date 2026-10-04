import { expect, test, vi } from 'vitest';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { Readable } from 'node:stream';
import { Gaxios } from 'gaxios';
import { teenyRequest } from 'teeny-request';
import { makeUUID } from 'google-gax';

const require = createRequire(import.meta.url);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
for (const consumer of ['google-gax', 'gaxios', 'teeny-request']) test(`${consumer} keeps its CJS uuid v4 contract with the patched dependency`, () => {
  const ownRequire = createRequire(require.resolve(consumer));
  expect(ownRequire('uuid/package.json').version).toBe('11.1.1');
  const uuid = ownRequire('uuid');
  const first = uuid.v4(); expect(first).toMatch(uuidPattern); expect(uuid.v4()).not.toBe(first);
});
test('google-gax still creates a UUID and Firestore resolves the patched Node gRPC client', () => {
  expect(makeUUID()).toMatch(uuidPattern);
  for (const consumer of ['@firebase/firestore', 'google-gax']) {
    const ownRequire = createRequire(require.resolve(consumer));
    expect(ownRequire('@grpc/grpc-js/package.json').version).toBe('1.14.5');
    expect(typeof ownRequire('@grpc/grpc-js').Client).toBe('function');
  }
});
for (const method of ['v3', 'v5', 'v6']) test(`GHSA-w5hq-g745-h8pq: ${method} rejects a too-small external output buffer`, () => {
  const ownRequire = createRequire(require.resolve('google-gax')); const uuid = ownRequire('uuid');
  const buffer = new Uint8Array(8); buffer.fill(170); const before = buffer.slice();
  expect(() => method === 'v6' ? uuid.v6({}, buffer, 4) : uuid[method]('fixture', uuid.v5.DNS, buffer, 4)).toThrow(RangeError);
  expect(buffer).toEqual(before);
});

async function multipartProbe(send: (url: string) => Promise<unknown>) {
  let contentType = ''; let body = '';
  const server = createServer((request, response) => {
    contentType = request.headers['content-type'] ?? '';
    request.on('data', chunk => { body += String(chunk); });
    request.on('end', () => { response.writeHead(200, { 'Content-Type': 'application/json' }); response.end('{"ok":true}'); });
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const address = server.address(); if (!address || typeof address === 'string') throw new Error('Local fixture did not start');
    await send(`http://127.0.0.1:${address.port}/fixture`);
    const boundary = contentType.split('boundary=')[1];
    expect(boundary).toMatch(uuidPattern); expect(body).toContain(`--${boundary}`); expect(body).toContain(`--${boundary}--`);
    expect(body).toContain('security-first'); expect(body).toContain('security-second');
  } finally { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
}
test('gaxios multipart still sends valid UUID boundaries over local HTTP', async () => {
  await multipartProbe(async url => {
    const response = await new Gaxios().request({ url, method: 'POST', noProxy: ['127.0.0.1'],
      multipart: [{ headers: { 'Content-Type': 'text/plain' }, content: 'security-first' }, { headers: { 'Content-Type': 'text/plain' }, content: 'security-second' }] });
    expect(response.status).toBe(200); expect(response.data).toEqual({ ok: true });
  });
});
test('teeny-request multipart still sends valid UUID boundaries over local HTTP', async () => {
  const previous = process.env.NO_PROXY; vi.stubEnv('NO_PROXY', '127.0.0.1');
  try {
    await multipartProbe(url => new Promise<void>((resolve, reject) => {
      teenyRequest({ url, method: 'POST', headers: {}, multipart: [{ body: 'security-first' }, { body: Readable.from(['security-second']) }] },
        (error, response, body) => { if (error) { reject(error); return; } try { expect(response.statusCode).toBe(200); expect(body).toEqual({ ok: true }); resolve(); } catch (failure) { reject(failure); } });
    }));
  } finally { vi.stubEnv('NO_PROXY', previous); }
});
