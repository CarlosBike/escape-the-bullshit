'use strict';

/*
 * A small front-matter reader.
 *
 * It understands the subset of YAML that the content files and the editing
 * screen actually use:
 *
 *   key: plain value
 *   key: "quoted value"
 *   key: "a quoted value that
 *          runs over two lines"
 *   key: 123
 *   key: true
 *   key: >
 *     a long value folded onto one line
 *   key: |
 *     a long value kept line by line
 *   key:
 *     - first item
 *     - second item
 *
 * It is deliberately small. If it meets something it does not understand it
 * leaves it alone rather than guessing.
 */

function coerce(value) {
  var s = String(value).trim();

  if (/^".*"$/.test(s)) {
    return s.slice(1, -1)
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t')
      .replace(/\\"/g, '"');
  }
  if (/^'.*'$/.test(s)) {
    return s.slice(1, -1).replace(/''/g, "'");
  }
  if (s === 'true') return true;
  if (s === 'false') return false;
  if (s === 'null' || s === '~') return '';
  if (/^-?\d+$/.test(s)) return parseInt(s, 10);
  if (/^-?\d*\.\d+$/.test(s)) return parseFloat(s);

  return s;
}

/* Reads a quoted value that may run over more than one line. */
function readQuoted(lines, index, firstValue) {
  var quote = firstValue.charAt(0);
  var text = firstValue.slice(1);
  var i = index;
  var closed = false;
  var collected = '';

  while (!closed) {
    var out = '';
    var j = 0;

    while (j < text.length) {
      var ch = text.charAt(j);

      if (quote === '"' && ch === '\\' && j + 1 < text.length) {
        out += text.charAt(j + 1);
        j += 2;
        continue;
      }
      if (ch === quote) {
        closed = true;
        j++;
        break;
      }
      out += ch;
      j++;
    }

    collected += out;

    if (closed) break;

    i++;
    if (i >= lines.length) break;

    collected += ' ';
    text = lines[i];
  }

  return { value: collected, index: i };
}

function parseBlock(block) {
  var out = {};
  var lines = String(block).split(/\r?\n/);
  var i = 0;

  while (i < lines.length) {
    var line = lines[i];

    if (!line.trim()) { i++; continue; }

    var match = /^([A-Za-z0-9_-]+)\s*:\s*(.*)$/.exec(line);
    if (!match) { i++; continue; }

    var key = match[1];
    var value = match[2].trim();

    // Block scalar: the value continues on the following indented lines.
    if (/^[>|][-+]?$/.test(value)) {
      var kind = value.charAt(0);
      var buffer = [];
      i++;

      while (i < lines.length) {
        var current = lines[i];

        if (!current.trim()) {
          // A blank line only belongs to the block if more indented lines
          // follow it.
          var look = i;
          while (look < lines.length && !lines[look].trim()) look++;
          if (look < lines.length && /^\s/.test(lines[look])) {
            buffer.push('');
            i = look;
            continue;
          }
          break;
        }

        if (/^\s/.test(current)) {
          buffer.push(current.replace(/^\s{1,4}/, ''));
          i++;
          continue;
        }

        break;
      }

      if (kind === '|') {
        out[key] = buffer.join('\n').replace(/\s+$/, '');
      } else {
        out[key] = buffer.join(' ').replace(/\s+/g, ' ').trim();
      }
      continue;
    }

    // A list of items.
    if (value === '') {
      var lookAhead = i + 1;
      var items = [];
      while (lookAhead < lines.length && /^\s*-\s+/.test(lines[lookAhead])) {
        items.push(lines[lookAhead].replace(/^\s*-\s+/, '').trim());
        lookAhead++;
      }
      if (items.length) {
        out[key] = items;
        i = lookAhead;
        continue;
      }
    }

    // A quoted value that may run over several lines.
    if (/^["']/.test(value)) {
      var quoted = readQuoted(lines, i, value);
      out[key] = quoted.value;
      i = quoted.index + 1;
      continue;
    }

    out[key] = coerce(value);
    i++;
  }

  return out;
}

function parseFrontMatter(text) {
  var source = String(text == null ? '' : text).replace(/^\uFEFF/, '');

  var match = /^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/.exec(source);
  if (!match) {
    return { data: {}, body: source };
  }

  return {
    data: parseBlock(match[1]),
    body: source.slice(match[0].length)
  };
}

module.exports = { parseFrontMatter: parseFrontMatter, parseBlock: parseBlock };
