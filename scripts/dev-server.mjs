import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import session from '../api/session.mjs';
import catalog from '../api/catalog.mjs';
import uploadSignature from '../api/upload-signature.mjs';

const host = '127.0.0.1';
const port = Number(process.env.PORT || 4173);
const directory = resolve(fileURLToPath(new URL('../dist/', import.meta.url)));
const functions = {
  '/api/session': session,
  '/api/catalog': catalog,
  '/api/upload-signature': uploadSignature
};
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml'
};

createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://' + host + ':' + port);
    const handler = functions[url.pathname];
    if (handler) {
      const body = ['GET', 'HEAD'].includes(request.method) ? undefined : request;
      const webRequest = new Request(url, {
        method: request.method,
        headers: request.headers,
        body,
        ...(body ? { duplex: 'half' } : {})
      });
      const result = await handler.fetch(webRequest);
      response.writeHead(result.status, Object.fromEntries(result.headers));
      response.end(Buffer.from(await result.arrayBuffer()));
      return;
    }
    const pathname = url.pathname === '/' ? '/index.html'
      : ['/cakeadmin', '/cakeadmin/'].includes(url.pathname) ? '/cakeadmin.html' : decodeURIComponent(url.pathname);
    const file = resolve(directory, '.' + pathname);
    if (!file.startsWith(directory + sep)) {
      response.writeHead(403);
      response.end();
      return;
    }
    const data = await readFile(file);
    const extension = file.slice(file.lastIndexOf('.'));
    response.writeHead(200, { 'Content-Type': mime[extension] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    response.end(data);
  } catch (error) {
    response.writeHead(error.code === 'ENOENT' ? 404 : 500, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end(error.code === 'ENOENT' ? 'No encontrado' : 'Error interno');
  }
}).listen(port, host, () => {
  console.log('LaBiuCakes preview: http://' + host + ':' + port);
});
