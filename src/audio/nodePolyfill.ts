// Must be imported BEFORE 'tone'. Tone creates a live AudioContext at import time, which fails on
// headless machines with no sound card, so we substitute an OfflineAudioContext-backed stand-in.
// Real output is only produced via Tone.Offline(), which uses its own OfflineAudioContext.
import * as wa from 'node-web-audio-api';

const g = globalThis as any;

class HeadlessAudioContext extends (wa as any).OfflineAudioContext {
  constructor(_opts?: unknown) {
    super(2, 48000, 48000);
  }
  resume() { return Promise.resolve(); }
  suspend() { return Promise.resolve(); }
  close() { return Promise.resolve(); }
  get baseLatency() { return 0; }
  get outputLatency() { return 0; }
}

for (const k of Object.keys(wa)) {
  if (g[k] === undefined) g[k] = (wa as any)[k];
}
g.AudioContext = HeadlessAudioContext;
if (g.window === undefined) g.window = g;
if (g.self === undefined) g.self = g;
