# HyperAudio · Test Report

## Selected release inventory

| Profile | IRS | VDC | EEL2 |
|---|---|---|---|
| KZ EDX Pro v5-HD | 4-channel float32, 48 kHz, 2,851 frames/channel | 14 sections; maximum 48 kHz pole radius 0.99908846 | 3 sliders; static structure parses; header pairing caveat disclosed |
| Redmi 12 Speaker V6 | 2-channel float32, 48 kHz, 8,192 frames/channel | 10-section identity bank | 4 sliders; static structure parses |

## File-level verification

The in-browser QA parses RIFF chunks, checks format and frame count, tests finite samples, verifies the expected channel symmetry, measures sample peak and tail level, calculates VDC pole radii, and statically inspects EEL2 slider defaults and `@init` / `@sample` sections.

Peak gain and L1 norm are displayed as diagnostics. They are not treated as universal rejection gates because true-stereo matrices and different impulse responses can legitimately exceed a single scalar threshold.

## Live Compare scope

The browser comparison is experimental. It routes a dry source and a VDC → IRS source through synchronized branches, uses browser IIR filters and a native convolver, applies bounded RMS level matching and a −12 dB safety pad, and includes source tests and blind A/B/X controls. The EEL2 stage is not emulated. Browser resampling, channel routing, coefficient implementation and output-device behavior can differ from RootlessJamesDSP.

## Not established by these checks

- RootlessJamesDSP app validation on Android.
- Native ARM execution or exact parity with the app's DDC/convolver implementations.
- Acoustic measurement on the KZ EDX Pro or Redmi 12.
- Controlled listening tests or blind listening-test results.
- True-peak or physical driver-excursion protection.

## Known compatibility note

The IEM v5-HD EEL2 file's header references an earlier `EDX_Ultra.irs` and `EDX_Ultra_R.vdc` chain. The file is preserved unchanged, and its use with the selected `edx-hd-core` pair requires independent target-app verification.

<div align="center">
<sub>HyperAudio · © 2026</sub>
</div>

## Repository QA run · 2026-11-03

The supplied repository archive was rechecked before publication. This run covers repository integrity and browser behavior; it does not replace target-app testing.

### Passed checks

- All five browser JavaScript files pass `node --check` (Node.js 22.16.0).
- `tools/build_assets.py` passes Python compilation (Python 3.13.5).
- Two consecutive asset builds produced byte-identical `assets.json` and all 28 ZIP bundles.
- The regenerated manifest contains 120 records for 90 profile files, 28 bundles and 2 shared IRS add-ons. Every listed path, byte size and SHA-256 digest matches its file.
- All 28 ZIP bundles pass archive integrity checks. JSON, SVG and sitemap files parse successfully; local references in the main HTML resolve.
- Chromium browser smoke tests found no uncaught JavaScript exceptions or console errors. Both established profiles pass the in-page QA harness.
- Profile switching, the 120-entry asset catalogue, the Markdown document reader, Live Compare playback, A/B switching, pause/resume/stop and a blind A/B/X trial were exercised.
- A 390 px mobile viewport showed no horizontal page overflow.

### Corrections made during QA

- Updated stale repository and GitHub Pages references from `HyperAudioo` to `Hyperaudio_v2` in the README, site metadata, documentation reader, sitemap, robots file and repository map.
- Regenerated `assets.json`; the supplied manifest had omitted two historical VDC entries.
- Made asset-manifest ordering deterministic across builds.
- Corrected the EEL2 reference: the upstream EEL VM supports both counted `loop()` and condition-based `while()` constructs. The documentation now recommends bounded, predictable sample-time work rather than incorrectly describing `while` as unsupported.

### Still not certified

- The EEL2 scripts have not been executed in the RootlessJamesDSP/James34602 VM on an Android device.
- The KZ EDX Pro v5-HD EEL2 header still describes the earlier `EDX_Ultra.irs` / `EDX_Ultra_R.vdc` pairing rather than the selected `edx-hd-core` files. The limiter source may be generic, but its use with this selected trio needs target-app verification.
- No physical-device playback, acoustic measurement, true-peak measurement or controlled listening test was performed.

The repository/browser checks passed; release readiness for real-device DSP use remains conditional on the target-app checks above.
