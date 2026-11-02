# HyperAudio · Methodology

This document separates digital file checks from host, device and listening validation.

## Evidence model

| Evidence level | Definition |
|---|---|
| Offline / numerical | File parsing, coefficient checks, sample integrity and static source review. |
| App / device | Execution inside RootlessJamesDSP on the intended Android device. |
| Listening | Controlled or informal listening evaluation on the intended transducer. |

A file that passes numerical checks is not automatically validated for a device. The current selected profiles have file-level checks; native app, device, acoustic and listening validation remain unclaimed.

## Processing architecture

The selected chain is VDC/DDC → IRS/Convolver → EEL2/Liveprog.

The KZ EDX Pro v5-HD VDC contains 14 biquad sections and its IRS contains 2,851 frames per channel. The Redmi 12 Speaker V6 VDC is a 10-section identity bank and its IRS contains 8,192 frames per channel. Both IRS files are float32 at 48 kHz. These frame counts describe the digital assets, not acoustic resolution.

The IEM v5-HD EEL2 file is retained unchanged from its supplied folder, but its source header references an earlier Ultra IRS/VDC pair. Verify that pairing in the target Liveprog runtime before enabling it with v5-HD.

## Sample rate

The selected IRS assets are authored at 48 kHz. Configure the DSP host for 48 kHz where supported and verify the running rate. A different host rate requires resampling and may change timing and response.

## Limits of the browser preview

Live Compare uses browser IIR filters and the native browser convolver for the selected VDC and IRS. It does not emulate EEL2, RootlessJamesDSP's complete processing graph, Android resampling, hardware calibration, the transducer, room acoustics or the listener's fit/position. Its predicted response is digital analysis, not a microphone measurement.

## Reproducibility

`data/Raw/` and `data/target/` retain source measurement and target-curve text files. The full profile-generation toolchain is not present in this repository, so the hosted IRS files cannot be completely regenerated from the repository alone. The website's `tools/build_assets.py` script does regenerate asset sizes, SHA-256 values, the manifest and ZIP bundles from the files that are present.

<div align="center">
<sub>HyperAudio · © 2026</sub>
</div>
