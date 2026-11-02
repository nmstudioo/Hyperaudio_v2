# KZ EDX Pro · v5-HD Setup

This guide covers the selected KZ EDX Pro Established Profile. The three files are retained together in `profiles/iem/kz-edx-pro/v5-hd/`.

| Stage | File | Role |
|---|---|---|
| DDC | `edx-hd-core.vdc` | 14-stage IIR biquad correction bank. |
| Convolver | `edx-hd-core.irs` | Four-channel float32 true-stereo impulse response, 48 kHz. |
| Liveprog | `edx-ultra.eel` | Lookahead limiter source; no tonal EQ. |

## Before loading

Set the RootlessJamesDSP processing rate to 48 kHz and verify the rate reported by the running engine. Disable duplicate EQ and OEM sound processing while evaluating this profile. Start at a low listening level.

## Load order

1. Load `edx-hd-core.vdc` in DDC.
2. Load `edx-hd-core.irs` in Convolver. Keep any separate convolver preamp at 0 dB unless a measured host-specific adjustment is required.
3. Review `edx-ultra.eel` before enabling it in Liveprog.

## EEL2 pairing note

The v5-HD folder's EEL2 file is named `edx-ultra.eel`. Its source header describes an earlier chain using `EDX_Ultra.irs` and `EDX_Ultra_R.vdc`, not the two `edx-hd-core` files. The limiter source itself contains a generic stereo-linked lookahead stage, but the header's original pairing is not the selected v5-HD pair. This repository preserves the file unchanged; treat its use with v5-HD as requiring independent app/device verification.

## File facts

The IRS contains 2,851 frames in each of four channels at 48 kHz. The VDC has 14 sections in each sample-rate bank; its 48 kHz bank has a maximum calculated pole radius of 0.99908846. These are file-level numerical checks, not proof of native app behavior or listening quality.

See the [technical report](technical-report.md) for the validation boundary.

<div align="center">
<sub>HyperAudio · © 2026</sub>
</div>
