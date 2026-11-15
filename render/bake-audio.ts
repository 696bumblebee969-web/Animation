import '../src/audio/nodePolyfill';
import path from 'node:path';
import { renderScoreWav } from '../src/audio/Music';
import { renderSfxWav } from '../src/audio/SFX';
import { renderNarrationWav } from '../src/audio/Narration';

async function main() {
  const audioDir = path.resolve(process.cwd(), 'public/audio');
  console.log('1/3 Rendering original Tone.js score...');
  await renderScoreWav(path.join(audioDir, 'score.wav'));

  console.log('2/3 Synthesizing synchronized procedural SFX...');
  await renderSfxWav(path.join(audioDir, 'sfx.wav'));

  console.log('3/3 Generating TTS narration stem...');
  await renderNarrationWav(path.join(audioDir, 'narration.wav'));

  console.log('Audio stems ready in public/audio/');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
