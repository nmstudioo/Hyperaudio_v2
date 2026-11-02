from pathlib import Path
from hashlib import sha256
from zipfile import ZipFile, ZIP_DEFLATED
import json
import re

ROOT = Path(__file__).resolve().parents[1]
PROFILE_ROOT = ROOT / "profiles"
ADDON_ROOT = ROOT / "addons"
BUNDLE_ROOT = ROOT / "downloads" / "bundles"
MANIFEST = ROOT / "assets.json"
TYPE_ORDER = {"vdc": 0, "irs": 1, "eel": 2, "bundle": 3}
DEVICE_INFO = {
    "iem": {"name": "KZ EDX Pro", "path": "profiles/iem/kz-edx-pro"},
    "speaker": {"name": "Redmi 12 Speaker", "path": "profiles/speaker/redmi-12"},
}


def digest(path):
    h = sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def human_size(size):
    if size < 1024:
        return f"{size} B"
    if size < 1024 * 1024:
        return f"{size / 1024:.1f} KB"
    return f"{size / (1024 * 1024):.2f} MB"


def title_case(value):
    return " ".join(part.upper() if part in {"iem", "spk", "vdc", "eel", "hd"} else part.capitalize() for part in re.split(r"[-_/]+", value) if part)


def release_title(device, relative):
    parts = Path(relative).parts
    base = " / ".join(title_case(p) for p in parts[:-1])
    return base or DEVICE_INFO[device]["name"]


def metadata(device, path):
    rel = path.relative_to(ROOT).as_posix()
    parts = Path(rel).parts
    release = "/".join(parts[3:-1])
    ext = path.suffix.lower().lstrip(".")
    filename = path.name
    is_iem_core = rel.startswith("profiles/iem/kz-edx-pro/v5-hd/")
    is_spk_core = rel.startswith("profiles/speaker/redmi-12/v6/")
    is_absolute = "v2-absolute" in rel and ext == "vdc"
    is_crossfeed = "crossfeed" in rel or "crossfeed" in filename
    status = "Archive"
    note = f"Historical {title_case(release)} asset. Retained as supplied; inspect its release notes before combining it with other versions."
    pairing = "Use only with compatible files from the same release. Do not mix versions."
    warning = ""
    if is_iem_core:
        status = "Numerically qualified" if ext in ("irs", "vdc") else "Source reviewed"
        note_map = {
            "irs": "KZ EDX Pro v5-HD true-stereo impulse response; 4-channel float32 at 48 kHz.",
            "vdc": "KZ EDX Pro v5-HD 14-stage Viper DDC filterbank at 48 kHz.",
            "eel": "Lookahead limiter EEL2 source; no tonal EQ. Its header names the earlier Ultra IRS/VDC pair.",
        }
        note = note_map[ext]
        pairing = "Core v5-HD trio: load the matching IRS, VDC and EEL2 files together. Browser preview omits EEL2."
        if ext == "eel":
            warning = "EEL header references EDX_Ultra.irs and EDX_Ultra_R.vdc; confirm the limiter is appropriate for this core pair before relying on it."
    elif is_spk_core:
        status = "Numerically qualified" if ext in ("irs", "vdc") else "Source reviewed"
        note_map = {
            "irs": "Redmi 12 Speaker V6 stereo float32 impulse response at 48 kHz.",
            "vdc": "Redmi 12 Speaker V6 10-stage identity Viper DDC filterbank.",
            "eel": "Redmi 12 Speaker V6 post-IRS linked lookahead limiter; no tonal EQ.",
        }
        note = note_map[ext]
        pairing = "Core Speaker V6 trio: load the matching IRS, VDC and EEL2 files together. Browser preview omits EEL2."
    elif is_absolute:
        status = "Standalone correction"
        note = "Absolute VDC correction variant. It is not an add-on to another tonal correction chain."
        pairing = "Standalone VDC profile; do not load an IRS correction with it."
        warning = "VDC only — turn the IRS/convolver off."
    elif is_crossfeed:
        status = "Experimental"
        note = "Optional crossfeed or spatial IRS variant; inspect its intended matrix and sample rate before use."
        pairing = "Replaces the intended core IRS; never stack it with another IRS."
        warning = "Optional IRS: use one convolver response at a time."
    elif ext == "eel":
        status = "Experimental"
        note = f"Historical EEL2 processing script from {title_case(release)}. Source retained unchanged."
        pairing = "Use only with the matching release configuration and verify processing order."
    elif ext == "vdc":
        status = "Experimental"
        note = f"Historical Viper DDC coefficient set from {title_case(release)}."
    elif ext == "irs":
        status = "Experimental"
        note = f"Historical impulse response from {title_case(release)}. Verify channel layout and sample rate before use."
    return {
        "id": rel.replace("/", "-").replace(".", "-"),
        "active": is_iem_core or is_spk_core,
        "device": device,
        "deviceName": DEVICE_INFO[device]["name"],
        "release": release,
        "releaseName": title_case(release) or "Shared",
        "type": ext,
        "typeLabel": ext.upper(),
        "name": filename,
        "path": rel,
        "size": path.stat().st_size,
        "sizeLabel": human_size(path.stat().st_size),
        "sha256": digest(path),
        "shaShort": digest(path)[:12],
        "status": status,
        "note": note,
        "pairing": pairing,
        "warning": warning,
        "order": TYPE_ORDER[ext],
        "releaseOrder": release_rank(release),
    }


def release_rank(release):
    if not release:
        return -1
    nums = [int(x) for x in re.findall(r"\d+", release)]
    return tuple(nums) if nums else (0,)


def create_zip(target, paths, root):
    target.parent.mkdir(parents=True, exist_ok=True)
    with ZipFile(target, "w", ZIP_DEFLATED, compresslevel=9) as z:
        for path in sorted(paths):
            z.write(path, path.relative_to(root).as_posix())


def main():
    BUNDLE_ROOT.mkdir(parents=True, exist_ok=True)
    for old in BUNDLE_ROOT.glob("*.zip"):
        old.unlink()
    records = []
    for device in ("iem", "speaker"):
        device_root = PROFILE_ROOT / device
        for path in device_root.rglob("*"):
            if path.is_file() and path.suffix.lower() in {".irs", ".vdc", ".eel"}:
                records.append(metadata(device, path))
        releases = {}
        for path in device_root.rglob("*"):
            if path.is_file() and path.suffix.lower() in {".irs", ".vdc", ".eel"}:
                rel_dir = path.parent.relative_to(device_root).as_posix()
                releases.setdefault(rel_dir, []).append(path)
        for release, paths in releases.items():
            bundle_name = f"{device}-{release.replace('/', '-')}.zip"
            target = BUNDLE_ROOT / bundle_name
            create_zip(target, paths, ROOT)
            records.append({
                "id": f"bundle-{device}-{release.replace('/', '-')}",
                "active": (device == "iem" and release == "v5-hd") or (device == "speaker" and release == "v6"),
                "device": device,
                "deviceName": DEVICE_INFO[device]["name"],
                "release": release,
                "releaseName": title_case(release),
                "type": "bundle",
                "typeLabel": "BUNDLE",
                "name": bundle_name,
                "path": target.relative_to(ROOT).as_posix(),
                "size": target.stat().st_size,
                "sizeLabel": human_size(target.stat().st_size),
                "sha256": digest(target),
                "shaShort": digest(target)[:12],
                "status": "Release bundle",
                "note": f"Complete {title_case(release)} asset folder in its original release grouping.",
                "pairing": "Contains only files from this release folder.",
                "warning": "Check individual file notes before loading a bundle's contents.",
                "order": TYPE_ORDER["bundle"],
                "releaseOrder": release_rank(release),
            })
    for path in ADDON_ROOT.rglob("*"):
        if path.is_file() and path.suffix.lower() in {".irs", ".vdc", ".eel"}:
            device = "shared"
            rel = path.relative_to(ROOT).as_posix()
            ext = path.suffix.lower().lstrip(".")
            h = digest(path)
            records.append({
                "id": rel.replace("/", "-").replace(".", "-"),
                "active": False,
                "device": device,
                "deviceName": "Shared Add-ons",
                "release": "addons",
                "releaseName": "Shared Add-ons",
                "type": ext,
                "typeLabel": ext.upper(),
                "name": path.name,
                "path": rel,
                "size": path.stat().st_size,
                "sizeLabel": human_size(path.stat().st_size),
                "sha256": h,
                "shaShort": h[:12],
                "status": "Optional",
                "note": "Optional third-party or reference effect; not part of either established core profile.",
                "pairing": "Use as a replacement effect only after checking its format and intended host.",
                "warning": "Do not stack impulse responses in the same convolver stage.",
                "order": TYPE_ORDER[ext],
                "releaseOrder": (0,),
            })
    library_paths = [p for base in (PROFILE_ROOT, ADDON_ROOT) for p in base.rglob("*") if p.is_file() and p.suffix.lower() in {".irs", ".vdc", ".eel", ".json", ".md"}]
    master = BUNDLE_ROOT / "hyperaudio-asset-library.zip"
    create_zip(master, library_paths, ROOT)
    h = digest(master)
    records.append({
        "id": "bundle-hyperaudio-asset-library",
        "active": False,
        "device": "shared",
        "deviceName": "Complete Library",
        "release": "all",
        "releaseName": "Complete Library",
        "type": "bundle",
        "typeLabel": "BUNDLE",
        "name": master.name,
        "path": master.relative_to(ROOT).as_posix(),
        "size": master.stat().st_size,
        "sizeLabel": human_size(master.stat().st_size),
        "sha256": h,
        "shaShort": h[:12],
        "status": "Full library",
        "note": "Complete profile and add-on library, preserving the device/release folder hierarchy.",
        "pairing": "Includes historical, experimental and established assets; review the individual manifest entries before use.",
        "warning": "Contains alternate releases that must not be mixed indiscriminately.",
        "order": TYPE_ORDER["bundle"],
        "releaseOrder": (999,),
    })
    records.sort(key=lambda x: (x["device"], x["order"], tuple(-n for n in x["releaseOrder"]), x["release"].casefold(), x["path"].casefold()))
    data = {
        "schemaVersion": 1,
        "generatedBy": "tools/build_assets.py",
        "generatedAt": "build-time",
        "devices": DEVICE_INFO,
        "assets": records,
    }
    MANIFEST.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {MANIFEST.relative_to(ROOT)} with {len(records)} records")
    print(f"Profile files: {sum(1 for base in (PROFILE_ROOT,) for p in base.rglob('*') if p.is_file())}")
    print(f"Bundles: {sum(1 for p in BUNDLE_ROOT.glob('*.zip'))}")


if __name__ == "__main__":
    main()
