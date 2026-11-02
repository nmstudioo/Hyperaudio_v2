# HyperAudio · VDC Reference

A `.vdc` file is a plain-text Viper DDC biquad bank used by the RootlessJamesDSP DDC stage. Each row begins with a sample-rate label and contains five coefficients per section in the order `b0, b1, b2, a1, a2`.

## Current established banks

| Device | Release | Sections | Function |
|---|---|---:|---|
| KZ EDX Pro | v5-HD | 14 | Tonal IIR correction. |
| Redmi 12 Speaker | V6 | 10 | Identity filterbank. |

Older releases and experimental assets may contain other stage counts and coefficient banks. Do not assume every VDC is identity or has ten stages.

## File structure

The current files contain `SR_44100:` and `SR_48000:` rows. Each row must have a coefficient count divisible by five, all values finite, and matching stage counts between the two rate banks. The current v5-HD bank contains 70 values per row; Speaker V6 contains 50.

Keep the text UTF-8 and preserve the exact coefficient order. Do not insert an AutoEQ preamp value into the coefficient sequence. There is no dedicated preamp slot.

## Feedback convention and stability

For the VDC files used here, the recurrence is:

`y[n] = b0·x[n] + b1·x[n−1] + b2·x[n−2] + a1·y[n−1] + a2·y[n−2]`

The corresponding transfer-function denominator is:

`1 − a1·z⁻¹ − a2·z⁻²`

Therefore, a browser `IIRFilterNode` uses denominator coefficients `[1, -a1, -a2]`. The poles are the roots of `z² − a1·z − a2 = 0`; a section is stable when every pole radius is below one. This sign convention is important: applying the opposite feedback signs changes the filter.

The browser verifier calculates these poles for every 48 kHz section and rejects a bank containing a radius greater than or equal to one. A stable pole calculation is a numerical check, not confirmation that every host's parser uses the identical recurrence.

## Preamp

A global preamp should be applied in a stage designed for gain control. Do not modify one or more biquad numerator coefficients ad hoc unless the entire VDC is intentionally being recalculated and revalidated.

<div align="center">
<sub>HyperAudio · © 2026</sub>
</div>
