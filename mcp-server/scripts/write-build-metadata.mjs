import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const packageRoot = new URL('../', import.meta.url);
const packagePath = new URL('../package.json', import.meta.url);
const outputPath = new URL('../dist/server-metadata.json', import.meta.url);
const packageMetadata = JSON.parse(readFileSync(packagePath, 'utf8'));
const requiredFields = ['name', 'version'];
const fallbackDescription = 'MCP server for the enclosing 5etools data repository.';

for (const field of requiredFields) {
  if (typeof packageMetadata[field] !== 'string' || packageMetadata[field].length === 0) {
    throw new Error(`Package metadata field ${field} must be a non-empty string`);
  }
}

if (packageMetadata.description !== undefined && typeof packageMetadata.description !== 'string') {
  throw new Error('Package metadata field description must be a string when present');
}

const gitCommit = execFileSync('git', ['rev-parse', 'HEAD'], {
  cwd: fileURLToPath(packageRoot),
  encoding: 'utf8',
}).trim();
const gitStatus = execFileSync('git', ['status', '--porcelain', '--untracked-files=all'], {
  cwd: fileURLToPath(packageRoot),
  encoding: 'utf8',
});

if (gitCommit.length === 0) throw new Error('The running git commit hash could not be determined');

const description = packageMetadata.description ?? fallbackDescription;

writeFileSync(
  outputPath,
  `${JSON.stringify({
    name: packageMetadata.name,
    version: packageMetadata.version,
    description,
    gitCommit,
    gitDirty: gitStatus.length > 0,
  })}\n`,
);
