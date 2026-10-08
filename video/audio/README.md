# Leve — original sound design V3

Original instrumental composition and synthesized sound design created for this task, without recordings, external samples, stock music, or TTS. Distributed under the repository MIT license (Copyright © 2026 Kauan Kelvin). NumPy/SciPy and FFmpeg synthesize and encode the work; their code is not included in the soundtrack. No third party composition is quoted.

Reproduce: `python video/audio/compose.py`. Requires Python, NumPy, SciPy and FFmpeg on PATH; no root application dependency changes. Seed 20261007, 48 kHz, stereo, 72 seconds, 92 BPM. Warm felt-like harmonic timbres, open Dmaj9/Bmin7/Gmaj9/Aadd9 voicings, slow pad progression, sparse soft noise pulse, a little glass colour for Gika. Intro is quiet, middle grows, offline lowers the bed, ending resolves in D. Small stereo reflections add depth. These are designed timbres, not sampled piano/glass recordings.

Stems: `music/leve-original.wav`, `ui/leve-ui.wav`, `transitions/leve-paper.wav`. Raw sum: `mix/pre-master.wav`. Two-pass loudnorm delivery: `mix/leve-mix.wav` (24-bit PCM), `mix/leve-mix.m4a` (AAC 256 kb/s). Source events in `events.json` now match the final motion timeline. The opening network cue is quieter than all others; calendar/send/pending interactions deliberately receive no extra cue. Music dominates; UI cues are deliberately sparse and well below music. No voice/ducking required for this release.

The V3 picture retains the 72-second duration. The intro save/network cues remain at 2.067/2.50 s; the task, mobile, notes, shopping and Gika cues are remapped to the V3 cut, and the offline dip/reconnect now begins at 52.0/63.8 s. Two paper passes support the calendar-to-mobile transition and final return to the same note. There is still no sound on every click.

The script writes first-pass, second-pass and measured-final loudness JSON in `mix/`. Loudness target −16 LUFS, true peak ceiling −1.5 dBTP. Verify again after final AAC mux because codec reconstruction can alter peak. The render should use the WAV as input to encode AAC once.

Heavy WAV/AAC artifacts are local deliverables, not Git source. Source, provenance and meter JSON are versioned. Auditory quality requires listening to preview/final by a human; numerical loudness and spectrogram do not prove musical taste. This agent does not claim a subjective listening evaluation.
