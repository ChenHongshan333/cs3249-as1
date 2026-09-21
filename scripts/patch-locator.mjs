import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

try {
  const filename = require.resolve('@locator/babel-jsx');
  const { version } = require('@locator/babel-jsx/package.json');
  const source = readFileSync(filename, 'utf8');

  // Locator 0.5.1 interpolates a raw path into JavaScript. Serialize the key
  // so backslashes and quotes keep their meaning on Windows and macOS.
  const original = 'window.__LOCATOR_DATA__["${createFullPath(fileStorage)}"] = ${dataCode};';
  const fixed = 'window.__LOCATOR_DATA__[${JSON.stringify(createFullPath(fileStorage))}] = ${dataCode};';

  if (version !== '0.5.1' || (!source.includes(fixed) && source.split(original).length !== 2)) {
    throw new Error('Expected the pinned Locator 0.5.1 code. Restore package.json and package-lock.json from the download, then run npm run setup.');
  }
  if (!source.includes(fixed)) writeFileSync(filename, source.replace(original, fixed));
  console.log('Locator path compatibility patch is ready.');
} catch (error) {
  console.error(`Locator setup failed: ${error.message}`);
  process.exitCode = 1;
}
