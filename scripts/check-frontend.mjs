import { readdirSync } from 'node:fs';
import path from 'node:path';
import { projectRoot } from './environment.mjs';

function sourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(filename);
    return /\.(tsx?|css)$/.test(entry.name) ? [filename] : [];
  });
}

export async function checkFrontend() {
  const { createServer } = await import('vite');
  const server = await createServer({
    root: projectRoot,
    mode: 'development',
    logLevel: 'silent',
    server: { middlewareMode: true, hmr: false, watch: null },
    optimizeDeps: { noDiscovery: true, include: [] },
  });
  try {
    const files = sourceFiles(path.join(projectRoot, 'src'));
    for (const filename of files) {
      const url = '/' + path.relative(projectRoot, filename).split(path.sep).map(encodeURIComponent).join('/');
      await server.transformRequest(url);
    }
    return files.length;
  } finally {
    await server.close();
  }
}
