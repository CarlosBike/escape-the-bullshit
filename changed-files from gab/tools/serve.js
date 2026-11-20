'use strict';

/*
 * A tiny local preview server, with a small editing API.
 *
 *   npm run serve
 *
 * Then open:
 *   http://localhost:8000                     the site
 *   http://localhost:8000/admin/              the Sveltia editing screen
 *   http://localhost:8000/admin/editor.html   the built-in local editor
 *
 * The built-in editor saves straight into content/ and can rebuild the
 * site from the browser, so editing works even with no internet connection.
 */

var http = require('http');
var fs = require('fs');
var path = require('path');
var yaml = require('./yaml.js');

var ROOT = path.resolve(__dirname, '..');
var DIST = path.join(ROOT, 'dist');
var PORT = process.env.PORT || 8000;

var TOPIC_KEYS = [
  'title', 'navTitle', 'blurb', 'order', 'featured',
  'lead', 'claim', 'alternatives', 'responsible', 'demand', 'status',
  'sources', 'advice'
];

var PAGE_KEYS = [
  'title', 'navLabel', 'order', 'nav', 'hero', 'description'
];

var TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.yml': 'text/yaml; charset=utf-8',
  '.yaml': 'text/yaml; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon'
};

/* ---------- small helpers ---------- */

function toPosix(relative) {
  return relative.split(path.sep).join('/');
}

function sendJson(response, data, code) {
  response.writeHead(code || 200, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  response.end(JSON.stringify(data));
}

/* Only files inside content/pages and content/topics may be read or written. */
function contentPath(relative) {
  relative = String(relative || '');
  if (!/^content[\\/](pages|topics)[\\/][A-Za-z0-9._-]+\.md$/.test(relative)) return null;
  var full = path.resolve(ROOT, relative);
  var contentRoot = path.resolve(ROOT, 'content');
  if (full.indexOf(contentRoot) !== 0) return null;
  return full;
}

function kindOf(relative) {
  return relative.indexOf('pages') !== -1 ? 'pages' : 'topics';
}

/* ---------- the editing API ---------- */

function listContent() {
  var out = { topics: [], pages: [] };

  ['topics', 'pages'].forEach(function (kind) {
    var dir = path.join(ROOT, 'content', kind);
    if (!fs.existsSync(dir)) return;

    fs.readdirSync(dir)
      .filter(function (file) { return /\.md$/i.test(file); })
      .sort()
      .forEach(function (file) {
        var raw = fs.readFileSync(path.join(dir, file), 'utf8');
        var parsed = yaml.parseFrontMatter(raw);
        out[kind].push({
          file: toPosix(path.join('content', kind, file)),
          slug: file.replace(/\.md$/i, ''),
          title: parsed.data.title || file.replace(/\.md$/i, ''),
          blurb: parsed.data.blurb || '',
          navLabel: parsed.data.navLabel || ''
        });
      });
  });

  return out;
}

function handleList(response) {
  sendJson(response, listContent());
}

function handleFileGet(request, response) {
  var query = request.url.split('?')[1] || '';
  var relative = '';
  query.split('&').forEach(function (pair) {
    var bits = pair.split('=');
    if (bits[0] === 'path') {
      relative = decodeURIComponent((bits[1] || '').replace(/\+/g, ' '));
    }
  });

  var full = contentPath(relative);
  if (!full || !fs.existsSync(full)) {
    sendJson(response, { error: 'That file could not be found.' }, 404);
    return;
  }

  var parsed = yaml.parseFrontMatter(fs.readFileSync(full, 'utf8'));
  sendJson(response, {
    path: toPosix(relative),
    data: parsed.data,
    body: parsed.body
  });
}

/* Writes a YAML value. Long text is written as a readable block rather than
   one very long line, so the files stay easy to edit by hand as well. */
function yamlValue(value) {
  if (value === true || value === false) return { plain: String(value) };
  if (typeof value === 'number') return { plain: String(value) };

  var text = String(value == null ? '' : value);

  if (text.indexOf('\n') !== -1) return { block: '|', text: text };
  if (text.length > 80) return { block: '>', text: text };
  return { quoted: JSON.stringify(text) };
}

function writeFrontMatter(data, keys) {
  var used = {};
  var lines = ['---'];

  function writeKey(key, value) {
    if (value === undefined || value === null) return;
    used[key] = true;

    var v = yamlValue(value);

    if (v.plain !== undefined) {
      lines.push(key + ': ' + v.plain);
    } else if (v.block) {
      lines.push(key + ': ' + v.block);
      v.text.split('\n').forEach(function (line) {
        lines.push(line === '' ? '' : '  ' + line);
      });
    } else {
      lines.push(key + ': ' + v.quoted);
    }
  }

  keys.forEach(function (key) { writeKey(key, data[key]); });

  /* Keep anything else that was in the file, so nothing is silently lost. */
  Object.keys(data).forEach(function (key) {
    if (!used[key]) writeKey(key, data[key]);
  });

  lines.push('---');
  return lines.join('\n') + '\n\n';
}

function handleSave(request, response) {
  var chunks = '';
  var tooBig = false;

  request.on('data', function (chunk) {
    chunks += chunk;
    if (chunks.length > 4000000) tooBig = true;
  });

  request.on('end', function () {
    if (tooBig) {
      sendJson(response, { error: 'That is too much text to save at once.' }, 400);
      return;
    }

    var payload;
    try {
      payload = JSON.parse(chunks);
    } catch (error) {
      sendJson(response, { error: 'The saved text could not be read.' }, 400);
      return;
    }

    var relative = String(payload.path || '');
    var full = contentPath(relative);
    if (!full) {
      sendJson(response, { error: 'That file path is not allowed.' }, 400);
      return;
    }

    var kind = kindOf(relative);
    var keys = kind === 'pages' ? PAGE_KEYS : TOPIC_KEYS;
    var data = payload.data || {};
    var body = String(payload.body == null ? '' : payload.body).replace(/^\s+/, '');

    var text = writeFrontMatter(data, keys) + body;
    fs.writeFileSync(full, text, 'utf8');

    sendJson(response, { ok: true, path: toPosix(relative) });
  });
}

function handleBuild(response) {
  var result;
  try {
    result = require('./build.js').build();
  } catch (error) {
    sendJson(response, { ok: false, error: error.message }, 500);
    return;
  }
  sendJson(response, { ok: result === true });
}

/* ---------- static files ---------- */

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
  var urlPath = request.url.split('?')[0];

  if (request.method === 'POST' && urlPath === '/api/save') {
    handleSave(request, response);
    return;
  }

  if (request.method === 'POST' && urlPath === '/api/build') {
    handleBuild(response);
    return;
  }

  if (request.method === 'GET' && urlPath === '/api/list') {
    handleList(response);
    return;
  }

  if (request.method === 'GET' && urlPath === '/api/file') {
    handleFileGet(request, response);
    return;
  }

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
  console.log('  Editor: http://localhost:' + PORT + '/admin/editor.html');
  console.log('');
  console.log('  Press Ctrl+C to stop.');
  console.log('');
});
