import { app } from './app.ts';
import { backendLog } from './logger.ts';

process.on('unhandledRejection', reason => {
  backendLog('error', 'process.unhandled_rejection', {}, reason);
  process.exit(1);
});
process.on('uncaughtException', error => {
  backendLog('error', 'process.uncaught_exception', {}, error);
  process.exit(1);
});

const server = app.listen(8788, 'localhost', () => backendLog('info', 'http.server.started', { host: 'localhost', port: 8788 }));
server.on('error', error => {
  backendLog('error', 'http.server.failed', { host: 'localhost', port: 8788 }, error);
  process.exitCode = 1;
});
