'use strict';

/*
 * Checks that GitHub will serve the repository to the editing screen.
 *
 *   $env:GITHUB_TOKEN = "github_pat_..."
 *   npm run check:github
 *
 * The token stays in the terminal for that run only. It is never written to
 * a file and never sent anywhere except GitHub.
 *
 * Four requests are made and each one is labelled with its status code, so
 * you can see exactly which one comes back 404. The summary at the end says
 * what to fix.
 */

var fs = require('fs');
var path = require('path');

var ROOT = path.resolve(__dirname, '..');
var API = 'https://api.github.com';

function readConfigValue(text, key) {
  var match = new RegExp('^[ \\t]*' + key + ':[ \\t]*(.+?)[ \\t]*$', 'm').exec(text);
  if (!match) return '';
  return match[1].replace(/^["']/, '').replace(/["']$/, '');
}

function readBackend() {
  var text = fs.readFileSync(path.join(ROOT, 'admin', 'config.yml'), 'utf8');
  return {
    repo: readConfigValue(text, 'repo'),
    branch: readConfigValue(text, 'branch') || 'main',
    folder: readConfigValue(text, 'folder') || 'content/topics'
  };
}

async function api(pathname, token) {
  var headers = {
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'escape-the-bullshit-check'
  };
  if (token) headers.Authorization = 'Bearer ' + token;

  var response = await fetch(API + pathname, { headers: headers });
  var raw = await response.text();
  var body;
  try {
    body = JSON.parse(raw);
  } catch (error) {
    body = raw;
  }
  return { status: response.status, body: body };
}

function messageOf(body) {
  if (!body) return '(no message)';
  if (typeof body === 'string') return body.slice(0, 200);
  if (body.message) return body.message;
  return JSON.stringify(body).slice(0, 200);
}

async function main() {
  var token = process.env.GITHUB_TOKEN || '';
  var backend = readBackend();

  console.log('');
  console.log('  Checking GitHub access for the editing screen');
  console.log('');
  console.log('  repository from admin/config.yml: ' + (backend.repo || '(not found)'));
  console.log('  branch from admin/config.yml:    ' + (backend.branch || '(not found)'));
  console.log('  content folder:                   ' + backend.folder);
  console.log('  token supplied:                   ' + (token ? 'yes' : 'no (anonymous request)'));
  console.log('');

  var who = await api('/user', token);
  console.log('1. Is the token accepted?  GET /user');
  console.log('   status: ' + who.status);
  if (who.status === 200 && who.body && who.body.login) {
    console.log('   signed in as: ' + who.body.login);
  } else {
    console.log('   message: ' + messageOf(who.body));
  }
  console.log('');

  var repo = await api('/repos/' + backend.repo, token);
  console.log('2. Can we see the repository?  GET /repos/' + backend.repo);
  console.log('   status: ' + repo.status);
  if (repo.status === 200 && repo.body) {
    console.log('   full name:      ' + repo.body.full_name);
    console.log('   default branch: ' + repo.body.default_branch);
    console.log('   private:        ' + repo.body.private);
  } else {
    console.log('   message: ' + messageOf(repo.body));
  }
  console.log('');

  var branch = await api('/repos/' + backend.repo + '/branches/' + backend.branch, token);
  console.log('3. Does the branch exist?  GET /branches/' + backend.branch);
  console.log('   status: ' + branch.status);
  if (branch.status === 200 && branch.body) {
    console.log('   branch: ' + branch.body.name);
  } else {
    console.log('   message: ' + messageOf(branch.body));
  }
  console.log('');

  var contents = await api('/repos/' + backend.repo + '/contents/' + backend.folder + '?ref=' + backend.branch, token);
  console.log('4. Can we list the content folder?  GET /contents/' + backend.folder);
  console.log('   status: ' + contents.status);
  if (contents.status === 200 && Array.isArray(contents.body)) {
    contents.body.forEach(function (item) {
      console.log('     - ' + item.name);
    });
  } else {
    console.log('   message: ' + messageOf(contents.body));
  }
  console.log('');

  console.log('  What this means');
  console.log('');

  if (who.status === 401) {
    console.log('  The token was not accepted. Either it was not copied correctly, it has');
    console.log('  expired, or it is a classic token rather than a fine-grained one.');
  } else if (who.status === 403) {
    console.log('  The token was refused. A fine-grained token must have the repository');
    console.log('  selected under "Repository access" and Contents set to Read and write.');
  }

  if (repo.status === 404) {
    console.log('  The repository could not be seen. That is one of:');
    console.log('    - the name or owner in admin/config.yml is wrong;');
    console.log('    - the repository is private and the token cannot read it');
    console.log('      (GitHub answers 404, not 403, for private repositories);');
    console.log('    - the repository does not exist.');
  } else if (repo.status === 200 && repo.body) {
    if (repo.body.default_branch !== backend.branch) {
      console.log('  The branch in admin/config.yml is "' + backend.branch + '" but the');
      console.log('  repository default branch is "' + repo.body.default_branch + '".');
      console.log('  Change the branch line in admin/config.yml to match, then rebuild.');
    }
    if (repo.body.private) {
      console.log('  The repository is private. The editing screen may not be able to read it');
      console.log('  unless the token is being used. Making it public is a valid option.');
    }
  }

  if (branch.status === 404 && repo.status === 200) {
    console.log('  The branch "' + backend.branch + '" does not exist in the repository.');
  }

  if (contents.status === 404 && repo.status === 200) {
    console.log('  The repository is visible but the folder "' + backend.folder + '" is not');
    console.log('  in it. That means the project files are not at the repository root.');
    console.log('  Check the top level of the file list on github.com for a wrapper folder.');
  }

  if (who.status === 200 && repo.status === 200 && branch.status === 200 && contents.status === 200) {
    console.log('  Everything GitHub was asked for came back with status 200.');
    console.log('  GitHub is serving the repository correctly, so the problem is on the');
    console.log('  editing screen side: it is not passing the token through.');
    console.log('  Make the repository public and sign in with the GitHub button instead.');
  }

  console.log('');
}

main().catch(function (error) {
  console.log('');
  console.log('  The check could not finish: ' + error.message);
  console.log('  If this is a network problem, the editing screen will fail the same way.');
  console.log('');
});
