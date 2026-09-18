// Sends an animated test pattern over Spout until Ctrl+C.
// Open Resolume, add a "Spout" source, and pick the sender below to verify.
import * as spout from '../src/main/spout.js';

const WIDTH = 1280;
const HEIGHT = 720;
const SENDER_NAME = 'CUEVO PPT Loader';

const status = spout.status();
if (!status.available) {
  console.error(`Spout addon not built: ${status.loadError}`);
  console.error('Run: npm run build-native');
  process.exit(1);
}

spout.start(SENDER_NAME);
console.log(`Sending "${SENDER_NAME}" at ${WIDTH}x${HEIGHT}. Ctrl+C to stop.`);

const frame = Buffer.alloc(WIDTH * HEIGHT * 4);
let tick = 0;

const timer = setInterval(() => {
  // Sweeping vertical bar over a teal field so it is obvious the feed is live.
  const barX = Math.floor((tick * 8) % WIDTH);
  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      const i = (y * WIDTH + x) * 4;
      const inBar = Math.abs(x - barX) < 40;
      frame[i + 0] = inBar ? 0xff : 0x75; // B
      frame[i + 1] = inBar ? 0xff : 0x9e; // G
      frame[i + 2] = inBar ? 0xff : 0x1d; // R
      frame[i + 3] = 0xff;                // A
    }
  }
  if (!spout.sendFrame(frame, WIDTH, HEIGHT)) console.error('sendFrame failed');
  tick++;
}, 33);

process.on('SIGINT', () => {
  clearInterval(timer);
  spout.stop();
  console.log('\nstopped');
  process.exit(0);
});
