'use strict';

/*
 * Checks the content files without writing the site.
 *
 *   npm run check
 *
 * Useful before you push anything to GitHub.
 */

var fs = require('fs');
var path = require('path');
var yaml = require('./yaml.js');

var ROOT = path.resolve(__dirname, '..');
var CONTENT = path.join(ROOT, 'content');

var problems = [];

function fail(message) { problems.push(message); }

var TOPIC_FIELDS = [
  'title', 'blurb', 'lead', 'claim', 'alternatives',
  'responsible', 'demand', 'status', 'sources', 'advice'
];

var PAGE_FIELDS = ['title'];

function checkDir(dirName, fields) {
  var dir = path.join(CONTENT, dirName);

  if (!fs.existsSync(dir)) {
    fail('No ' + dirName + ' found in content/' + dirName);
    return;
  }

  var files = fs.readdirSync(dir).filter(function (file) {
    return /\.md$/i.test(file);
  });

  if (!files.length) {
    fail('No ' + dirName + ' found in content/' + dirName);
    return;
  }

  console.log('');
  console.log('  ' + dirName + ': ' + files.length + ' file(s)');

  files.forEach(function (file) {
    var raw = fs.readFileSync(path.join(dir, file), 'utf8');
    var parsed = yaml.parseFrontMatter(raw);
    var relative = 'content/' + dirName + '/' + file;

    fields.forEach(function (field) {
      var value = parsed.data[field];
      if (value === undefined || value === null || String(value).trim() === '') {
        fail(relative + " is missing '" + field + "'");
      }
    });

    if (dirName === 'pages' && !parsed.body.trim()) {
      fail(relative + ' has no content');
    }

    if (dirName === 'pages' && parsed.data.nav && !parsed.data.navLabel) {
      console.log('  note: ' + relative + ' is in the menu but has no navLabel');
    }
  });
}

if (!fs.existsSync(path.join(CONTENT, 'site.json'))) {
  fail('content/site.json is missing');
} else {
  try {
    JSON.parse(fs.readFileSync(path.join(CONTENT, 'site.json'), 'utf8'));
    console.log('');
    console.log('  site.json: ok');
  } catch (error) {
    fail('content/site.json is not valid JSON - ' + error.message);
  }
}

checkDir('pages', PAGE_FIELDS);
checkDir('topics', TOPIC_FIELDS);

if (problems.length) {
  console.log('');
  problems.forEach(function (problem) { console.log('  x ' + problem); });
  console.log('');
  console.log('  ' + problems.length + ' problem(s) found.');
  console.log('');
  process.exit(1);
}

console.log('');
console.log('  Everything looks fine.');
console.log('');
