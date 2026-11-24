'use strict';

/*
 * Builds the website into dist/.
 *
 * Reads:
 *   content/site.json    site-wide settings
 *   content/pages/*.md   ordinary pages
 *   content/topics/*.md  topic articles
 *
 * Writes:
 *   dist/index.html, dist/<page>.html
 *   dist/topics/<slug>/index.html
 *   dist/style.css, dist/site.js, dist/admin/...
 */

var fs = require('fs');
var path = require('path');
var yaml = require('./yaml.js');
var markdown = require('./markdown.js');

var ROOT = path.resolve(__dirname, '..');
var CONTENT = path.join(ROOT, 'content');
var STATIC = path.join(ROOT, 'static');
var ADMIN = path.join(ROOT, 'admin');
var DIST = path.join(ROOT, 'dist');

var problems = [];

function fail(message) { problems.push(message); }
function warn(message) { problems.push(message); }

function escapeHtml(text) {
  return String(text == null ? '' : text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function toNumber(value, fallback) {
  var number = parseInt(value, 10);
  return isNaN(number) ? fallback : number;
}

function readMarkdownDir(dirName) {
  var dir = path.join(CONTENT, dirName);

  if (!fs.existsSync(dir)) {
    fail('No ' + dirName + ' found in content/' + dirName);
    return [];
  }

  var files = fs.readdirSync(dir).filter(function (file) {
    return /\.md$/i.test(file);
  });

  if (!files.length) {
    fail('No ' + dirName + ' found in content/' + dirName);
    return [];
  }

  return files.map(function (file) {
    var raw = fs.readFileSync(path.join(dir, file), 'utf8');
    var parsed = yaml.parseFrontMatter(raw);
    return {
      file: file,
      path: 'content/' + dirName + '/' + file,
      meta: parsed.data,
      body: parsed.body,
      raw: raw
    };
  });
}

var SECTION_KEYS = {
  lead: ['lead', 'introduction', 'in short'],
  claim: ['the claim', 'the problem'],
  alternatives: ['alternatives', 'what you can do'],
  responsible: ['who is responsible'],
  demand: ['what we need them to do', 'what we want them to do', 'what we need them to do about it'],
  status: ['have they done it yet', 'have they done it', 'status'],
  sources: ['sources', 'where to check this yourself', 'where to check it yourself'],
  advice: ['professional advice', 'advice', 'a word of advice', 'check this yourself']
};

function normaliseHeading(text) {
  return String(text).toLowerCase().replace(/[?!.]+$/, '').trim();
}

function sectionsFromBody(body) {
  var out = {};
  var lines = String(body || '').split(/\r?\n/);
  var currentKey = null;
  var buffer = [];

  function flush() {
    if (currentKey) {
      out[currentKey] = buffer.join('\n\n').trim();
    }
    currentKey = null;
    buffer = [];
  }

  lines.forEach(function (line) {
    var heading = /^#{1,3}\s+(.*)$/.exec(line);
    if (heading) {
      flush();
      var name = normaliseHeading(heading[1]);
      Object.keys(SECTION_KEYS).forEach(function (key) {
        if (SECTION_KEYS[key].indexOf(name) !== -1) currentKey = key;
      });
      return;
    }
    if (currentKey) buffer.push(line);
  });

  flush();
  return out;
}

var TOPIC_FIELDS = [
  'title', 'blurb', 'lead', 'claim', 'alternatives',
  'responsible', 'demand', 'status', 'sources', 'advice'
];

function resolveTopic(topic) {
  var fromBody = sectionsFromBody(topic.body);
  var values = {};

  TOPIC_FIELDS.forEach(function (field) {
    var value = topic.meta[field];
    if (value === undefined || value === null || value === '') {
      value = fromBody[field];
    }
    if (value === undefined || value === null) value = '';
    values[field] = String(value).trim();
  });

  values.slug = topic.meta.slug || topic.file.replace(/\.md$/i, '');
  values.navTitle = topic.meta.navTitle || values.title || values.slug;
  values.order = toNumber(topic.meta.order, 999);
  values.featured = (topic.meta.featured === true || topic.meta.featured === 'true');
  values.extra = topic.body.trim();

  TOPIC_FIELDS.forEach(function (field) {
    if (!values[field]) {
      fail(topic.path + " is missing '" + field + "'");
    }
  });

  return values;
}

function pageHref(slug, depth) {
  var prefix = depth > 0 ? new Array(depth + 1).join('../') : '';
  return prefix + (slug === 'home' ? 'index.html' : slug + '.html');
}

function topicHref(slug, depth) {
  var prefix = depth > 0 ? new Array(depth + 1).join('../') : '';
  return prefix + 'topics/' + slug + '/index.html';
}

function navMarkup(navPages, depth, currentSlug) {
  return navPages.map(function (page) {
    var href = pageHref(page.slug, depth);
    var current = page.slug === currentSlug ? ' aria-current="page"' : '';
    var label = page.meta.navLabel || page.meta.title || page.slug;
    return '        <li><a href="' + href + '"' + current + '>' + escapeHtml(label) + '</a></li>';
  }).join('\n');
}

function layout(options) {
  var site = options.site;
  var navPages = options.navPages;
  var depth = options.depth;
  var currentSlug = options.currentSlug;
  var isHome = currentSlug === 'home';

  var title = isHome
    ? site.title + ' — ' + site.tagline
    : options.title + ' — ' + site.title;

  var nav = navMarkup(navPages, depth, currentSlug);
  var prefix = depth > 0 ? new Array(depth + 1).join('../') : '';

  var head = [
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    '<title>' + escapeHtml(title) + '</title>',
    '<meta name="description" content="' + escapeHtml(options.description || site.description) + '">',
    '<link rel="stylesheet" href="' + prefix + 'style.css">'
  ].join('\n');

  return [
    '<!DOCTYPE html>',
    '<html lang="en-GB">',
    '<head>',
    head,
    '</head>',
    '<body>',
    '',
    '<header class="site-header">',
    '  <div class="wrap">',
    '    <div class="brand">',
    '      <a href="' + pageHref('home', depth) + '">' + escapeHtml(site.title) + '</a>',
    '      <span class="tagline">' + escapeHtml(site.tagline) + '</span>',
    '      <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav">Menu</button>',
    '    </div>',
    '    <nav class="site-nav" id="site-nav" aria-label="Main">',
    '      <ul>',
    nav,
    '      </ul>',
    '    </nav>',
    '  </div>',
    '</header>',
    '',
    '<main>',
    '  <div class="wrap">',
    options.main,
    '  </div>',
    '</main>',
    '',
    '<footer class="site-footer">',
    '  <div class="wrap">',
    '    <ul>',
    navMarkup(navPages, depth, null),
    '    </ul>',
    '    <p>&copy; ' + site.year + ' ' + escapeHtml(site.title) + '. ' + escapeHtml(site.footerNote) + ' <a href="' + pageHref('privacy', depth) + '">How your data is handled</a>.</p>',
    '  </div>',
    '</footer>',
    '',
    '<script src="' + prefix + 'site.js"></script>',
    '</body>',
    '</html>'
  ].join('\n');
}

function heroMarkup(site) {
  if (!site.hero) return '';
  return [
    '    <div class="hero">',
    '      <img src="' + escapeHtml(site.hero.image) + '" alt="">',
    '      <div class="hero-text">',
    '        <h1>' + escapeHtml(site.hero.title) + '</h1>',
    '        <p>' + escapeHtml(site.hero.text) + '</p>',
    '      </div>',
    '    </div>',
    ''
  ].join('\n');
}

function topicListMarkup(topics, depth) {
  return topics.map(function (topic) {
    return '      <li><a href="' + topicHref(topic.slug, depth) + '">' + escapeHtml(topic.navTitle) + '</a><span>' + escapeHtml(topic.blurb) + '</span></li>';
  }).join('\n');
}

function build() {
  problems = [];

  var site = {};
  try {
    site = JSON.parse(fs.readFileSync(path.join(CONTENT, 'site.json'), 'utf8'));
  } catch (error) {
    fail('Could not read content/site.json - ' + error.message);
  }

  site.year = site.year || new Date().getFullYear();
  site.title = site.title || 'Escape the Bullshit';
  site.tagline = site.tagline || '';
  site.description = site.description || '';
  site.footerNote = site.footerNote || '';

  var pages = readMarkdownDir('pages').map(function (page) {
    page.slug = page.meta.slug || page.file.replace(/\.md$/i, '');
    page.order = toNumber(page.meta.order, 999);
    page.navLabel = page.meta.navLabel || page.meta.title || page.slug;

    /* The editing screen may store the page text below the --- lines or, in
       some versions, as a "body" field inside the frontmatter. Accept both,
       so saving a page in the editor cannot blank it. */
    if (!page.body.trim() && typeof page.meta.body === 'string') {
      page.body = page.meta.body;
    }

    if (!page.meta.title) fail(page.path + " is missing 'title'");
    if (!page.body.trim()) fail(page.path + ' has no content');
    return page;
  });

  var topics = readMarkdownDir('topics').map(resolveTopic).sort(function (a, b) {
    return a.order - b.order;
  });

  var navPages = pages.filter(function (page) {
    return page.meta.nav === true || page.meta.nav === 'true';
  }).sort(function (a, b) {
    return a.order - b.order;
  });

  if (problems.length) {
    report();
    return false;
  }

  // Clean output
  if (fs.existsSync(DIST)) {
    fs.rmSync(DIST, { recursive: true, force: true });
  }
  fs.mkdirSync(DIST, { recursive: true });

  // Static assets
  copyTree(STATIC, DIST);
  copyTree(ADMIN, path.join(DIST, 'admin'));

  // Pages
  pages.forEach(function (page) {
    var depth = 0;
    var main = [];

    if (page.meta.hero === true || page.meta.hero === 'true') {
      main.push(heroMarkup(site));
    }

    var body = markdown.render(page.body);

    body = body.replace(/<p>\[\[alltopics\]\]<\/p>/g, function () {
      return '<ul class="topic-list">\n' + topicListMarkup(topics, depth) + '\n    </ul>';
    });

    body = body.replace(/<p>\[\[featured\]\]<\/p>/g, function () {
      var featured = topics.filter(function (topic) {
        return topic.featured;
      });
      if (!featured.length) featured = topics.slice(0, 4);
      return '<ul class="topic-list">\n' + topicListMarkup(featured, depth) + '\n    </ul>';
    });

    main.push(body);

    var html = layout({
      site: site,
      navPages: navPages,
      depth: depth,
      currentSlug: page.slug,
      title: page.meta.title,
      description: page.meta.description,
      main: main.join('\n')
    });

    html = resolveLinks(html, pages, topics, depth, site);

    var outputName = page.slug === 'home' ? 'index.html' : page.slug + '.html';
    fs.writeFileSync(path.join(DIST, outputName), html);
  });

  // Topic articles
  topics.forEach(function (topic) {
    var depth = 2;
    var main = [];

    main.push('    <p class="crumbs"><a href="' + pageHref('home', depth) + '">Home</a> / <a href="' + pageHref('lists', depth) + '">Lists</a> / <span>' + escapeHtml(topic.navTitle) + '</span></p>');
    main.push('');
    main.push('    <article id="topic">');
    main.push('      <h1>' + escapeHtml(topic.title) + '</h1>');
    main.push('      <p class="lede">' + escapeHtml(topic.lead) + '</p>');
    main.push('');
    main.push('      <h2>The claim</h2>');
    main.push('      <p>' + escapeHtml(topic.claim) + '</p>');
    main.push('');
    main.push('      <h2>Alternatives</h2>');
    main.push('      <p>' + escapeHtml(topic.alternatives) + '</p>');
    main.push('');
    main.push('      <h2>Who is responsible?</h2>');
    main.push('      <p>' + escapeHtml(topic.responsible) + '</p>');
    main.push('');
    main.push('      <h2>What we need them to do</h2>');
    main.push('      <p>' + escapeHtml(topic.demand) + '</p>');
    main.push('');
    main.push('      <h2>Have they done it yet?</h2>');
    main.push('      <p>' + escapeHtml(topic.status) + '</p>');

    if (topic.extra) {
      main.push('');
      main.push('      ' + markdown.render(topic.extra).replace(/\n/g, '\n      '));
    }

    main.push('');
    main.push('      <div class="note">');
    main.push('        <p><strong>Where to check this yourself</strong></p>');
    main.push('        <p>Sources: ' + escapeHtml(topic.sources) + '</p>');
    main.push('        <p>' + escapeHtml(topic.advice) + '</p>');
    main.push('      </div>');
    main.push('');
    main.push('      <div class="button-row">');
    main.push('        <a class="button secondary" href="' + pageHref('lists', depth) + '">Back to the lists</a>');
    main.push('        <a class="button" href="' + pageHref('contact', depth) + '">Send us what you know</a>');
    main.push('      </div>');
    main.push('    </article>');

    var html = layout({
      site: site,
      navPages: navPages,
      depth: depth,
      currentSlug: null,
      title: topic.title,
      description: topic.blurb,
      main: main.join('\n')
    });

    html = resolveLinks(html, pages, topics, depth, site);

    var dir = path.join(DIST, 'topics', topic.slug);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), html);
  });

  // Data file for anything that wants the topic list in JavaScript
  fs.writeFileSync(
    path.join(DIST, 'topics.js'),
    'window.TOPICS = ' + JSON.stringify(topics, null, 2) + ';\n'
  );

  report();
  return problems.length === 0;
}

function resolveLinks(html, pages, topics, depth, site) {
  var bySlug = {};
  pages.forEach(function (page) { bySlug[page.slug] = page; });
  var topicBySlug = {};
  topics.forEach(function (topic) { topicBySlug[topic.slug] = topic; });

  html = html.replace(/href="page:([^"]+)"/g, function (_, slug) {
    if (!bySlug[slug]) {
      warn('Link to unknown page: ' + slug);
      return '#';
    }
    return 'href="' + pageHref(slug, depth) + '"';
  });

  html = html.replace(/href="topic:([^"]+)"/g, function (_, slug) {
    if (!topicBySlug[slug]) {
      warn('Link to unknown topic: ' + slug);
      return '#';
    }
    return 'href="' + topicHref(slug, depth) + '"';
  });

  html = html.replace(/\[\[email\]\]/g,
    '<a href="mailto:' + escapeHtml(site.email) + '">' + escapeHtml(site.email) + '</a>');

  html = html.replace(/\[\[year\]\]/g, String(site.year));

  return html;
}

function copyTree(from, to) {
  if (!fs.existsSync(from)) return;

  fs.mkdirSync(to, { recursive: true });

  fs.readdirSync(from).forEach(function (entry) {
    var source = path.join(from, entry);
    var target = path.join(to, entry);

    if (fs.statSync(source).isDirectory()) {
      copyTree(source, target);
    } else {
      fs.copyFileSync(source, target);
    }
  });
}

function report() {
  if (problems.length) {
    console.log('');
    problems.forEach(function (problem) { console.log('  x ' + problem); });
    console.log('');
    console.log('Build stopped. ' + problems.length + ' problem(s) found.');
    console.log('');
    console.log('Fix the files listed above and run the build again.');
    console.log('');
  } else {
    console.log('');
    console.log('  Built the site into dist/');
    console.log('');
  }
}

if (require.main === module) {
  var ok = build();
  process.exit(ok ? 0 : 1);
}

module.exports = { build: build };
