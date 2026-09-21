import os from 'node:os';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { lockfileHelp, missingDependencies, nextCommands, nodeInstallHelp, npmCommand, projectRoot, supportedNodeRange, supportsNode } from './environment.mjs';

let problems = 0;
function report(ok, message) {
  console.log(`${ok ? 'OK' : 'FIX'}  ${message}`);
  if (!ok) problems += 1;
}

console.log(`System: ${os.platform()} ${os.release()} (${os.arch()})`);
console.log(`Project: ${projectRoot}\n`);
const nodeSupported = supportsNode();
report(nodeSupported, `Node ${process.versions.node}. Supported ${supportedNodeRange}; Node 24 LTS recommended for new installations.`);
if (!nodeSupported) console.log(nodeInstallHelp());

// Check npm only after the Node requirement passes, to avoid secondary errors.
if (nodeSupported) {
  try {
    const [node, npm] = npmCommand();
    const result = spawnSync(node, [npm, '--version'], { encoding: 'utf8', timeout: 10_000 });
    report(result.status === 0, result.status === 0
      ? `npm ${result.stdout.trim()}`
      : `npm could not run: ${result.error?.message || result.stderr?.trim() || 'no version returned'}.\n${nodeInstallHelp()}`);
  } catch (error) {
    report(false, error.message);
  }
}

const hasLockfile = existsSync(path.join(projectRoot, 'package-lock.json'));
report(hasLockfile, hasLockfile ? 'Dependency lockfile: package-lock.json' : `package-lock.json is missing.\n${lockfileHelp}`);
const missing = missingDependencies();
report(missing.length === 0, missing.length
  ? `Missing dependencies: ${missing.join(', ')}. After resolving any Node or lockfile issue above, run:\n${nextCommands}`
  : 'Core dependencies are installed.');

if (problems === 0) {
  try {
    const { checkFrontend } = await import('./check-frontend.mjs');
    const count = await checkFrontend();
    report(true, `Frontend development compilation: ${count} source files.`);
  } catch (error) {
    report(false, `Frontend compilation failed: ${error.message}\nCheck the file shown above. After an edit, undo it and save; after an installation issue, run npm run setup. Then run npm run doctor again.`);
  }
}

console.log(problems ? `\n${problems} check(s) need attention. Follow the steps above, then run npm run doctor again.` : '\nEnvironment checks passed. Run npm start and check the CUI in your browser.');
process.exitCode = problems ? 1 : 0;
