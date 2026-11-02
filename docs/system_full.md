# HyperAudio · System Reference

This document describes the current KZ EDX Pro v5-HD and Redmi 12 Speaker V6 profile architecture.

## Processing architecture

| Profile | VDC / DDC | IRS / Convolver | EEL2 / Liveprog |
|---|---|---|---|
| KZ EDX Pro v5-HD | 14-stage tonal biquad bank | 4-channel float32 true-stereo response, 48 kHz | Lookahead limiter source; header names an earlier Ultra IRS/VDC pair, so verify independently before enabling. |
| Redmi 12 Speaker V6 | 10-stage identity bank | 2-channel float32 stereo response, 48 kHz | Post-IRS stereo-linked lookahead limiter. |

The intended signal path is Source → VDC/DDC → IRS/Convolver → EEL2/Liveprog → Output. The VDC behavior differs by profile: the IEM v5-HD bank applies tonal biquad correction, while the Speaker V6 bank is identity. The IRS contributes to each profile's correction chain. Do not assume that every file sharing a device folder is compatible; keep releases paired and review each manifest warning.

## Selected files

- IEM: `profiles/iem/kz-edx-pro/v5-hd/`
- Speaker: `profiles/speaker/redmi-12/v6/`

All profile files use lowercase kebab-case names. `assets.json` records the relative file paths, byte sizes, SHA-256 values, release groupings, status and compatibility notes. Regenerate it and the release bundles with `python tools/build_assets.py` after changing the library.

## The `data/` directory

The `data/` directory retains source measurement and target-curve material supplied with the repository. The target illustrations are contextual design references, not proof that the currently selected profile files were measured or validated on the target device.

## Add-ons

`addons/` contains optional impulse responses and EasyEffects reference JSON files. An add-on IRS replaces the core IRS in the Convolver; the two responses are not stacked. The add-on impulse responses have measured gain above the project's nominal gate, so lower the volume before testing them. See [the add-on guide](../addons/effects.md).

## Verification boundary

The website checks supported RIFF/WAVE float32 layouts, finite samples, channel-matrix symmetry, sample peaks and tails, VDC coefficient structure and pole stability, and basic EEL2 source structure. These checks do not prove native RootlessJamesDSP behavior, exact Android/ARM parity, acoustic response or listening quality. The browser Live Compare is an experimental VDC/IRS preview and does not emulate EEL2.

<div align="center">
<sub>HyperAudio · © 2026</sub>
</div>
