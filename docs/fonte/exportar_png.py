"""Converte os SVG de docs/diagramas em PNG (2x) usando o Microsoft Edge em modo headless."""
import os
import re
import shutil
import subprocess
import tempfile
from pathlib import Path

PASTA = Path(__file__).resolve().parent.parent / "diagramas"
EDGE = next(p for p in [
    Path(os.environ.get("ProgramFiles(x86)", "")) / "Microsoft/Edge/Application/msedge.exe",
    Path(os.environ.get("ProgramFiles", "")) / "Microsoft/Edge/Application/msedge.exe",
] if p.exists())

perfil = Path(tempfile.mkdtemp(prefix="edge-png-"))
try:
    for svg in sorted(PASTA.glob("*.svg")):
        conteudo = svg.read_text(encoding="utf-8")
        w, h = map(int, re.search(r'width="(\d+)" height="(\d+)"', conteudo).groups())
        html = perfil / f"{svg.stem}.html"
        html.write_text(f'<!doctype html><html><body style="margin:0">{conteudo}</body></html>', encoding="utf-8")
        png = svg.with_suffix(".png")
        subprocess.run([str(EDGE), "--headless=new", "--disable-gpu", "--hide-scrollbars",
                        f"--user-data-dir={perfil / 'perfil'}", "--force-device-scale-factor=2",
                        f"--window-size={w},{h}", f"--screenshot={png}", html.as_uri()],
                       check=True, capture_output=True, timeout=120)
        print(png.name, png.stat().st_size // 1024, "KB")
finally:
    shutil.rmtree(perfil, ignore_errors=True)
