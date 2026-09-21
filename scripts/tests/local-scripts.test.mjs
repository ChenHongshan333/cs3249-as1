import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { minimumNode, nodeInstallHelp, projectRoot, supportsNode } from '../environment.mjs';

function setupFixture(t, minimum = '>=0.0.0') {
  const directory = mkdtempSync(path.join(os.tmpdir(), 'cui-setup-test-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  mkdirSync(path.join(directory, 'scripts'));
  for (const file of ['environment.mjs', 'setup.mjs']) {
    copyFileSync(path.join(projectRoot, 'scripts', file), path.join(directory, 'scripts', file));
  }
  writeFileSync(path.join(directory, 'package.json'), JSON.stringify({ engines: { node: minimum } }));
  return directory;
}

function runSetup(directory, extraEnvironment = {}) {
  return spawnSync(process.execPath, ['scripts/setup.mjs'], {
    cwd: directory,
    env: { ...process.env, ...extraEnvironment },
    encoding: 'utf8',
    timeout: 10_000,
  });
}

test('Node compatibility accepts the declared minimum and newer versions', () => {
  const [major, minor, patch] = minimumNode.split('.').map(Number);
  const justBelow = patch > 0 ? `${major}.${minor}.${patch - 1}`
    : minor > 0 ? `${major}.${minor - 1}.999` : `${major - 1}.999.999`;
  assert.equal(supportsNode(justBelow), false);
  assert.equal(supportsNode(minimumNode), true);
  assert.equal(supportsNode('19.0.0'), false);
  assert.equal(supportsNode('20.0.0'), true);
  assert.equal(supportsNode('21.0.0'), false);
  assert.equal(supportsNode('22.0.0'), true);
  assert.equal(supportsNode('24.0.0'), true);
  assert.equal(supportsNode('26.0.0'), true);
  assert.equal(supportsNode('unknown'), false);
});

test('installation help gives platform-specific commands and verification steps', () => {
  const windows = nodeInstallHelp('win32');
  assert.match(windows, /Start-Process "https:\/\/nodejs.org\/en\/download"/);
  assert.match(windows, /winget upgrade --id OpenJS.NodeJS.LTS --exact --source winget/);
  assert.doesNotMatch(windows, /nvm install/);
  for (const platform of ['darwin', 'linux']) {
    const help = nodeInstallHelp(platform);
    assert.match(help, /nvm install 24\n  nvm use 24/);
    assert.doesNotMatch(help, /winget/);
  }
  assert.match(nodeInstallHelp('darwin'), /open "https:\/\/nodejs.org\/en\/download"/);
  for (const platform of ['win32', 'darwin', 'linux']) {
    const help = nodeInstallHelp(platform);
    assert.match(help, /node -v\n  npm -v/);
    assert.match(help, /npm run setup\n  npm run doctor\n  npm start/);
  }
});

test('setup rejects an unsupported Node version before installing anything', (t) => {
  const directory = setupFixture(t, '>=999.0.0');
  const result = runSetup(directory);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /is not supported. Required: >=999.0.0/);
  assert.match(result.stderr, /node -v/);
  assert.doesNotMatch(result.stdout, /Installing/);
});

test('setup explains a missing lockfile without regenerating it', (t) => {
  const directory = setupFixture(t);
  const result = runSetup(directory);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /package-lock.json is missing/);
  assert.match(result.stderr, /original download/);
  assert.match(result.stderr, /npm run setup/);
  assert.doesNotMatch(result.stdout, /Installing/);
});

test('setup preserves an npm failure and gives network recovery without a Node upgrade', (t) => {
  const directory = setupFixture(t);
  writeFileSync(path.join(directory, 'package-lock.json'), '{}');
  const fakeNpm = path.join(directory, 'fake-npm.mjs');
  writeFileSync(fakeNpm, "console.error('npm error ENOTFOUND registry.example.invalid'); process.exit(7);");
  const result = runSetup(directory, { npm_execpath: fakeNpm });
  assert.equal(result.status, 7);
  assert.match(result.stderr, /ENOTFOUND registry.example.invalid/);
  assert.match(result.stderr, /npm ping/);
  assert.match(result.stderr, /npm run setup/);
  assert.doesNotMatch(result.stderr, /nvm install|winget upgrade|not supported/);
});
