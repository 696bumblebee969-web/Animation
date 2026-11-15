import './nodePolyfill';
import * as Tone from 'tone';
import { AudioContext as NodeAudioContext } from 'web-audio-api';
import { buildConcertImpulseResponse, writeStereoWav } from './wav';

/**
 * Generates an original 30-second cinematic orchestral/ambient score via Tone.js Offline rendering:
 * - 0–10s: Minimal, mysterious (low bowed drone, sparse celesta/piano motif)
 * - 10–16s: Soft emotional tension (warm cello swells, minor-to-suspended chords)
 * - 16–23s: Build-up (pulsing ostinato, rising string tension, anticipation sweep)
 * - 23–28s: Emotional celestial climax (soaring major strings, shimmering bell arpeggios, sub swell)
 * - 28–30s: Soft resolution (warm tonic sustain & delicate chime decay)
 */
export async function renderScoreWav(outputPath: string, sampleRate = 48000): Promise<void> {
  const duration = 30.0;

  // Bind web-audio-api polyfill for headless Node execution if needed
  const g = globalThis as Record<string, unknown>;
  if (!g.AudioContext) {
    g.AudioContext = NodeAudioContext;
  }

  const audioBuffer = await Tone.Offline(async ({ transport }) => {
    const masterGain = new Tone.Gain(0.85).toDestination();
    const compressor = new Tone.Compressor({ threshold: -16, ratio: 3 }).connect(masterGain);

    // Deterministic algorithmic concert reverb
    const ir = buildConcertImpulseResponse(sampleRate, 2.8);
    const rawIr = Tone.getContext().rawContext.createBuffer(2, ir.left.length, sampleRate);
    rawIr.copyToChannel(ir.left as Float32Array<ArrayBuffer>, 0);
    rawIr.copyToChannel(ir.right as Float32Array<ArrayBuffer>, 1);

    const reverb = new Tone.Convolver(rawIr).connect(compressor);
    const dryBus = new Tone.Gain(0.68).connect(compressor);
    const wetSend = new Tone.Gain(0.44).connect(reverb);

    // 1. Warm Cinematic String Pad
    const stringPad = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'fatsawtooth', count: 3, spread: 18 },
      envelope: { attack: 1.4, decay: 0.8, sustain: 0.72, release: 2.2 },
    });
    const padFilter = new Tone.Filter({ frequency: 950, type: 'lowpass', rolloff: -24 })
      .connect(dryBus)
      .connect(wetSend);
    stringPad.connect(padFilter);
    stringPad.volume.value = -12;

    // 2. Delicate Felt Piano / Celesta Bell Motif
    const celesta = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sine' },
      envelope: { attack: 0.015, decay: 1.4, sustain: 0.1, release: 1.8 },
    })
      .connect(dryBus)
      .connect(wetSend);
    celesta.volume.value = -8;

    // 3. Deep Sub Cello / Bass
    const subBass = new Tone.MonoSynth({
      oscillator: { type: 'triangle' },
      filter: { Q: 1, type: 'lowpass', frequency: 240 },
      envelope: { attack: 0.6, decay: 0.4, sustain: 0.85, release: 1.6 },
    }).connect(dryBus);
    subBass.volume.value = -9;

    // --- 0–10s: Minimal & Mysterious (D minor / F) ---
    transport.schedule((time) => {
      subBass.triggerAttackRelease('D2', 9.0, time, 0.55);
      stringPad.triggerAttackRelease(['D3', 'A3'], 8.5, time, 0.32);
    }, 0.1);

    const mysteryNotes: Array<[number, string, number]> = [
      [1.2, 'A4', 0.45],
      [2.6, 'F4', 0.42],
      [4.1, 'E4', 0.48],
      [5.5, 'D5', 0.52],
      [6.4, 'A4', 0.45],
      [7.8, 'E5', 0.48],
      [9.1, 'C5', 0.44],
    ];
    for (const [t, note, vel] of mysteryNotes) {
      transport.schedule((time) => celesta.triggerAttackRelease(note, 1.8, time, vel), t);
    }

    // --- 10–16s: Soft Emotional Tension (BbMaj7 -> Asus4) ---
    transport.schedule((time) => {
      padFilter.frequency.linearRampToValueAtTime(1450, time + 5.5);
      subBass.triggerAttackRelease('Bb1', 3.2, time, 0.65);
      stringPad.triggerAttackRelease(['Bb2', 'F3', 'D4', 'A4'], 3.2, time, 0.46);
    }, 10.0);

    transport.schedule((time) => {
      subBass.triggerAttackRelease('A1', 2.8, time, 0.65);
      stringPad.triggerAttackRelease(['A2', 'E3', 'D4', 'G4'], 2.8, time, 0.48);
    }, 13.2);

    const tensionNotes: Array<[number, string]> = [
      [10.8, 'F5'], [11.9, 'D5'], [13.4, 'E5'], [14.7, 'D5'], [15.4, 'A4'],
    ];
    for (const [t, note] of tensionNotes) {
      transport.schedule((time) => celesta.triggerAttackRelease(note, 1.5, time, 0.52), t);
    }

    // --- 16–23s: Build-up -> Explosive Ascent at 21.0s ---
    transport.schedule((time) => {
      padFilter.frequency.linearRampToValueAtTime(2800, time + 5.0);
      subBass.triggerAttackRelease('G1', 2.8, time, 0.72);
      stringPad.triggerAttackRelease(['G2', 'D3', 'Bb3', 'F4'], 2.8, time, 0.52);
    }, 16.0);

    // Disappointed minor dip at 18.4s, then rising hopeful suspension at 19.3s
    transport.schedule((time) => {
      subBass.triggerAttackRelease('C2', 2.0, time, 0.8);
      stringPad.triggerAttackRelease(['C3', 'G3', 'D4', 'E4'], 1.9, time, 0.65);
    }, 19.25);

    // Rising ostinato arpeggio accelerating into launch at 21.0s
    const buildupArp = [
      [19.3, 'G4'], [19.65, 'C5'], [20.0, 'D5'], [20.3, 'E5'],
      [20.55, 'G5'], [20.78, 'A5'],
    ] as const;
    for (const [t, n] of buildupArp) {
      transport.schedule((time) => celesta.triggerAttackRelease(n, 0.9, time, 0.68), t);
    }

    // 21.0s Ascent Lift (F major inversion)
    transport.schedule((time) => {
      subBass.triggerAttackRelease('F1', 2.0, time, 0.9);
      stringPad.triggerAttackRelease(['F3', 'C4', 'A4', 'E5'], 2.1, time, 0.8);
      celesta.triggerAttackRelease('C6', 2.2, time, 0.85);
    }, 21.0);

    // --- 23–28s: Emotional / Celestial Climax (Radiant D Major / A / G -> F#m) ---
    transport.schedule((time) => {
      padFilter.frequency.linearRampToValueAtTime(4200, time + 1.4);
      subBass.triggerAttackRelease('D2', 4.6, time, 0.92);
      stringPad.triggerAttackRelease(['D3', 'A3', 'F#4', 'A4', 'D5'], 4.5, time, 0.92);
    }, 23.8);

    const climaxChimes: Array<[number, string]> = [
      [24.2, 'D6'], [24.6, 'A5'], [25.0, 'F#5'], [25.45, 'E5'],
      [25.9, 'D5'], [26.4, 'A5'], [26.9, 'F#5'], [27.4, 'E5'],
    ];
    for (const [t, n] of climaxChimes) {
      transport.schedule((time) => celesta.triggerAttackRelease(n, 1.8, time, 0.82), t);
    }

    // --- 28–30s: Soft Warm Resolution (D Major 9) ---
    transport.schedule((time) => {
      padFilter.frequency.linearRampToValueAtTime(1100, time + 1.8);
      subBass.triggerAttackRelease('D2', 2.0, time, 0.45);
      stringPad.triggerAttackRelease(['D3', 'A3', 'E4', 'F#4'], 2.0, time, 0.42);
      celesta.triggerAttackRelease('A5', 2.0, time, 0.5);
    }, 28.0);

    transport.start(0);
  }, duration, 2, sampleRate);

  const left = audioBuffer.getChannelData(0);
  const right = audioBuffer.getChannelData(1);
  await writeStereoWav(outputPath, left, right, sampleRate);
}
