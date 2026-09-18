import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { createCanvas } from '@napi-rs/canvas';

const execFileAsync = promisify(execFile);

export const CACHE_ROOT = path.join(os.tmpdir(), 'cuevo-ppt-loader-cache');

const LIBREOFFICE_CANDIDATES = [
  'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
  'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe',
  'soffice', // fall back to PATH
];

let resolvedSofficePath = null;

async function resolveSofficePath() {
  if (resolvedSofficePath) return resolvedSofficePath;
  for (const candidate of LIBREOFFICE_CANDIDATES) {
    if (candidate === 'soffice') {
      resolvedSofficePath = candidate; // let the OS resolve via PATH, validated at call time
      return resolvedSofficePath;
    }
    try {
      await fs.access(candidate);
      resolvedSofficePath = candidate;
      return resolvedSofficePath;
    } catch {
      // try next candidate
    }
  }
  throw new Error('LibreOffice (soffice.exe) not found. Install it or configure a custom path.');
}

async function fileHash(filePath) {
  const stat = await fs.stat(filePath);
  const key = `${filePath}:${stat.size}:${stat.mtimeMs}`;
  return crypto.createHash('sha1').update(key).digest('hex').slice(0, 16);
}

async function convertPptxToPdf(pptxPath, outDir) {
  const soffice = await resolveSofficePath();
  // Dedicated profile dir avoids the "LibreOffice must be closed first" lock
  // issue the competitor plugin suffers from.
  const profileDir = path.join(outDir, 'lo-profile');
  await fs.mkdir(profileDir, { recursive: true });

  await execFileAsync(soffice, [
    '--headless',
    '--norestore',
    `-env:UserInstallation=file:///${profileDir.replace(/\\/g, '/')}`,
    '--convert-to', 'pdf',
    '--outdir', outDir,
    pptxPath,
  ], { timeout: 120000 });

  const base = path.basename(pptxPath, path.extname(pptxPath));
  const pdfPath = path.join(outDir, `${base}.pdf`);
  await fs.access(pdfPath); // throws if conversion failed to produce output
  return pdfPath;
}

async function rasterizePdfToPngs(pdfPath, outDir, { scale = 2 } = {}) {
  // pdfjs-dist legacy build works under plain Node without a DOM.
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const data = new Uint8Array(await fs.readFile(pdfPath));
  const loadingTask = pdfjsLib.getDocument({ data, disableFontFace: true });
  const pdfDoc = await loadingTask.promise;

  const slides = [];
  for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale });
    const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
    const ctx = canvas.getContext('2d');

    await page.render({ canvasContext: ctx, viewport }).promise;

    const pngPath = path.join(outDir, `slide-${String(pageNum).padStart(3, '0')}.png`);
    const buffer = await canvas.encode('png');
    await fs.writeFile(pngPath, buffer);

    slides.push({
      index: pageNum - 1,
      pngPath,
      width: canvas.width,
      height: canvas.height,
    });
  }

  await loadingTask.destroy();
  return slides;
}

/**
 * Converts a .pptx/.ppt file into a set of per-slide PNGs, caching by file
 * hash so re-opening an unchanged file skips reconversion.
 */
export async function convertPresentation(pptxPath, { onProgress } = {}) {
  const hash = await fileHash(pptxPath);
  const outDir = path.join(CACHE_ROOT, hash);
  const manifestPath = path.join(outDir, 'manifest.json');

  try {
    const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf-8'));
    return { ...manifest, fileHash: hash, cached: true };
  } catch {
    // no cache yet, fall through to conversion
  }

  await fs.mkdir(outDir, { recursive: true });

  onProgress?.({ stage: 'convert-to-pdf' });
  const pdfPath = await convertPptxToPdf(pptxPath, outDir);

  onProgress?.({ stage: 'rasterize' });
  const slides = await rasterizePdfToPngs(pdfPath, outDir);

  const manifest = { filePath: pptxPath, fileHash: hash, slideCount: slides.length, slides };
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));

  return { ...manifest, cached: false };
}
