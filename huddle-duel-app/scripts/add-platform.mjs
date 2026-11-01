// Creates the native project (ios/ or android/) the first time it is needed.
import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

const platform = process.argv[2];
if (!['ios', 'android'].includes(platform)) { console.error('Usage: add-platform.mjs ios|android'); process.exit(1); }
if (existsSync(platform)) console.log(`${platform}/ already exists.`);
else execSync(`npx cap add ${platform}`, { stdio: 'inherit' });
