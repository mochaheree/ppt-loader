import { BrowserWindow } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as spout from './spout.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const KEEPALIVE_INTERVAL_MS = 100;

let window = null;
let ready = null;
let outputSize = { width: 1920, height: 1080 };
let lastFrame = null;
let keepalive = null;

export async function init({ width = 1920, height = 1080, frameRate = 30 } = {}) {
  if (window) destroy();
  outputSize = { width, height };
  lastFrame = null;

  window = new BrowserWindow({
    width,
    height,
    show: false,
    webPreferences: {
      offscreen: true,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  window.webContents.setFrameRate(frameRate);

  // Chromium composites the scaling/letterboxing for us; each repaint arrives
  // here as a BGRA bitmap, which is the format SpoutDX sends natively.
  window.webContents.on('paint', (_event, _dirty, image) => {
    const size = image.getSize();
    lastFrame = { bitmap: image.getBitmap(), width: size.width, height: size.height };
    spout.sendFrame(lastFrame.bitmap, lastFrame.width, lastFrame.height);
  });

  // Offscreen rendering only paints when content changes, so a receiver that
  // connects while a slide is idle would otherwise see nothing until the next
  // slide change. Resend the last frame so late joiners pick it up.
  keepalive = setInterval(() => {
    if (lastFrame) spout.sendFrame(lastFrame.bitmap, lastFrame.width, lastFrame.height);
  }, KEEPALIVE_INTERVAL_MS);

  ready = window.webContents.loadFile(path.join(__dirname, 'offscreen.html'));
  await ready;
}

export async function showSlide(url, scaleMode = 'fit', fadeMs = 0) {
  if (!window) return;
  await ready;
  const args = [url, scaleMode, Number(fadeMs) || 0].map((v) => JSON.stringify(v)).join(', ');
  await window.webContents.executeJavaScript(`window.__showSlide(${args});`);
}

export async function setScaleMode(scaleMode) {
  if (!window) return;
  await ready;
  await window.webContents.executeJavaScript(
    `window.__setScaleMode(${JSON.stringify(scaleMode)});`,
  );
}

export function getOutputSize() {
  return { ...outputSize };
}

export function isRunning() {
  return window !== null;
}

export function destroy() {
  if (keepalive) {
    clearInterval(keepalive);
    keepalive = null;
  }
  lastFrame = null;
  if (!window) return;
  window.destroy();
  window = null;
  ready = null;
}
