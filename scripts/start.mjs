import { checkNode, missingDependencies, nextCommands, projectRoot } from './environment.mjs';

let server;
try {
  checkNode();
  const missing = missingDependencies();
  if (missing.length) throw new Error(`Dependencies are missing (${missing.join(', ')}). In the project folder, run:\n${nextCommands}`);

  const { createServer } = await import('vite');
  server = await createServer({
    root: projectRoot,
    server: {
      host: '127.0.0.1',
      port: 5173,
      strictPort: false,
      open: !process.argv.includes('--no-open'),
    },
  });
  await server.listen();
  console.log('\nCUI is running locally. Save a file to update the preview. Press Ctrl+C to stop.');
  server.printUrls();

  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.once(signal, async () => {
      await server.close();
      process.exit(0);
    });
  }
} catch (error) {
  await server?.close();
  console.error(`Cannot start: ${error.message}\nTo inspect the local environment, run:\n  npm run doctor`);
  process.exitCode = 1;
}
