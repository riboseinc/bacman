// See: https://medium.com/@TwitterArchiveEraser/notarize-electron-apps-7a5f988406db

const fs = require('fs');
const path = require('path');
var electron_notarize = require('electron-notarize');

module.exports = async function notarize(params) {
  // Only notarize the app on macOS
  if (process.platform !== 'darwin') {
    return;
  }
  console.log('afterSign hook triggered', params);
  
  if (process.env.NODE_ENV === 'development') {
    return console.warn('Skipping notarization, NODE_ENV=development');
  }

  // Use the same appId as specified in electron-builder configuration
  let appId = 'org.glossarist.isotc211';

  let appPath = path.join(
    params.appOutDir,
    `${params.packager.appInfo.productFilename}.app`
  );
  if (!fs.existsSync(appPath)) {
    throw new Error(`Cannot find application at: ${appPath}`);
  }

  console.log(`Notarizing ${appId} found at ${appPath}`);

  let appleId = process.env.AID
  if (!appleId) throw new Error('No Apple ID found ($AID variable)');

  let appleIdPassword = process.env.AIP
  if (!appleIdPassword) throw new Error('No Apple ID password found ($AIP variable)');

  try {
    await electron_notarize.notarize({
      appBundleId: appId,
      appPath: appPath,
      appleId: appleId,
      appleIdPassword: appleIdPassword,
    });
  } catch (error) {
    console.error(`Failed to notarize: ${err ? err.message : 'error message not specified'}`);
  }

  console.log(`Done notarizing ${appId}`);
};
