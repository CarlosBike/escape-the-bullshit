'use strict';

/*
 * Checks whether GitHub can see the repository the same way the editing
 * screen (Sveltia) sees it.
 *
 *   $env:GITHUB_TOKEN = Read-Host "Paste your token"
 *   npm run check:github
 *
 * It reads owner, repo and branch out of admin/config.yml, then makes five
 * labelled requests to the GitHub API and prints what came back. Nothing is
 * changed on GitHub. The token is only used for these requests and is never
 * written to disk.
 */

var fs = require('fs');
var path = require('path');

var ROOT = path.resolve(__dirname, '..');
var CONFIG = path.join(ROOT, 'admin', 'config.yml');
var API = 'https://api.github.com';

function readConfig() {
  var text = fs.readFileSync(CONFIG, 'utf8');

  var owner = 'CarlosBike';
  var repo = 'escape-the-bullshit';
  var branch = 'main';

  var repoMatch = /^[ \t]*repo:[ \t]*(.+)$/m.exec(text);
  if (repoMatch) {
    var value = repoMatch[1].trim().replace(/^["']|["']$/g, '');
    var parts = value.split('/');
    if (parts.length >= 2) {
      owner = parts[0];
      repo = parts[1];
    }
  }

  var branchMatch = /^[ \t]*branch:[ \t]*(.+)$/m.exec(text);
  if (branchMatch) {
    branch = branchMatch[1].trim().replace(/^["']|["']$/g, '');
  }

  var baseMatch = /^[ \t]*base_url:/m.exec(text);

  return {
    owner: owner,
    repo: repo,
    branch: branch,
    hasBaseUrl: !!baseMatch
  };
}

function headers(token) {
  var h = {
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'escape-the-bullshit-check'
  };
  if (token) h['Authorization'] = 'Bearer ' + token;
  return h;
}

function request(url, token) {
  return fetch(url, { headers: headers(token) }).then(function (response) {
    return response.text().then(function (text) {
      var body = null;
      try { body = JSON.parse(text); } catch (e) { body = null; }
      return { status: response.status, body: body, url: url };
    });
  });
}

function label(text) {
  console.log('');
  console.log('  ' + text);
  console.log('  ' + '-'.repeat(text.length));
}

function result(name, res) {
  console.log('    ' + name + '  ->  HTTP ' + res.status);
  return res;
}

function explain(res, body) {
  if (body && body.message) console.log('    message: ' + body.message);
}

function main() {
  var token = process.env.GITHUB_TOKEN || '';
  var config = readConfig();
  var full = config.owner + '/' + config.repo;

  console.log('');
  console.log('  Checking GitHub access');
  console.log('');
  console.log('  Reading from admin/config.yml:');
  console.log('    repo:   ' + full);
  console.log('    branch: ' + config.branch);
  console.log('    token:  ' + (token ? 'present (' + token.length + ' characters)' : 'NOT SET'));
  if (config.hasBaseUrl) {
    console.log('');
    console.log('    NOTE: admin/config.yml still has a base_url line.');
    console.log('    That option is for GitHub Enterprise. On github.com it can');
    console.log('    make the editing screen ask for the wrong address.');
  }

  if (!token) {
    console.log('');
    console.log('  No token set, so these results are anonymous.');
    console.log('  A private repository will look as if it does not exist.');
    console.log('  Set one and run again:');
    console.log('    $env:GITHUB_TOKEN = Read-Host "Paste your token"');
    console.log('');
  }

  return request(API + '/user', token).then(function (res) {
    label('1. Token');
    result('GET /user', res);
    if (res.status === 200 && res.body) {
      console.log('    signed in as: ' + res.body.login);
    } else {
      explain(res, res.body);
      if (res.status === 401) {
        console.log('    The token was rejected. It may have been revoked, or it');
        console.log('    may have expired.');
      }
    }
    return request(API + '/repos/' + full, token);
  }).then(function (res) {
    label('2. Repository');
    result('GET /repos/' + full, res);
    if (res.status === 200 && res.body) {
      console.log('    visibility:      ' + (res.body.private ? 'private' : 'public'));
      console.log('    default branch: ' + res.body.default_branch);
      console.log('    full name:      ' + res.body.full_name);
    } else {
      explain(res, res.body);
      if (res.status === 404) {
        console.log('');
        console.log('    GitHub returns 404, not 403, for a private repository');
        console.log('    that this token cannot see. So a 404 here means one of:');
        console.log('      - the repository is private and the token cannot read it');
        console.log('      - the owner or repository name is wrong');
      }
    }
    return request(API + '/repos/' + full + '/branches/' + encodeURIComponent(config.branch), token);
  }).then(function (res) {
    label('3. Branch');
    result('GET /branches/' + config.branch, res);
    if (res.status === 200) {
      console.log('    the branch exists');
    } else {
      explain(res, res.body);
      if (res.status === 404) {
        console.log('    The branch name in admin/config.yml does not exist.');
        console.log('    Check the default branch shown in step 2.');
      }
    }
    return request(API + '/repos/' + full + '/contents?ref=' + encodeURIComponent(config.branch), token);
  }).then(function (res) {
    label('4. Top level of the repository');
    result('GET /contents', res);
    if (res.status === 200 && Array.isArray(res.body)) {
      res.body.forEach(function (entry) {
        console.log('    ' + (entry.type === 'dir' ? '[dir]  ' : '[file] ') + entry.name);
      });
      var names = res.body.map(function (entry) { return entry.name; });
      var wanted = ['admin', 'content', 'static', 'tools'];
      var missing = wanted.filter(function (name) {
        return names.indexOf(name) === -1;
      });
      if (missing.length) {
        console.log('');
        console.log('    Missing at the top level: ' + missing.join(', '));
        console.log('    The project folders are not sitting at the repository root.');
      } else {
        console.log('');
        console.log('    All the project folders are at the root. Good.');
      }
    } else {
      explain(res, res.body);
    }
    return request(API + '/repos/' + full + '/contents/content?ref=' + encodeURIComponent(config.branch), token);
  }).then(function (res) {
    label('5. The content folder');
    result('GET /contents/content', res);
    if (res.status === 200) {
      console.log('    GitHub can see content/ on that branch.');
    } else {
      explain(res, res.body);
      if (res.status === 404) {
        console.log('    GitHub cannot see content/ at the root of that branch.');
        console.log('    This is what the editing screen asks for, so it explains');
        console.log('    the "404 Not Found" it was showing.');
      }
    }
    console.log('');
    console.log('  Done.');
    console.log('');
  });
}

main().catch(function (error) {
  console.log('');
  console.log('  x The check could not finish: ' + error.message);
  console.log('');
  console.log('  If the message mentions the network, ENOTFOUND or ECONNREFUSED,');
  console.log('  this computer cannot reach api.github.com right now.');
  console.log('');
});
