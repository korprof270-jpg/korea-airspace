# 녹색 단색 배경 따내기: 가장자리 색을 배경으로 잡고 색 거리로 투명도, 가장자리 녹색 번짐 제거, 인물 영역으로 자르기
import sys, numpy as np
from PIL import Image, ImageFilter
src, dst = sys.argv[1], sys.argv[2]
im = np.asarray(Image.open(src).convert("RGB")).astype(np.float32)
h, w, _ = im.shape
edge = np.concatenate([im[:6].reshape(-1,3), im[-6:].reshape(-1,3), im[:, :6].reshape(-1,3), im[:, -6:].reshape(-1,3)])
bg = np.median(edge, axis=0)
d = np.sqrt(((im - bg) ** 2).sum(-1))
# 녹색 우세도도 함께 본다 (배경과 비슷한 녹색은 투명)
r, g, b = im[...,0], im[...,1], im[...,2]
gdom = g - np.maximum(r, b)
bgdom = bg[1] - max(bg[0], bg[2])
lo, hi = 28, 70
a = np.clip((d - lo) / (hi - lo), 0, 1)
a = np.where((gdom > bgdom * 0.55) & (d < 110), np.minimum(a, np.clip((bgdom*0.9 - gdom) / (bgdom*0.5 + 1), 0, 1)), a)
# 가장자리 녹색 번짐 제거
spill = np.clip(g - np.maximum(r, b), 0, None) * (1 - a) * 1.0 + np.clip(g - (r + b) / 2 - 8, 0, None) * (a < 0.98)
out = im.copy(); out[...,1] = np.clip(g - spill * 0.9, 0, 255)
A = Image.fromarray((a * 255).astype(np.uint8)).filter(ImageFilter.MedianFilter(3))
img = Image.fromarray(out.astype(np.uint8)).convert("RGBA"); img.putalpha(A)
bbox = A.point(lambda v: 255 if v > 40 else 0).getbbox()
x0, y0, x1, y1 = bbox; pad = 12
img = img.crop((max(0, x0 - pad), max(0, y0 - pad), min(w, x1 + pad), min(h, y1 + 2)))
img.save(dst, optimize=True)
print(dst, img.size, "bg", bg.round())
