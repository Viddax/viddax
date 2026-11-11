/* eslint-disable @typescript-eslint/no-require-imports */
const { mkdirSync } = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'build', 'viddax-setup-ui.exe');
const compiler = path.join(process.env.WINDIR, 'Microsoft.NET', 'Framework64', 'v4.0.30319', 'csc.exe');

mkdirSync(path.dirname(output), { recursive: true });
execFileSync(compiler, [
  '/nologo', '/target:winexe', '/optimize+', '/out:' + output,
  '/reference:System.Windows.Forms.dll', '/reference:System.Drawing.dll',
  '/resource:' + path.join(__dirname, 'wordmark.png') + ',ViddaxWordmark',
  path.join(__dirname, 'SetupWindow.cs'),
], { stdio: 'inherit' });
