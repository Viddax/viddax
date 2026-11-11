function createUpdateController({ updater, currentVersion, enabled, publish, canRestart }) {
  let state = { currentVersion, phase: enabled ? 'idle' : 'unavailable', version: null, percent: 0 };
  const setState = (phase, version = state.version, percent = state.percent) => {
    state = { currentVersion, phase, version, percent };
    publish(state);
  };
  const fail = (error) => {
    console.error('Viddax updater:', error);
    if (state.phase !== 'error') setState('error');
  };

  if (enabled) {
    updater.autoDownload = true;
    updater.autoInstallOnAppQuit = true;
    updater.on('update-available', ({ version }) => setState('downloading', version, 0));
    updater.on('update-not-available', () => setState('current', null, 0));
    updater.on('download-progress', ({ percent }) => {
      const rounded = Math.round(Math.min(100, Math.max(0, percent)));
      if (state.phase === 'downloading' && Number.isFinite(rounded) && rounded !== state.percent) {
        setState('downloading', state.version, rounded);
      }
    });
    updater.on('update-downloaded', ({ version }) => setState('ready', version, 100));
    updater.on('error', fail);
  }

  async function check() {
    if (!enabled || ['checking', 'downloading', 'ready', 'installing'].includes(state.phase)) return;
    setState('checking', null, 0);
    try {
      const result = await updater.checkForUpdates();
      await result?.downloadPromise;
      if (state.phase === 'checking') setState('current', null, 0);
    } catch (error) {
      fail(error);
    }
  }

  function install() {
    if (state.phase !== 'ready' || !canRestart()) return false;
    setState('installing');
    try {
      updater.quitAndInstall(true, true);
      return true;
    } catch (error) {
      fail(error);
      return false;
    }
  }

  return { check, install, getState: () => state };
}

module.exports = { createUpdateController };
