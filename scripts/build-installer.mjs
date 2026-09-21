// electron-builder's Windows packaging step extracts the Electron zip
// straight into release/win-unpacked, then renames a .tmp staging dir onto
// it. Windows Defender's real-time scanner holds a lock on freshly written
// executables just long enough that the immediate rename fails with EPERM --
// a well-known electron-builder/Windows interaction, not a bug in this repo.
// There's no admin access here to add a Defender exclusion, so this wraps
// fs.promises.rename with a short retry instead of patching node_modules
// directly (which npm would just overwrite on the next install).
import fsPromises from 'node:fs/promises';

const originalRename = fsPromises.rename;
fsPromises.rename = async (...args) => {
  // Defender scans the whole freshly-extracted Electron distribution (a few
  // hundred files) before releasing it, which can take well over the ~5s a
  // short retry loop covers -- so this waits up to two minutes.
  const attempts = 40;
  for (let i = 1; i <= attempts; i++) {
    try {
      return await originalRename(...args);
    } catch (err) {
      if (err.code !== 'EPERM' || i === attempts) throw err;
      if (i === 1 || i % 5 === 0) {
        console.log(`[build-installer] rename locked (attempt ${i}/${attempts}), retrying...`);
      }
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
};

const { build, Platform } = await import('electron-builder');

// Building straight into release/ inside the open workspace lets VS Code's
// file watcher (or Explorer/Search Indexer) grab a directory handle on it
// mid-extraction, which is what the retry above is actually fighting. When
// CUEVO_BUILD_OUTPUT is set, build outside the watched tree instead and
// leave moving the result into release/ to the caller.
const outputOverride = process.env.CUEVO_BUILD_OUTPUT;
await build({
  targets: Platform.WINDOWS.createTarget(),
  config: outputOverride ? { directories: { output: outputOverride } } : undefined,
});
