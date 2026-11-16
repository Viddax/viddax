/* eslint-disable @typescript-eslint/no-require-imports */
const path = require('node:path');

module.exports = async ({ electronPlatformName, packager }) => {
  if (electronPlatformName !== 'win32' || !(process.env.WIN_CSC_LINK || process.env.CSC_LINK)) return;
  const helper = path.resolve(__dirname, '../build/viddax-setup-ui.exe');
  if (!(await packager.signIf(helper))) throw new Error('Failed to sign the Viddax setup interface.');
};
