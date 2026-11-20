'use strict';

/*
 * A small Markdown renderer.
 *
 * It handles the subset the site actually uses:
 *
 *   # Heading        ## Heading
 *   Paragraphs
 *   - bullet lists   1. numbered lists
 *   > blockquotes    ``` code blocks
 *   --- horizontal rules
 *   raw HTML blocks (anything starting with a tag)
 *
 * Inline: **bold**, *italic*, `code`, [links](href), and inline HTML.
 * Raw HTML is preserved rather than escaped, so forms and cards can be
 * written straight into a page.
 */

var MARK = '\u0000';

function escapeAmp(text) {
  return String(text).replace(/&(?![a-zA-Z#0-9]{1,8};)/g, '&amp;');
}

function escapeLooseAngle(text) {
  return String(text).replace(/<(?![a-zA-Z/!])/g, '&lt;');
}

function inline(text) {
  var codes = [];
  var s = String(text == null ? '' : text);

  // Protect code spans first so their contents are never touched again.
  s = s.replace(/`([^`]+)`/g, function (_, code) {
    codes.push(code);
    return MARK + 'C' + (codes.length - 1) + MARK;
  });

  s = escapeAmp(s);

  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (_, label, href) {
    return '<a href="' + href + '">' + label + '</a>';
  });

  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');

  s = escapeLooseAngle(s);

  s = s.replace(new RegExp(MARK + 'C(\\d+)' + MARK, 'g'), function (_, index) {
    return '<code>' + codes[Number(index)] + '</code>';
  });

  return s;
}

function isRule(line) {
  return /^(\*\s*){3,}$/.test(line) ||
         /^(-\s*){3,}$/.test(line) ||
         /^(__\s*){3,}$/.test(line);
}

function parse(source) {
  var lines = String(source == null ? '' : source).replace(/\r\n/g, '\n').split('\n');
  var blocks = [];
  var i = 0;

  while (i < lines.length) {
    var line = lines[i];

    if (!line.trim()) { i++; continue; }

    // Fenced code
    if (/^\s*```/.test(line)) {
      var code = [];
      i++;
      while (i < lines.length && !/^\s*```/.test(lines[i])) { code.push(lines[i]); i++; }
      i++;
      blocks.push({ type: 'code', content: code.join('\n') });
      continue;
    }

    // Heading
    var heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      blocks.push({ type: 'heading', level: heading[1].length, text: heading[2].trim() });
      i++;
      continue;
    }

    // Horizontal rule
    if (isRule(line.trim())) { blocks.push({ type: 'rule' }); i++; continue; }

    // Blockquote
    if (/^>\s?/.test(line)) {
      var quoted = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        quoted.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      blocks.push({ type: 'quote', content: quoted.join('\n') });
      continue;
    }

    // Bulleted list
    if (/^\s*[-*+]\s+/.test(line)) {
      var bullets = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        var item = lines[i].replace(/^\s*[-*+]\s+/, '');
        i++;
        while (i < lines.length && /^\s{2,}\S/.test(lines[i]) && !/^\s*[-*+]\s+/.test(lines[i])) {
          item += ' ' + lines[i].trim();
          i++;
        }
        bullets.push(item);
      }
      blocks.push({ type: 'ul', items: bullets });
      continue;
    }

    // Numbered list
    if (/^\s*\d+[.)]\s+/.test(line)) {
      var numbers = [];
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) {
        var number = lines[i].replace(/^\s*\d+[.)]\s+/, '');
        i++;
        while (i < lines.length && /^\s{2,}\S/.test(lines[i]) && !/^\s*\d+[.)]\s+/.test(lines[i])) {
          number += ' ' + lines[i].trim();
          i++;
        }
        numbers.push(number);
      }
      blocks.push({ type: 'ol', items: numbers });
      continue;
    }

    // Raw HTML: keep collecting chunks while the next one also starts with a tag.
    if (/^\s*</.test(line)) {
      var html = [];
      while (i < lines.length) {
        if (!lines[i].trim()) {
          var look = i;
          while (look < lines.length && !lines[look].trim()) look++;
          if (look < lines.length && /^\s*</.test(lines[look])) {
            html.push('');
            i = look;
            continue;
          }
          break;
        }
        html.push(lines[i]);
        i++;
      }
      blocks.push({ type: 'html', content: html.join('\n') });
      continue;
    }

    // Paragraph
    var paragraph = [];
    while (i < lines.length && lines[i].trim()) {
      var current = lines[i];
      if (paragraph.length && (
        /^(#{1,6})\s+/.test(current) ||
        /^\s*[-*+]\s+/.test(current) ||
        /^\s*\d+[.)]\s+/.test(current) ||
        /^>\s?/.test(current) ||
        /^\s*</.test(current) ||
        /^\s*```/.test(current) ||
        isRule(current.trim())
      )) break;
      paragraph.push(current);
      i++;
    }
    blocks.push({ type: 'paragraph', text: paragraph.join(' ') });
  }

  return blocks;
}

function renderBlocks(blocks) {
  var html = [];

  blocks.forEach(function (block) {
    switch (block.type) {
      case 'heading':
        html.push('<h' + block.level + '>' + inline(block.text) + '</h' + block.level + '>');
        break;
      case 'paragraph':
        html.push('<p>' + inline(block.text) + '</p>');
        break;
      case 'ul':
        html.push('<ul>' + block.items.map(function (item) {
          return '<li>' + inline(item) + '</li>';
        }).join('') + '</ul>');
        break;
      case 'ol':
        html.push('<ol>' + block.items.map(function (item) {
          return '<li>' + inline(item) + '</li>';
        }).join('') + '</ol>');
        break;
      case 'quote':
        html.push('<blockquote>' + inline(block.content.replace(/\n{2,}/g, ' ').replace(/\n/g, ' ')) + '</blockquote>');
        break;
      case 'code':
        html.push('<pre><code>' + escapeAmp(block.content) + '</code></pre>');
        break;
      case 'rule':
        html.push('<hr />');
        break;
      case 'html':
        html.push(block.content);
        break;
    }
  });

  return html.join('\n');
}

function render(source) {
  return renderBlocks(parse(source));
}

module.exports = { render: render, parse: parse, inline: inline };
