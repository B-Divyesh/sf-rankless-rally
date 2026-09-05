import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, normalize, resolve, sep } from 'node:path';

const root = resolve('dist');
const portIndex = process.argv.indexOf('--port');
const port = Number(portIndex >= 0 ? process.argv[portIndex + 1] : 4173);
const mime = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.xml': 'application/xml; charset=utf-8'
};

const fileFor = (pathname) => {
  const decoded = decodeURIComponent(pathname);
  const relative = normalize(decoded).replace(/^([/\\])+/, '');
  const candidate = resolve(root, relative);
  if (!candidate.startsWith(`${root}${sep}`) && candidate !== root) return null;
  if (existsSync(candidate) && statSync(candidate).isDirectory()) return resolve(candidate, 'index.html');
  if (existsSync(candidate)) return candidate;
  if (!extname(candidate) && existsSync(`${candidate}.html`)) return `${candidate}.html`;
  return null;
};

createServer((request, response) => {
  const pathname = new URL(request.url ?? '/', 'http://localhost').pathname;
  const requested = fileFor(pathname);
  const file = requested && existsSync(requested) ? requested : resolve(root, '404.html');
  const status = requested && existsSync(requested) ? 200 : 404;
  response.writeHead(status, { 'Content-Type': mime[extname(file)] ?? 'application/octet-stream' });
  createReadStream(file).pipe(response);
}).listen(port, '127.0.0.1', () => {
  console.log(`Rankless Rally static preview running at http://127.0.0.1:${port}`);
});
