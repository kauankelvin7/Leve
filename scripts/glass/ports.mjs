import net from 'node:net';
// dev-local intentionally reuses emulators; this guard requires an isolated fresh run.
for (const port of [9099, 8080, 8788, 5174]) await new Promise((resolve, reject) => {
  const socket = net.createConnection({ host: '127.0.0.1', port });
  socket.once('connect', () => { socket.destroy(); reject(Error(`GLASS_PORT_IN_USE: ${port}`)); });
  socket.once('error', resolve); socket.setTimeout(400, () => { socket.destroy(); resolve(); });
});
