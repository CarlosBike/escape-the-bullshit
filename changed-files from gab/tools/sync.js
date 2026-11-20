'use strict';

/*
 * Pulls the latest changes from GitHub and rebuilds.
 *
 *   npm run sync
 *
 * Use this after saving something in the editing screen, because the
 * editing screen saves to GitHub and your local folder needs to catch up.
 */

var execSync = require('child_process').execSync;
var path = require('path');
var build = require('./build.js');

var ROOT = path.resolve(__dirname, '..');

try {
  console.log('');
  console.log('  Pulling latest changes from GitHub...');
  execSync('git pull', { cwd: ROOT, stdio: 'inherit' });
} catch (error) {
  console.log('');
  console.log('  Could not pull (that is fine if you have not set up Git yet).');
  console.log('  Continuing with the files already on this computer.');
  console.log('');
}

process.exit(build.build() ? 0 : 1);
