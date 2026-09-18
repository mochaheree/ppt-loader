import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Store from 'electron-store';
import { convertPresentation } from './converter.js';
import * as spout from './spout.js';
import * as offscreen from './offscreenRenderer.js';

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

function toFileUrl(pngPath) {
  return `file:///${pngPath.replace(/\\/g, '/')}`;
}

function serializeDeck(deck) {
  if (!deck) return null;
  return {
    filePath: deck.filePath,
    fileHash: deck.fileHash,
    slideCount: deck.slideCount,
    currentIndex: deck.currentIndex,
    slides: deck.slides.map((s) => ({ ...s, url: toFileUrl(s.pngPath) })),
  };
}

async function pushCurrentSlide() {
  if (!currentDeck || !offscreen.isRunning()) return;
  const slide = currentDeck.slides[currentDeck.currentIndex];
  await offscreen.showSlide(toFileUrl(slide.pngPath), getSettings().scaleMode);
}

async function loadPresentation(filePath) {
  mainWindow.webContents.send('convert:progress', { stage: 'starting' });
  const manifest = await convertPresentation(filePath, {
    onProgress: (p) => mainWindow.webContents.send('convert:progress', p),
  });
  currentDeck = { ...manifest, currentIndex: 0 };
  await pushCurrentSlide();
  mainWindow.webContents.send('convert:complete', serializeDeck(currentDeck));
  return serializeDeck(currentDeck);
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

ipcMain.handle('playback:next', async () => {
  if (!currentDeck) return null;
  currentDeck.currentIndex = (currentDeck.currentIndex + 1) % currentDeck.slideCount;
  await pushCurrentSlide();
  return serializeDeck(currentDeck);
});

ipcMain.handle('playback:prev', async () => {
  if (!currentDeck) return null;
  currentDeck.currentIndex =
    (currentDeck.currentIndex - 1 + currentDeck.slideCount) % currentDeck.slideCount;
  await pushCurrentSlide();
  return serializeDeck(currentDeck);
});

ipcMain.handle('playback:playAt', async (_event, index) => {
  if (!currentDeck) return null;
  currentDeck.currentIndex = Math.max(0, Math.min(index, currentDeck.slideCount - 1));
  await pushCurrentSlide();
  return serializeDeck(currentDeck);
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

app.on('ready', createWindow);

app.on('before-quit', () => {
  offscreen.destroy();
  spout.stop();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
