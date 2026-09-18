import { app, BrowserWindow, ipcMain, dialog, protocol, net } from 'electron';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import Store from 'electron-store';
import { convertPresentation, CACHE_ROOT } from './converter.js';
import * as spout from './spout.js';
import * as offscreen from './offscreenRenderer.js';
import * as engine from './slideEngine.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const store = new Store();

let mainWindow;
let currentDeck = null; // { filePath, fileHash, slideCount, slides }

function getSettings() {
  return store.get('deckSettings', {
    engine: 'libreoffice',
    scaleMode: 'fit',
    autopilot: 'off',
    duration: 5,
    fade: true,
    fadeDurationMs: 400,
    loop: true,
    spoutSenderName: 'CUEVO PPT Loader',
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    backgroundColor: '#0f172a',
    title: 'CUEVO PPT Loader',
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadURL('http://localhost:5174');
  mainWindow.webContents.openDevTools();
}

// The renderer is served over http://localhost, and Chromium blocks file://
// resources from an http origin, so cached slides are served over a custom
// scheme instead.
protocol.registerSchemesAsPrivileged([
  { scheme: 'slide', privileges: { standard: true, secure: true, supportFetchAPI: true } },
]);

function registerSlideProtocol() {
  protocol.handle('slide', (request) => {
    const url = new URL(request.url);
    const hash = url.hostname;
    // basename() strips any traversal segments before they reach the filesystem
    const name = path.basename(decodeURIComponent(url.pathname));
    if (!/^[0-9a-f]+$/.test(hash)) return new Response('bad request', { status: 400 });
    return net.fetch(pathToFileURL(path.join(CACHE_ROOT, hash, name)).toString());
  });
}

function toSlideUrl(fileHash, pngPath) {
  return `slide://${fileHash}/${path.basename(pngPath)}`;
}

function serializeDeck() {
  if (!currentDeck) return null;
  const { currentIndex, autopilot, duration, loop } = engine.getState();
  return {
    filePath: currentDeck.filePath,
    fileHash: currentDeck.fileHash,
    slideCount: currentDeck.slideCount,
    currentIndex,
    autopilot,
    duration,
    loop,
    slides: currentDeck.slides.map((s) => ({
      ...s,
      url: toSlideUrl(currentDeck.fileHash, s.pngPath),
    })),
  };
}

async function pushCurrentSlide() {
  if (!currentDeck || !offscreen.isRunning()) return;
  const { scaleMode, fade, fadeDurationMs } = getSettings();
  const slide = currentDeck.slides[engine.getState().currentIndex];
  await offscreen.showSlide(
    toSlideUrl(currentDeck.fileHash, slide.pngPath),
    scaleMode,
    fade ? fadeDurationMs : 0,
  );
}

// Autopilot advances slides from the engine's own timer, so the renderer is
// notified here rather than only in response to an IPC call.
async function handleSlideChange() {
  await pushCurrentSlide();
  mainWindow?.webContents.send('deck:updated', serializeDeck());
}

async function loadPresentation(filePath) {
  mainWindow.webContents.send('convert:progress', { stage: 'starting' });
  const manifest = await convertPresentation(filePath, {
    onProgress: (p) => mainWindow.webContents.send('convert:progress', p),
  });
  currentDeck = manifest;
  engine.reset(); // pushes slide 1 through onChange
  mainWindow.webContents.send('convert:complete', serializeDeck());
  return serializeDeck();
}

ipcMain.handle('file:load', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Load PowerPoint file',
    filters: [{ name: 'PowerPoint', extensions: ['pptx', 'ppt'] }],
    properties: ['openFile'],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  const filePath = result.filePaths[0];
  const recent = new Set(store.get('recentFiles', []));
  recent.add(filePath);
  store.set('recentFiles', Array.from(recent).slice(-10));

  return loadPresentation(filePath);
});

ipcMain.handle('file:getRecent', () => store.get('recentFiles', []));

// The engine's onChange pushes the new slide to the offscreen renderer, so
// these handlers only need to return the resulting state.
ipcMain.handle('playback:next', () => {
  if (!currentDeck) return null;
  engine.next();
  return serializeDeck();
});

ipcMain.handle('playback:prev', () => {
  if (!currentDeck) return null;
  engine.prev();
  return serializeDeck();
});

ipcMain.handle('playback:playAt', (_event, index) => {
  if (!currentDeck) return null;
  engine.playAt(index);
  return serializeDeck();
});

ipcMain.handle('autopilot:set', (_event, mode) => {
  engine.setAutopilot(mode);
  return serializeDeck();
});

ipcMain.handle('duration:set', (_event, seconds) => {
  store.set('deckSettings', { ...getSettings(), duration: seconds });
  engine.setDuration(seconds);
  return serializeDeck();
});

ipcMain.handle('loop:set', (_event, enabled) => {
  store.set('deckSettings', { ...getSettings(), loop: enabled });
  engine.setLoop(enabled);
  return serializeDeck();
});

ipcMain.handle('fade:set', (_event, enabled, ms) => {
  const next = { ...getSettings(), fade: enabled };
  if (typeof ms === 'number') next.fadeDurationMs = ms;
  store.set('deckSettings', next);
  return { fade: next.fade, fadeDurationMs: next.fadeDurationMs };
});

ipcMain.handle('scale:set', async (_event, scaleMode) => {
  store.set('deckSettings', { ...getSettings(), scaleMode });
  await offscreen.setScaleMode(scaleMode);
  return scaleMode;
});

ipcMain.handle('spout:start', async () => {
  const { spoutSenderName } = getSettings();
  spout.start(spoutSenderName);
  await offscreen.init();
  await pushCurrentSlide();
  return spout.status();
});

ipcMain.handle('spout:stop', () => {
  offscreen.destroy();
  spout.stop();
  return spout.status();
});

ipcMain.handle('spout:status', () => spout.status());

ipcMain.handle('settings:save', (_event, settings) => {
  store.set('deckSettings', settings);
  return true;
});

ipcMain.handle('settings:load', () => getSettings());

app.on('ready', () => {
  registerSlideProtocol();
  engine.init({
    getDeck: () => currentDeck,
    onChange: handleSlideChange,
    settings: getSettings(),
  });
  createWindow();
});

app.on('before-quit', () => {
  engine.stop();
  offscreen.destroy();
  spout.stop();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
