const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  fileLoad: () => ipcRenderer.invoke('file:load'),
  fileGetRecent: () => ipcRenderer.invoke('file:getRecent'),

  playbackNext: () => ipcRenderer.invoke('playback:next'),
  playbackPrev: () => ipcRenderer.invoke('playback:prev'),
  playbackPlayAt: (index) => ipcRenderer.invoke('playback:playAt', index),

  autopilotSet: (mode) => ipcRenderer.invoke('autopilot:set', mode),
  durationSet: (seconds) => ipcRenderer.invoke('duration:set', seconds),
  fadeSet: (enabled, ms) => ipcRenderer.invoke('fade:set', enabled, ms),
  loopSet: (enabled) => ipcRenderer.invoke('loop:set', enabled),
  scaleSet: (mode) => ipcRenderer.invoke('scale:set', mode),

  spoutStart: () => ipcRenderer.invoke('spout:start'),
  spoutStop: () => ipcRenderer.invoke('spout:stop'),
  spoutStatus: () => ipcRenderer.invoke('spout:status'),

  settingsSave: (settings) => ipcRenderer.invoke('settings:save', settings),
  settingsLoad: () => ipcRenderer.invoke('settings:load'),

  onConvertProgress: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('convert:progress', listener);
    return () => ipcRenderer.removeListener('convert:progress', listener);
  },
  onConvertComplete: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('convert:complete', listener);
    return () => ipcRenderer.removeListener('convert:complete', listener);
  },
  onDeckUpdate: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('deck:updated', listener);
    return () => ipcRenderer.removeListener('deck:updated', listener);
  },
});
