#!/usr/bin/env python3
"""Compare corresponding Playwright captures from two deterministic runs."""
from pathlib import Path
import json
import sys

import numpy as np
from PIL import Image

root = Path("video/assets/captures")
left_name, right_name = sys.argv[1:3] if len(sys.argv) == 3 else ("run-1", "run-2")
left = json.loads((root / left_name / "manifest.json").read_text())
right = json.loads((root / right_name / "manifest.json").read_text())
results = []

def compare(scene, item_left, item_right):
    path_left = Path(item_left.get("path", item_left.get("capture")))
    path_right = Path(item_right.get("path", item_right.get("capture")))
    image_left = np.asarray(Image.open(path_left).convert("RGB"), dtype=np.int16)
    image_right = np.asarray(Image.open(path_right).convert("RGB"), dtype=np.int16)
    if image_left.shape != image_right.shape:
        raise SystemExit(f"Dimension mismatch: {path_left} vs {path_right}")
    delta = np.abs(image_left - image_right)
    max_by_pixel = delta.max(axis=2)
    result = {
        "scene": scene,
        "file": path_left.name,
        "dimensions": f"{image_left.shape[1]}x{image_left.shape[0]}",
        "identical_pixels_pct": round(float(np.mean(max_by_pixel == 0) * 100), 4),
        "pixels_over_8_pct": round(float(np.mean(max_by_pixel > 8) * 100), 4),
        "mean_absolute_channel_difference": round(float(delta.mean()), 4),
        "max_channel_difference": int(delta.max()),
    }
    # Rendering tolerance permits small antialiasing/animation-region changes,
    # while exact screenshot anchors must still be visually very close overall.
    result["within_tolerance"] = result["pixels_over_8_pct"] <= 5 and result["mean_absolute_channel_difference"] <= 3
    results.append(result)

for scene, record in left["scenes"].items():
    captures_left = record["captures"]
    captures_right = right["scenes"][scene]["captures"]
    if len(captures_left) != len(captures_right):
        raise SystemExit(f"Capture count mismatch in {scene}")
    for a, b in zip(captures_left, captures_right):
        compare(scene, a, b)
if "mobile" in left and "mobile" in right:
    compare("calendar-mobile", left["mobile"], right["mobile"])
print(json.dumps({"runs": [left_name, right_name], "captures": results, "all_within_tolerance": all(item["within_tolerance"] for item in results)}, indent=2))
