'use strict';

/*
 * A tiny local preview server.
 *
 *   npm run serve
 *
 * Then open:
 *   http://localhost:8000          the site
 *   http://localhost:8000/admin/   the editing screen
 */

var http = require('http');
var fs = require('fs');
var path = require('path');

var ROOT = path.resolve(__dirname, '..');
var DIST = path.join(ROOT, 'dist');
var PORT = process.env.PORT || 8000;

var TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon'
};

function resolveFile(urlPath) {
  var clean = decodeURIComponent(urlPath.split('?')[0].split('#')[0]);
  if (clean.indexOf('..') !== -1) return null;

  var target = path.join(DIST, clean);

  if (fs.existsSync(target) && fs.statSync(target).isDirectory()) {
    target = path.join(target, 'index.html');
  }

  if (!fs.existsSync(target) && !path.extname(target)) {
    var asDirectory = path.join(target, 'index.html');
    if (fs.existsSync(asDirectory)) target = asDirectory;
  }

  if (!fs.existsSync(target)) return null;

  return target;
}

var server = http.createServer(function (request, response) {
  var file = resolveFile(request.url);

  if (!file) {
    var notFound = path.join(DIST, '404.html');
    response.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    if (fs.existsSync(notFound)) {
      response.end(fs.readFileSync(notFound));
    } else {
      response.end('<!DOCTYPE html><html><body><h1>404</h1><p>Not found.</p></body></html>');
    }
    return;
  }

  var type = TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream';

  response.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  response.end(fs.readFileSync(file));
});

if (!fs.existsSync(DIST)) {
  console.log('');
  console.log('  There is no dist/ folder yet.');
  console.log('  Run "npm run build" first, then "npm run serve".');
  console.log('');
  process.exit(1);
}

server.listen(PORT, function () {
  console.log('');
  console.log('  Preview running');
  console.log('');
  console.log('  Site:   http://localhost:' + PORT + '/');
  console.log('  Editor: http://localhost:' + PORT + '/admin/');
  console.log('');
  console.log('  Press Ctrl+C to stop.');
  console.log('');
});
