import { mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const source = process.env.OPENAPI_URL ?? 'http://localhost:8080/v3/api-docs';
const output = process.env.OPENAPI_OUTPUT ?? 'src/api/generated/schema.ts';
const toolingRequire = createRequire(new URL('./openapi/package.json', import.meta.url));
const cli = join(dirname(toolingRequire.resolve('openapi-typescript/package.json')), 'bin/cli.js');
mkdirSync(dirname(output), { recursive: true });
const result = spawnSync(process.execPath, [cli, source, '-o', output], {
  stdio: 'inherit',
});
process.exit(result.status ?? 1);
