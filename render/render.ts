import path from 'node:path';
import fs from 'node:fs/promises';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';

function argNum(flag: string): number | null {
  const i = process.argv.indexOf(flag);
  return i >= 0 && process.argv[i + 1] !== undefined ? Number(process.argv[i + 1]) : null;
}
function argStr(flag: string): string | null {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] ?? null : null;
}

async function main() {
  const entry = path.resolve(process.cwd(), 'src/remotion/index.ts');
  const outDir = path.resolve(process.cwd(), 'out');
  const from = argNum('--from');
  const to = argNum('--to');
  const frameRange: [number, number] | null =
    from !== null && to !== null ? [from, to] : null;
  const outName =
    argStr('--out') ?? (frameRange ? `chunk-${String(frameRange[0]).padStart(4, '0')}-${String(frameRange[1]).padStart(4, '0')}.mp4` : 'video-raw.mp4');
  const outFile = path.join(outDir, outName);
  await fs.mkdir(outDir, { recursive: true });

  console.log('Bundling Remotion composition...');
  const serveUrl = await bundle({
    entryPoint: entry,
  });

  const composition = await selectComposition({
    serveUrl,
    id: 'TheLastStar',
    browserExecutable: process.env.REMOTION_BROWSER ?? null,
    chromiumOptions: { gl: (process.env.REMOTION_GL as 'angle' | 'swangle' | 'egl' | 'swiftshader') ?? 'angle' },
  });

  const glMode =
    (process.env.REMOTION_GL as 'angle' | 'swangle' | 'egl' | 'swiftshader') ?? 'angle';

  console.log(
    `Rendering ${composition.durationInFrames} deterministic frames (${composition.width}x${composition.height} @ ${composition.fps}fps, gl=${glMode})...`
  );

  await renderMedia({
    composition,
    serveUrl,
    codec: 'h264',
    frameRange,
    scale: Number(process.env.REMOTION_SCALE ?? 1),
    outputLocation: outFile,
    pixelFormat: 'yuv420p',
    crf: 12,
    muted: true,
    concurrency: Number(process.env.REMOTION_CONCURRENCY ?? 4),
    browserExecutable: process.env.REMOTION_BROWSER ?? null,
    chromiumOptions: {
      gl: glMode,
    },
    onProgress: ({ progress }) => {
      const pct = Math.round(progress * 100);
      process.stdout.write(`\rProgress: ${pct}%`);
    },
  });

  console.log(`\nRaw video rendered to ${outFile}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
