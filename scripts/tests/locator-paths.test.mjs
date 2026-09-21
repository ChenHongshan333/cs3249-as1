import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import { transformSync, transformFromAstSync, types } from '@babel/core';
import locatorModule from '@locator/babel-jsx';
import { projectRoot } from '../environment.mjs';

const require = createRequire(import.meta.url);
const locator = locatorModule.default ?? locatorModule;
const drive = 'C:' + String.fromCharCode(92);
const unicodeFolder = String.fromCodePoint(0x8bfe, 0x7a0b);
const windows = (...parts) => path.win32.join(drive, ...parts);
const cases = [
  ['Windows Unicode escape prefix', windows('Users', 'Beryl2', 'Downloads', 'cui-frontend-starter', 'src', 'usePreconsultation.ts')],
  ['Windows newline and tab escape prefixes', windows('new', 'test', 'form', 'src', 'App.tsx')],
  ['Windows spaces and Unicode', windows('Users', 'Student Name', unicodeFolder, 'src', 'App.tsx')],
  ['Windows apostrophe', windows('Users', "Student's folder", 'src', 'App.tsx')],
  ['Windows network share', path.win32.join(String.fromCharCode(92).repeat(2) + 'classroom', 'shared', 'src', 'App.tsx')],
  ['macOS path', '/Users/Student/project/src/App.tsx'],
  ['macOS quotes and spaces', '/Users/Student/project "demo"/src/App.tsx'],
  ['macOS Unicode', `/Users/Student/${unicodeFolder}/src/App.tsx`],
];

for (const [label, filename] of cases) {
  test(`Locator preserves the source location: ${label}`, () => {
    const absoluteFilename = path.resolve(filename);
    const { ast, options } = transformSync('function Example() {\n  return <button>Continue</button>;\n}', {
      filename: absoluteFilename, cwd: path.dirname(absoluteFilename),
      configFile: false, babelrc: false, ast: true, code: false,
      plugins: [locator], parserOpts: { plugins: ['jsx', 'typescript'] },
    });

    // Execute only Locator's generated registration, not the JSX component.
    const registration = types.file(types.program([ast.program.body.at(-1)]));
    const { code } = transformFromAstSync(registration, undefined, { configFile: false, babelrc: false });
    const window = {};
    runInNewContext(code, { window });

    // Babel resolves filenames using the host OS. Windows-style separators
    // still exercise escaping when these tests run on macOS or Linux.
    const expected = options.filename;
    assert.deepEqual(Object.keys(window.__LOCATOR_DATA__), [expected]);
    const record = window.__LOCATOR_DATA__[expected];
    assert.equal(record.projectPath + record.filePath, expected);
    assert.equal(record.expressions[0].loc.start.line, 2);

    let attribute;
    types.traverseFast(ast, (node) => {
      if (types.isJSXAttribute(node) && node.name.name === 'data-locatorjs-id') attribute = node.value.expression.value;
    });
    assert.equal(attribute, `${expected}::0`);
  });
}

test('Locator registration also compiles in a TypeScript file without JSX', () => {
  assert.doesNotThrow(() => transformSync('export const value: number = 1;', {
    filename: windows('Users', 'Student', 'src', 'usePreconsultation.ts'),
    configFile: false, babelrc: false, plugins: [locator], parserOpts: { plugins: ['typescript'] },
  }));
});

test('the installation patch can run repeatedly', () => {
  const filename = require.resolve('@locator/babel-jsx');
  const before = readFileSync(filename, 'utf8');
  const result = spawnSync(process.execPath, ['scripts/patch-locator.mjs'], { cwd: projectRoot, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(readFileSync(filename, 'utf8'), before);
});
