import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command, mode }) => ({
  plugins: [react({
    babel: command === 'serve' && mode !== 'production'
      ? { plugins: [['module:@locator/babel-jsx', { env: 'development' }]] }
      : undefined,
  })],
  server: { host: '127.0.0.1' },
}));
