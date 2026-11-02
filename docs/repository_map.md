# HyperAudio · Repository Map

```text
Hyperaudio_v2/
├── index.html
├── README.md
├── assets.json
├── ATTRIBUTION.md
├── LICENSE*
├── profiles/
│   ├── iem/kz-edx-pro/
│   │   ├── v1/ … v10/
│   │   ├── v5/c, v5/g, v5/z
│   │   ├── v5-hd/
│   │   ├── v2-absolute, v2-advanced, v2-ultimate, v2-ultra/
│   │   └── unity/, legacy/
│   └── speaker/redmi-12/
│       ├── v1/, v5/, v6/, v7/, v7-c/, v8/, v9/, v10/
│       ├── ad-v7/, unity/
│       └── experimental/v6-1-beta/
├── addons/
├── downloads/bundles/
├── tools/build_assets.py
├── docs/
│   ├── devices/kz-edx-pro/
│   ├── devices/redmi-12/
│   └── DSP references, methodology and test reports
└── assets/
    ├── style.css, script.js, downloads.js, compare.js
    ├── docs.js, enhance.js
    └── graphics, icons and fonts
```

## Asset paths and names

All `.irs`, `.vdc` and `.eel` profile files use lowercase kebab-case names. Directories follow device → model → release → asset. Historical variants remain separated from the selected Established Profiles. The established IEM files are in `profiles/iem/kz-edx-pro/v5-hd/`; the established Speaker files are in `profiles/speaker/redmi-12/v6/`.

`assets.json` is generated from the files by `tools/build_assets.py`. The script creates per-release bundles and `downloads/bundles/hyperaudio-asset-library.zip`, then records exact byte sizes and SHA-256 hashes. Run `python tools/build_assets.py` after changing the asset library.

The website is static and has no framework build step. `assets/script.js` handles profile selection and file QA, `assets/downloads.js` renders the manifest, and `assets/compare.js` implements the experimental browser A/B preview.

<div align="center">
<sub>HyperAudio · © 2026</sub>
</div>
