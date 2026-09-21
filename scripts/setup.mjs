import { existsSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { checkNode, lockfileHelp, npmCommand, projectRoot } from './environment.mjs';

try {
  checkNode();
  if (!existsSync(path.join(projectRoot, 'package-lock.json'))) {
    throw new Error(`package-lock.json is missing.\n${lockfileHelp}`);
  }

  const [node, npm] = npmCommand();
  console.log('Installing the versions in package-lock.json. Internet access is needed for this first setup.');
  const result = spawnSync(node, [npm, 'ci', '--no-audit', '--no-fund'], {
    cwd: projectRoot,
    stdio: 'inherit',
  });
  if (result.error) {
    throw new Error(`Could not launch npm: ${result.error.message}\nCheck Node and npm, then retry:\n  node -v\n  npm -v\n  npm run setup`);
  }
  if (result.status !== 0) {
    console.error([
      '\nSetup did not finish. Use the npm error above to choose the next step:',
      '- Connection errors (ENOTFOUND, ETIMEDOUT): reconnect, then run npm ping.',
      '- Permission errors (EACCES, EPERM): close the running preview and extract the package into a folder you can edit, such as Documents.',
      '- Lockfile errors: restore package-lock.json from the original download. Keep your edited source files.',
      'After fixing the reported problem, run:',
      '  npm run setup',
      '  npm run doctor',
      'If it still fails, share the npm error and doctor output with your tutor.',
    ].join('\n'));
    process.exitCode = result.status ?? 1;
  } else {
    console.log('\nInstalled. Check the environment, then start the CUI:\n  npm run doctor\n  npm start');
  }
} catch (error) {
  console.error(`Setup failed: ${error.message}`);
  process.exitCode = 1;
}
