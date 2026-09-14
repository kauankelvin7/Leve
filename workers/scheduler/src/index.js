function hex(buffer) {
  return [...new Uint8Array(buffer)].map(value => value.toString(16).padStart(2, '0')).join('');
}

async function signature(secret, message) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message)));
}

export default {
  async scheduled(_event, env, context) {
    if (!env.SCHEDULER_HMAC_SECRET || !env.LEVE_API_ORIGIN || env.LEVE_API_ORIGIN === 'https://example.invalid') return;
    const timestamp = String(Date.now());
    const path = '/api/internal/tick';
    const authorization = await signature(env.SCHEDULER_HMAC_SECRET, `${timestamp}.POST.${path}`);
    context.waitUntil(fetch(new URL(path, env.LEVE_API_ORIGIN), {
      method: 'POST',
      headers: { 'x-leve-timestamp': timestamp, 'x-leve-signature': authorization },
    }));
  },
};
