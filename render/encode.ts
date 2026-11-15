import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/**
 * Combines the rendered 1920x1080 60fps video with the score, SFX, and narration stems,
 * applies automatic sidechain ducking on music whenever narration speaks,
 * normalizes to -14 LUFS broadcast cinema spec, and produces final H.264 + AAC MP4.
 */
async function main() {
  const root = process.cwd();
  const rawVideo = path.join(root, 'out/video-raw.mp4');
  const scoreWav = path.join(root, 'public/audio/score.wav');
  const sfxWav = path.join(root, 'public/audio/sfx.wav');
  const narrationWav = path.join(root, 'public/audio/narration.wav');
  const finalMp4 = path.join(root, 'out/the-last-star.mp4');

  const filterComplex = [
    '[1:a]volume=0.82[mus]',
    '[2:a]volume=0.88[sfx]',
    '[3:a]volume=1.18,asplit=2[narr][narr_sc]',
    '[mus][narr_sc]sidechaincompress=threshold=0.015:ratio=4.5:attack=25:release=320[mus_duck]',
    '[mus_duck][sfx][narr]amix=inputs=3:duration=first:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=9[aout]',
  ].join(';');

  console.log('Mastering final 1920x1080 60fps H.264/AAC MP4 via FFmpeg...');
  await execFileAsync('ffmpeg', [
    '-y',
    '-i', rawVideo,
    '-i', scoreWav,
    '-i', sfxWav,
    '-i', narrationWav,
    '-filter_complex', filterComplex,
    '-map', '0:v:0',
    '-map', '[aout]',
    '-c:v', 'libx264',
    '-profile:v', 'high',
    '-level:v', '4.2',
    '-preset', 'slow',
    '-crf', '16',
    '-pix_fmt', 'yuv420p',
    '-r', '60',
    '-c:a', 'aac',
    '-b:a', '256k',
    '-ar', '48000',
    '-movflags', '+faststart',
    '-t', '30',
    finalMp4,
  ]);

  console.log(`Final mastered short film created: ${finalMp4}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
