import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Store from 'electron-store';
import { convertPresentation } from './converter.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const store = new Store();

let mainWindow;
let currentDeck = null; // { filePath, fileHash, slideCount, slides }

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

async function loadPresentation(filePath) {
  mainWindow.webContents.send('convert:progress', { stage: 'starting' });
  const manifest = await convertPresentation(filePath, {
    onProgress: (p) => mainWindow.webContents.send('convert:progress', p),
  });
  currentDeck = { ...manifest, currentIndex: 0 };
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

ipcMain.handle('playback:next', () => {
  if (!currentDeck) return null;
  currentDeck.currentIndex = (currentDeck.currentIndex + 1) % currentDeck.slideCount;
  return serializeDeck(currentDeck);
});

ipcMain.handle('playback:prev', () => {
  if (!currentDeck) return null;
  currentDeck.currentIndex =
    (currentDeck.currentIndex - 1 + currentDeck.slideCount) % currentDeck.slideCount;
  return serializeDeck(currentDeck);
});

ipcMain.handle('playback:playAt', (_event, index) => {
  if (!currentDeck) return null;
  currentDeck.currentIndex = Math.max(0, Math.min(index, currentDeck.slideCount - 1));
  return serializeDeck(currentDeck);
});

ipcMain.handle('settings:save', (_event, settings) => {
  store.set('deckSettings', settings);
  return true;
});

ipcMain.handle('settings:load', () =>
  store.get('deckSettings', {
    engine: 'libreoffice',
    scaleMode: 'fit',
    autopilot: 'off',
    duration: 5,
    fade: true,
    fadeDurationMs: 400,
    loop: true,
    spoutSenderName: 'CUEVO PPT Loader',
  }),
);

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
