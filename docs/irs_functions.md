# HyperAudio · IRS Reference

An `.irs` file is a WAV container carrying an impulse response for the RootlessJamesDSP Convolver. The established profiles use IEEE float32 samples at 48 kHz.

## Established IRS files

| Device | Release | Channels | Frames per channel | Layout |
|---|---|---:|---:|---|
| KZ EDX Pro | v5-HD | 4 | 2,851 | True-stereo matrix impulse response. |
| Redmi 12 Speaker | V6 | 2 | 8,192 | Stereo impulse response. |

The IEM v5-HD file is four-channel true stereo, not an ordinary stereo file. The browser preview passes its four channels directly to a four-channel `ConvolverNode` with normalization disabled. In the Web Audio true-stereo matrix layout the channels represent the four input/output paths; the browser preview includes left-only and right-only test tones to help inspect routing. Confirm the four-channel interpretation in the target Android convolver before relying on it.

The Speaker V6 file is a two-channel stereo impulse response. It is not the same type of four-channel matrix.

## File format

The files use RIFF/WAVE with audio format code `3` (IEEE float), 32 bits per sample, and a 48 kHz sample rate. A WAV parser must inspect chunk identifiers and sizes rather than assume that the `data` chunk always begins at byte 44.

## Processing

The signal chain uses VDC → IRS → EEL2. The IEM VDC is a 14-stage biquad bank; the Speaker V6 VDC is identity. The IRS is then convolved with the audio. Optional IRS add-ons replace the selected core IRS in the Convolver; do not stack multiple IRS files in the same stage.

## Digital and acoustic limits

An impulse response describes a linear time-invariant digital filter. Its file-level frequency response is not a measurement of the complete device, room or listener position. The browser response plot is calculated from the hosted coefficients and samples; it is not calibrated acoustic evidence.

<div align="center">
<sub>HyperAudio · © 2026</sub>
</div>
