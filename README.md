# THE LAST STAR — Procedural 2D/2.5D Animated Short Film

A 30-second (1920×1080, 60 FPS, H.264/AAC) animated short film rendered purely through code using **PixiJS v8**, **GSAP v3**, **Remotion 4**, **Tone.js**, **TTS narration**, and **FFmpeg**.

## Requirements

- Node.js >= 20
- FFmpeg & FFprobe available on `PATH` (or via Remotion's bundled FFmpeg)
- Optional for studio-quality AI narration:
  - `OPENAI_API_KEY` (uses `tts-1-hd`, voice `nova`) **or**
  - `ELEVENLABS_API_KEY` (uses `eleven_multilingual_v2`)
  - Without an API key, `Narration.ts` automatically falls back to OS TTS (`say` / `espeak-ng`) or a clean silent cue track so builds always succeed offline.

## Quick Start

