# 녹색 단색 배경 따내기: 가장자리 색을 배경으로 잡고 색 거리로 투명도, 가장자리 녹색 번짐 제거, 인물 영역으로 자르기
import sys, numpy as np
from PIL import Image, ImageFilter
src, dst = sys.argv[1], sys.argv[2]
HARD = "--hard" in sys.argv   # 녹색으로 물든 빛 번짐·증기·그림자까지 지운다 (녹색 소품이 없는 인물만)
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
# 배경과 아주 가까운 녹색 기운만 더 투명하게 (밝은 흰색·회색 위의 옅은 민트빛은 건드리지 않는다)
near = (gdom > bgdom * 0.55) & (d < 60)
a = np.where(near, np.minimum(a, np.clip((bgdom*0.9 - gdom) / (bgdom*0.5 + 1), 0, 1)), a)
# 안쪽 보호: 가장자리에서 배경색으로 이어진 영역만 지운다. 인물 안쪽의 배경과 비슷한 색(셔츠 그림자 등)은 남기고,
# 안쪽에 갇힌 진짜 배경(팔과 몸 사이 틈)은 배경과 거의 같은 색일 때만 지운다
from PIL import ImageDraw
bgl = Image.fromarray(((d < 48) * 255).astype(np.uint8))
for (x, y) in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)] + [(x, 0) for x in range(0, w, 40)] + [(x, h - 1) for x in range(0, w, 40)] + [(0, y) for y in range(0, h, 40)] + [(w - 1, y) for y in range(0, h, 40)]:
    if bgl.getpixel((x, y)) == 255: ImageDraw.floodfill(bgl, (x, y), 128)
ext = np.asarray(bgl) == 128
a = np.where(ext | (d < 16), a, np.maximum(a, np.clip((d - 8) / 20, 0, 1) * (d >= 16) + (d < 16) * a))
a = np.where(~ext & (d >= 16), 1.0, a)
# 가장자리 녹색 번짐 제거
spill = np.clip(g - np.maximum(r, b), 0, None) * (1 - a) + np.clip(g - (r + b) / 2 - 8, 0, None) * (a < 0.98)
out = im.copy(); out[...,1] = np.clip(g - spill * 0.9, 0, 255)
if HARD:
    gd = g - np.maximum(r, b)
    a = a * np.clip(1 - (gd - 18) / 55, 0, 1)
    out[...,1] = np.minimum(out[...,1], np.maximum(r, b) + 6)
A = Image.fromarray((a * 255).astype(np.uint8)).filter(ImageFilter.MedianFilter(3))
img = Image.fromarray(out.astype(np.uint8)).convert("RGBA"); img.putalpha(A)
bbox = A.point(lambda v: 255 if v > 40 else 0).getbbox()
x0, y0, x1, y1 = bbox; pad = 12
img = img.crop((max(0, x0 - pad), max(0, y0 - pad), min(w, x1 + pad), min(h, y1 + 2)))
img.save(dst, optimize=True)
print(dst, img.size, "bg", bg.round())
