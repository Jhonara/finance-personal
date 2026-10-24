import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      'react-native-keyboard-controller': fileURLToPath(
        new URL('./src/test/keyboard-controller.tsx', import.meta.url),
      ),
      'expo-system-ui': fileURLToPath(new URL('./src/test/system-ui.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
