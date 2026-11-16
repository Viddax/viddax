/* eslint-disable @typescript-eslint/no-require-imports */
const { app } = require('electron');
const { NsisUpdater } = require('electron-updater');
const { ElectronAppAdapter } = require('electron-updater/out/ElectronAppAdapter');
const { ElectronHttpExecutor } = require('electron-updater/out/electronHttpExecutor');
const { createServer } = require('node:http');
const { createReadStream, statSync } = require('node:fs');
const { writeFile } = require('node:fs/promises');
const path = require('node:path');
const { createUpdateController } = require('../electron/app_updates');

const [candidate, installedVersion, installation, scratch] = process.argv.slice(2);
const asset = path.basename(candidate);
const manifest = path.join(path.dirname(candidate), 'latest.yml');
const configPath = path.join(scratch, 'verification-update.yml');

const server = createServer((req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  const file = pathname === '/latest.yml' ? manifest : pathname === '/' + asset ? candidate : null;
  if (!file) return res.writeHead(404).end();
  res.writeHead(200, { 'Content-Length': statSync(file).size });
  createReadStream(file).pipe(res);
});

async function verify() {
  await app.whenReady();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const url = 'http://127.0.0.1:' + server.address().port;
  await writeFile(configPath, `provider: generic\nurl: ${url}\nupdaterCacheDirName: verification-cache\n`);
  const adapter = new class extends ElectronAppAdapter {
    get version() { return installedVersion; }
    get baseCachePath() { return scratch; }
    get appUpdateConfigPath() { return configPath; }
  }();
  const updater = new NsisUpdater(undefined, adapter);
  updater.httpExecutor = new ElectronHttpExecutor();
  updater.setFeedURL({ provider: 'generic', url });
  updater.forceDevUpdateConfig = true;
  updater.disableDifferentialDownload = true;
  updater.installDirectory = installation;
  const quitAndInstall = updater.quitAndInstall.bind(updater);
  // The production controller requests relaunch. The verification process must exit
  // without starting the installed app so the test can inspect and uninstall it.
  updater.quitAndInstall = (silent) => quitAndInstall(silent, false);
  const controller = createUpdateController({
    updater, currentVersion: installedVersion, enabled: true, publish() {}, canRestart: () => true,
  });
  await controller.check();
  if (controller.getState().phase !== 'ready' || !controller.install()) {
    throw new Error('The updater did not stage and start the NSIS update.');
  }
  server.close();
}

app.setPath('userData', scratch);
const deadline = setTimeout(() => {
  console.error('Timed out while verifying the update.');
  app.exit(1);
}, 90000);
app.once('quit', () => clearTimeout(deadline));
verify().catch((error) => {
  console.error(error);
  app.exit(1);
});
