import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ADDON_PATH = path.join(
  __dirname, '..', '..', 'native', 'spout-sender', 'build', 'Release', 'spout_sender.node',
);

let SpoutSender = null;
let loadError = null;

try {
  ({ SpoutSender } = require(ADDON_PATH));
} catch (err) {
  loadError = err;
}

let sender = null;
let senderName = null;

export function isAvailable() {
  return SpoutSender !== null;
}

export function getLoadError() {
  return loadError ? String(loadError.message || loadError) : null;
}

export function start(name) {
  if (!SpoutSender) throw new Error(`Spout addon not built: ${getLoadError()}`);
  if (sender) stop();
  sender = new SpoutSender(name);
  senderName = name;
  return { senderName };
}

export function sendFrame(bgraBuffer, width, height) {
  if (!sender) return false;
  return sender.sendFrame(bgraBuffer, width, height);
}

export function stop() {
  if (!sender) return;
  sender.close();
  sender = null;
  senderName = null;
}

export function status() {
  return {
    available: isAvailable(),
    loadError: getLoadError(),
    running: sender !== null,
    senderName,
  };
}
