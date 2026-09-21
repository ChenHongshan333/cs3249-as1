import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(import.meta.url);
const packageJson = JSON.parse(readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
// Read the supported versions from package.json before dependencies are installed.
export const supportedNodeRange = packageJson.engines.node;
export const minimumNode = supportedNodeRange.match(/\d+\.\d+\.\d+/)[0];
export const nextCommands = '  npm run setup\n  npm run doctor\n  npm start';
export const lockfileHelp = 'Restore package-lock.json from the original download, or extract the package into a new folder. Keep your edited files before replacing anything. Then, in the project folder, run:\n' + nextCommands;

export function supportsNode(version = process.versions.node) {
  if (!/^\d+\.\d+\.\d+$/.test(version)) return false;
  const current = version.split('.').map(Number);
  // This project's range uses only ^ and >= alternatives, not general semver syntax.
  return supportedNodeRange.split(' || ').some((range) => {
    const match = /^(\^|>=)(\d+)\.(\d+)\.(\d+)$/.exec(range);
    if (!match) return false;
    const minimum = match.slice(2).map(Number);
    if (match[1] === '^' && current[0] !== minimum[0]) return false;
    for (let index = 0; index < minimum.length; index += 1) {
      if (current[index] !== minimum[index]) return current[index] > minimum[index];
    }
    return true;
  });
}

export function nodeInstallHelp(platform = process.platform) {
  let install;
  if (platform === 'win32') {
    install = [
      'In PowerShell, open the official download page:',
      '  Start-Process "https://nodejs.org/en/download"',
      'Select Node 24 LTS and Windows Installer (.msi). Run it with npm included.',
      'If you already manage Node with WinGet, use:',
      '  winget upgrade --id OpenJS.NodeJS.LTS --exact --source winget',
      'If WinGet reports that this package is not installed, use the installer above.',
    ];
  } else {
    install = [
      'If nvm is already installed, run these commands in your terminal:',
      '  nvm install 24',
      '  nvm use 24',
      'Otherwise, open https://nodejs.org/en/download.',
      ...(platform === 'darwin'
        ? ['  open "https://nodejs.org/en/download"', 'Select Node 24 LTS and macOS Installer (.pkg). Run it with npm included.']
        : ['Select Node 24 LTS, your operating system, and nvm; follow the installation commands shown there.']),
    ];
  }
  return [
    ...install,
    'After using an installer, close and reopen your terminal (and your editor terminal).',
    'Check the active versions in the terminal you will use for this project:',
    '  node -v',
    '  npm -v',
    `Supported Node versions: ${supportedNodeRange}. Then open the project folder and run:`,
    nextCommands,
  ].join('\n');
}

export function checkNode() {
  if (supportsNode()) return;
  throw new Error(`Node ${process.versions.node} is not supported. Required: ${supportedNodeRange}.\n${nodeInstallHelp()}`);
}

export function npmCommand() {
  // npm provides its CLI path when this script is run with "npm run ...".
  // Running the CLI with Node avoids Windows shell and path-quoting problems.
  const candidates = [
    process.env.npm_execpath,
    path.join(path.dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js'),
    path.resolve(path.dirname(process.execPath), '../lib/node_modules/npm/bin/npm-cli.js'),
  ];
  const cli = candidates.find((candidate) => candidate && existsSync(candidate));
  if (!cli) {
    throw new Error(`Cannot locate npm for this Node installation.\nRun npm -v. If it works, run npm run setup from the project folder.\nIf npm is missing, install Node with npm included:\n${nodeInstallHelp()}`);
  }
  return [process.execPath, cli];
}

export function missingDependencies() {
  return ['vite', 'react', '@assistant-ui/react'].filter((name) => {
    try {
      const entry = require.resolve(name);
      return !entry.startsWith(path.join(projectRoot, 'node_modules') + path.sep);
    } catch {
      return true;
    }
  });
}
