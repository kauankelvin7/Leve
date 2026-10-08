#!/usr/bin/env python3
"""Finish the V3 Remotion render and generate separate delivery derivatives."""
import hashlib
import json
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'output'
VISUAL = OUT / 'v3-visual-render.mp4'
MIX = ROOT / 'audio/mix/leve-mix.wav'


def run(args):
    subprocess.run(args, check=True)


def probe(path):
    return json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', str(path)]))


visual = probe(VISUAL)
v = next(s for s in visual['streams'] if s['codec_type'] == 'video')
assert (v['width'], v['height'], v['pix_fmt'], v['r_frame_rate']) == (1920, 1080, 'yuv420p', '60/1')
assert v.get('color_space') == 'bt709', 'Remotion must convert RGB captures with the BT.709 matrix.'
assert 65 <= float(visual['format']['duration']) <= 80
assert MIX.is_file(), 'Generate the original music/SFX mix first.'
master = OUT / 'leve-product-film.mp4'
muted = OUT / 'leve-product-film-muted.mp4'
readme = OUT / 'leve-product-film-readme.mp4'
base = ['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y']
run(base + ['-i', str(VISUAL), '-map', '0:v:0', '-c:v', 'copy', '-bsf:v', 'h264_metadata=colour_primaries=1:transfer_characteristics=1:matrix_coefficients=1', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-an', '-movflags', '+faststart', str(muted)])
run(base + ['-i', str(muted), '-i', str(MIX), '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-ac', '2', '-shortest', '-movflags', '+faststart', str(master)])
for crf in (24, 27, 29):
    run(base + ['-i', str(muted), '-vf', 'scale=1280:720:flags=lanczos', '-an', '-c:v', 'libx264', '-preset', 'medium', '-crf', str(crf), '-pix_fmt', 'yuv420p', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-movflags', '+faststart', str(readme)])
    if readme.stat().st_size <= 10_000_000:
        break
assert readme.stat().st_size <= 10_000_000
run(base + ['-ss', '4.2', '-i', str(master), '-frames:v', '1', '-update', '1', str(OUT / 'poster.png')])
meter = subprocess.run(['ffmpeg', '-hide_banner', '-i', str(master), '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-'], check=True, capture_output=True, text=True)
measurement = json.loads(re.findall(r'\{\s*"input_i".*?\}', meter.stderr, re.S)[-1])
measurement['artifact'] = 'leve-product-film.mp4'
measurement['sha256'] = hashlib.sha256(master.read_bytes()).hexdigest()
(OUT / 'master-loudness.json').write_text(json.dumps(measurement, indent=2) + '\n')
print(json.dumps({'master': str(master), 'muted': str(muted), 'readme_bytes': readme.stat().st_size, 'readme_crf': crf, 'measured_lufs': measurement['input_i'], 'measured_dbtp': measurement['input_tp']}, indent=2))
