import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

// Joins out/chunk-*.mp4 (sorted by start frame) into out/video-raw.mp4 without re-encoding.
const outDir = path.resolve(process.cwd(), 'out');
const chunks = fs.readdirSync(outDir).filter((f) => /^chunk-\d+-\d+\.mp4$/.test(f)).sort();
if (chunks.length === 0) throw new Error('No out/chunk-*.mp4 files found');
const list = path.join(outDir, 'chunks.txt');
fs.writeFileSync(list, chunks.map((c) => `file '${path.join(outDir, c)}'`).join('\n') + '\n');
execFileSync('ffmpeg', ['-y', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', path.join(outDir, 'video-raw.mp4')], { stdio: 'inherit' });
console.log(`Joined ${chunks.length} chunks -> out/video-raw.mp4`);
