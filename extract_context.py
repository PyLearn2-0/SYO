"""Find every question whose PDF page carries a content image (dropped
logs/tables/output screenshots) and extract those images for transcription."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

import pypdf

PDF_PATH = Path(
    r"C:\Users\lil man\Downloads"
    r"\SY0-701_Answers.pdf_12e1a7ac7e857472d1c31e4fd6515dbf5dc56731a21a7ab01cdc03f43377c8ca.pdf"
)
OUT_DIR = Path(__file__).parent / "_ctx_images"
TOPIC_RE = re.compile(r"Topic\s*(\d+)\s*Question\s*#\s*(\d+)", re.IGNORECASE)

sys.stdout.reconfigure(encoding="utf-8")

known_ids = {
    q["number"]
    for q in json.loads((Path(__file__).parent / "data" / "questions.json").read_text(encoding="utf-8"))
}

reader = pypdf.PdfReader(str(PDF_PATH))
OUT_DIR.mkdir(exist_ok=True)

rows = []
for idx, page in enumerate(reader.pages):
    text = page.extract_text() or ""
    matches = list(TOPIC_RE.finditer(text))
    if not matches:
        continue
    qnum = int(matches[-1].group(2))
    if qnum not in known_ids:
        continue
    try:
        images = page.images
    except Exception:
        images = []
    if not images:
        continue
    # The question body sits after the marker; only flag pages whose stem
    # hints at embedded data OR that have a large image (content screenshot).
    for i, img in enumerate(images):
        try:
            data = img.data
        except Exception:
            continue
        if len(data) < 3000:  # skip tiny icons/avatars
            continue
        name = f"q{qnum}_p{idx+1}_{i}.png"
        (OUT_DIR / name).write_bytes(data)
        rows.append((qnum, idx + 1, i, len(data), name))

rows.sort()
print(f"{len(rows)} content images across {len({r[0] for r in rows})} questions")
for qnum, pageno, i, size, name in rows:
    print(f"  Q#{qnum:<5} page {pageno:<5} img {i} {size:>8}B -> {name}")
