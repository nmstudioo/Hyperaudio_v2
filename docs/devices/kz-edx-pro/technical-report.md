# KZ EDX Pro · v5-HD Technical Report

## Selected files

| Component | Path | File-level finding |
|---|---|---|
| VDC | `profiles/iem/kz-edx-pro/v5-hd/edx-hd-core.vdc` | 14 biquad sections; 48 kHz maximum pole radius 0.99908846. |
| IRS | `profiles/iem/kz-edx-pro/v5-hd/edx-hd-core.irs` | 48 kHz, IEEE float32, four channels, 2,851 frames per channel. |
| EEL2 | `profiles/iem/kz-edx-pro/v5-hd/edx-ultra.eel` | Three declared sliders; static `@init` / `@sample` structure parses. |

## IRS integrity

The four-channel IRS is finite. The matrix symmetry checks are `ch0 = ch3` and `ch1 = ch2`. Its maximum sample peak is approximately −2.60 dBFS; the last 256 samples peak near −161.8 dBFS. The L1 value shown by the browser QA is a diagnostic and is not used as a universal pass/fail threshold.

## VDC stability

The 48 kHz bank contains 14 sections. Pole radii are calculated from the Viper DDC feedback convention documented in [VDC reference](../../vdc_functions.md). The highest calculated radius is approximately 0.99908846, below unity. This establishes coefficient-level stability under that recurrence model; it does not prove bit-identical behavior in every host implementation.

## EEL2 pairing caveat

The EEL source header describes `EDX_Ultra.irs` and `EDX_Ultra_R.vdc`, whereas the selected v5-HD IRS and VDC are both named `edx-hd-core`. The script is retained byte-for-byte from the supplied v5-HD folder. Its header mismatch is disclosed rather than silently rewritten. Validate its use with v5-HD in the target Liveprog runtime before relying on it.

## Evidence boundary

These results are static file checks. They are not native RootlessJamesDSP execution, ARM validation, Redmi/KZ device validation or controlled listening-test evidence. The browser Live Compare is an experimental approximation and excludes EEL2.

<div align="center">
<sub>HyperAudio · © 2026</sub>
</div>
