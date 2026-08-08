#!/usr/bin/env python3
# Home-screen tile icons from the TSPi mark, padded onto a white square.
import sys
from PIL import Image

mark_path, out_dir = sys.argv[1], sys.argv[2]
mark = Image.open(mark_path).convert("RGBA")

sizes = {
    "apple-touch-icon.png": 180,
    "icon-192.png": 192,
    "icon-512.png": 512,
}

for name, size in sizes.items():
    canvas = Image.new("RGBA", (size, size), (255, 255, 255, 255))
    pad = int(size * 0.16)
    inner = size - pad * 2
    resized = mark.resize((inner, inner), Image.LANCZOS)
    canvas.paste(resized, (pad, pad), resized)
    canvas.convert("RGB").save(f"{out_dir}/{name}")
    print(f"wrote {out_dir}/{name}")
