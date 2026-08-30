import { mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const source = process.env.OPENAPI_URL ?? 'http://localhost:8080/v3/api-docs';
mkdirSync('src/api/generated', { recursive: true });
const result = spawnSync('npx', ['openapi-typescript', source, '-o', 'src/api/generated/schema.ts'], {
  shell: true,
  stdio: 'inherit',
});
process.exit(result.status ?? 1);
