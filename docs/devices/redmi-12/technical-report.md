# Redmi 12 Speaker · V6 Technical Report

## Selected files

| Component | Path | File-level finding |
|---|---|---|
| VDC | `profiles/speaker/redmi-12/v6/ha-spk-v6.vdc` | 10-section identity filterbank at 44.1 and 48 kHz. |
| IRS | `profiles/speaker/redmi-12/v6/ha-spk-v6.irs` | 48 kHz, IEEE float32, two channels, 8,192 frames per channel. |
| EEL2 | `profiles/speaker/redmi-12/v6/ha-spk-v6.eel` | Four declared sliders; static `@init` / `@sample` structure parses. |

## IRS integrity

The stereo IRS has finite samples, a maximum sample peak near −0.45 dBFS, and the last 256 samples peak near −123.8 dBFS. Its L1 norm is approximately 1.2317. These figures are digital file diagnostics; they do not represent acoustic output or hardware headroom.

## VDC

The selected V6 VDC is an identity filterbank: ten repetitions of `[1, 0, 0, 0, 0]` in each sample-rate bank. Its maximum pole radius is zero. It preserves the three-stage deployment structure without applying an extra EQ curve.

## EEL2 limiter

The V6 EEL2 file identifies itself as a post-IRS limiter. It declares a stereo-linked lookahead buffer of 48 samples, corresponding to 1 ms at 48 kHz. The defaults are input gain 0 dB, ceiling −3 dBFS and release 80 ms. The source is structurally parsed, but a static parser is not a substitute for testing in the target Liveprog runtime.

## Evidence boundary

This report describes the selected V6 files. The browser QA verifies format, sample integrity, channel symmetry, coefficient stability and EEL slider structure. It does not prove native app behavior, ARM behavior, acoustic response or listening quality. A sample-peak limiter is not a true-peak limiter or a guarantee against physical driver excursion.

<div align="center">
<sub>HyperAudio · © 2026</sub>
</div>
