import { mkdir, access, realpath } from 'node:fs/promises';
import { basename, dirname, isAbsolute, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startPortfolio } from './portfolio.js';

async function main() {
  const rawOrigin = process.env.SORRISYNC_DEMO_ORIGIN;
  const publicOrigin = rawOrigin ? new URL(rawOrigin) : null;
  if (publicOrigin && (publicOrigin.protocol !== 'https:' || publicOrigin.origin !== rawOrigin)) {
    throw new Error('SORRISYNC_DEMO_ORIGIN must be an HTTPS origin without a path or trailing slash.');
  }

  const port = Number(process.env.PORT || process.argv[2] || (publicOrigin ? 3000 : 4177));
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('Choose a port between 1 and 65535.');
  }

  const appRoot = fileURLToPath(new URL('../', import.meta.url));
  const webRoot = join(appRoot, 'dist-integrated');
  await access(join(webRoot, 'index.html')).catch(() => {
    throw new Error('Build the portfolio first with npm run build.');
  });

  const configuredDataDirectory = process.env.SORRISYNC_DEMO_DATA_DIR;
  if (publicOrigin && !isAbsolute(configuredDataDirectory ?? '')) {
    throw new Error('Set SORRISYNC_DEMO_DATA_DIR to an absolute persistent path outside the app release.');
  }
  const dataDirectory = configuredDataDirectory || join(appRoot, '.demo-data');
  if (publicOrigin) {
    const application = await realpath(appRoot);
    const parent = await realpath(dirname(dataDirectory));
    const provisionedDirectory = await realpath(dataDirectory).catch(error => {
      if (error.code !== 'ENOENT') throw error;
      return join(parent, basename(dataDirectory));
    });
    const fromApplication = relative(application, provisionedDirectory);
    if (!fromApplication.startsWith('..' + sep) && !isAbsolute(fromApplication)) {
      throw new Error('The hosted database must be outside the application release directory.');
    }
  }
  await mkdir(dataDirectory, { recursive: true });
  const demo = await startPortfolio({
    filename: join(dataDirectory, 'portfolio.sqlite'),
    webRoot,
    port,
    publicOrigin,
  });
  console.log('SorriSync Portfolio at ' + demo.origin);
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.once(signal, () => void demo.close());
  }
}

void main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
