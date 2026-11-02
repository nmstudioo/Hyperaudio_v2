# Redmi 12 Speaker · V6 Setup

This guide covers the selected Redmi 12 Speaker Established Profile. The V6 files are a matched three-file chain in `profiles/speaker/redmi-12/v6/`.

| Stage | File | Role |
|---|---|---|
| DDC | `ha-spk-v6.vdc` | 10-stage identity filterbank. |
| Convolver | `ha-spk-v6.irs` | Two-channel float32 stereo impulse response, 48 kHz. |
| Liveprog | `ha-spk-v6.eel` | Post-IRS stereo-linked lookahead limiter. |

## Before loading

Set RootlessJamesDSP to 48 kHz and verify the actual running rate. Disable additional EQ, bass enhancement and OEM sound effects while testing. Start at low volume.

## Load order

1. Load `ha-spk-v6.vdc` in DDC.
2. Load `ha-spk-v6.irs` in Convolver.
3. Load `ha-spk-v6.eel` in Liveprog.

The VDC is intentionally identity: it does not add a second tonal correction. The IRS is the correction response. The EEL2 script is a post-IRS protection stage and does not add tonal EQ.

## Default limiter parameters

The V6 EEL2 source declares a linked lookahead limiter with a 48-sample lookahead at 48 kHz (1 ms), input gain 0 dB, a default ceiling of −3 dBFS and 80 ms release. Check the values shown by the Liveprog UI after loading.

See the [technical report](technical-report.md) for file metrics and validation limits.

<div align="center">
<sub>HyperAudio · © 2026</sub>
</div>
