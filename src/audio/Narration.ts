import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export interface NarrationCue {
  id: string;
  startSec: number;
  maxEndSec: number;
  text: string;
}

/**
 * Exact script cues timed cleanly to avoid stepping on major visual beats
 * (e.g., Scene 4 release burst at 21.0s has zero narration overlap).
 */
export const NARRATION_CUES: NarrationCue[] = [
  {
    id: 'scene1',
    startSec: 0.7,
    maxEndSec: 4.5,
    text: 'For years, the city had forgotten what stars looked like.',
  },
  {
    id: 'scene2',
    startSec: 5.5,
    maxEndSec: 9.6,
    text: 'Then, one night, she found something that should not have been there.',
  },
  {
    id: 'scene3',
    startSec: 10.6,
    maxEndSec: 13.4,
    text: 'It was barely alive.',
  },
  {
    id: 'scene5',
    startSec: 24.3,
    maxEndSec: 27.9,
    text: 'Sometimes, a little light only needs someone to let it go.',
  },
  {
    id: 'scene6',
    startSec: 28.25,
    maxEndSec: 29.85,
    text: 'And sometimes, that is enough.',
  },
];

async function synthesizeClipOpenAI(text: string, outMp3: string): Promise<boolean> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return false;

  const res = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'tts-1-hd',
      voice: 'nova',
      input: text,
      speed: 0.94,
      response_format: 'mp3',
    }),
  });
  if (!res.ok) {
    throw new Error(`OpenAI TTS error (${res.status}): ${await res.text()}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.writeFile(outMp3, buf);
  return true;
}

async function synthesizeClipElevenLabs(text: string, outMp3: string): Promise<boolean> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return false;
  const voiceId = process.env.ELEVENLABS_VOICE_ID ?? '21m00Tcm4TlvDq8ikWAM'; // Rachel

  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: { stability: 0.55, similarity_boost: 0.78, style: 0.35 },
    }),
  });
  if (!res.ok) {
    throw new Error(`ElevenLabs TTS error (${res.status}): ${await res.text()}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.writeFile(outMp3, buf);
  return true;
}

async function synthesizeClipLocalFallback(text: string, outWav: string): Promise<boolean> {
  // Attempt macOS `say` or Linux `espeak-ng` so local offline machines still get spoken voiceover
  try {
    if (process.platform === 'darwin') {
      const aiff = `${outWav}.aiff`;
      await execFileAsync('say', ['-v', 'Samantha', '-r', '165', '-o', aiff, text]);
      await execFileAsync('ffmpeg', ['-y', '-i', aiff, '-ar', '48000', '-ac', '2', outWav]);
      await fs.unlink(aiff).catch(() => {});
      return true;
    }
    await execFileAsync('espeak-ng', ['-s', '145', '-w', outWav, text]);
    return true;
  } catch {
    return false;
  }
}

async function probeDuration(filePath: string): Promise<number> {
  const { stdout } = await execFileAsync('ffprobe', [
    '-v',
    'error',
    '-show_entries',
    'format=duration',
    '-of',
    'default=noprint_wrappers=1:nokey=1',
    filePath,
  ]);
  return parseFloat(stdout.trim()) || 1.5;
}

/**
 * Generates each narration line via OpenAI TTS / ElevenLabs TTS (or local OS fallback),
 * adjusts tempo subtly if needed to stay within its scene slot, and mixes all lines into one 30s WAV.
 */
export async function renderNarrationWav(outputWav: string): Promise<void> {
  const tmpDir = path.join(path.dirname(outputWav), '_tts_tmp');
  await fs.mkdir(tmpDir, { recursive: true });
  await fs.mkdir(path.dirname(outputWav), { recursive: true });

  const preparedClips: Array<{ path: string; startMs: number }> = [];

  for (const cue of NARRATION_CUES) {
    const rawMp3 = path.join(tmpDir, `${cue.id}.mp3`);
    const rawWav = path.join(tmpDir, `${cue.id}.wav`);
    const fitWav = path.join(tmpDir, `${cue.id}_fit.wav`);

    let generatedPath: string | null = null;
    if (await synthesizeClipOpenAI(cue.text, rawMp3)) {
      generatedPath = rawMp3;
    } else if (await synthesizeClipElevenLabs(cue.text, rawMp3)) {
      generatedPath = rawMp3;
    } else if (await synthesizeClipLocalFallback(cue.text, rawWav)) {
      generatedPath = rawWav;
    }

    if (!generatedPath) {
      continue;
    }

    // Ensure the clip fits gracefully inside [startSec, maxEndSec]
    const rawDur = await probeDuration(generatedPath);
    const maxSlot = cue.maxEndSec - cue.startSec;
    const tempo = rawDur > maxSlot ? Math.min(1.45, rawDur / maxSlot) : 1.0;
    const filter = tempo > 1.01 ? `atempo=${tempo.toFixed(3)},aresample=48000` : 'aresample=48000';

    await execFileAsync('ffmpeg', [
      '-y',
      '-i',
      generatedPath,
      '-af',
      filter,
      '-ac',
      '2',
      '-ar',
      '48000',
      fitWav,
    ]);

    preparedClips.push({ path: fitWav, startMs: Math.round(cue.startSec * 1000) });
  }

  if (preparedClips.length === 0) {
    console.warn(
      '[Narration] No TTS API key or OS speech engine found; creating clean 30s silent narration stem.'
    );
    await execFileAsync('ffmpeg', [
      '-y',
      '-f',
      'lavfi',
      '-i',
      'anullsrc=r=48000:cl=stereo',
      '-t',
      '30',
      outputWav,
    ]);
    return;
  }

  // Assemble exact 30.0s timeline-aligned narration track using FFmpeg adelay + amix
  const inputs: string[] = ['-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo:d=30'];
  const filters: string[] = ['[0:a]atrim=duration=30[base]'];
  const mixInputs: string[] = ['[base]'];

  preparedClips.forEach((clip, idx) => {
    const inputIdx = idx + 1;
    inputs.push('-i', clip.path);
    filters.push(`[${inputIdx}:a]adelay=${clip.startMs}|${clip.startMs}[c${idx}]`);
    mixInputs.push(`[c${idx}]`);
  });

  filters.push(
    `${mixInputs.join('')}amix=inputs=${mixInputs.length}:normalize=0,atrim=duration=30[out]`
  );

  await execFileAsync('ffmpeg', [
    '-y',
    ...inputs,
    '-filter_complex',
    filters.join(';'),
    '-map',
    '[out]',
    '-ar',
    '48000',
    '-ac',
    '2',
    outputWav,
  ]);
}
