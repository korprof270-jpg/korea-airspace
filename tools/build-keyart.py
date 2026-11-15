# 타이틀 키 아트: 본편 인물을 겹겹이 배치한 한 장 (투명 배경)
from PIL import Image, ImageEnhance, ImageFilter
D = "/home/user/korea-airspace/sim/img/story/chars/"
W, H = 2400, 1300
cv = Image.new("RGBA", (W, H), (0, 0, 0, 0))
def put(id, cx, h, top, bright=1.0, alpha=1.0, flip=False, glow=None):
    im = Image.open(D + id + "_normal.webp").convert("RGBA")
    if flip: im = im.transpose(Image.FLIP_LEFT_RIGHT)
    im = im.resize((int(im.width * h / im.height), h), Image.LANCZOS)
    if bright != 1.0:
        rgb = ImageEnhance.Brightness(im.convert("RGB")).enhance(bright); rgb.putalpha(im.getchannel("A")); im = rgb
    if alpha != 1.0: im.putalpha(im.getchannel("A").point(lambda v: int(v * alpha)))
    if glow:   # 뒤쪽 빛 테두리
        g = Image.new("RGBA", im.size, glow); g.putalpha(im.getchannel("A").filter(ImageFilter.GaussianBlur(18)).point(lambda v: int(v * 0.55)))
        cv.alpha_composite(g, (int(cx - im.width / 2), top))
    cv.alpha_composite(im, (int(cx - im.width / 2), top))
# 뒤: 적 (어둡게)
put("eia", 430, 1500, -60, bright=0.42, alpha=0.9, glow=(255, 45, 61, 255))
put("varga", 1990, 1420, 40, bright=0.42, alpha=0.9, flip=True, glow=(255, 45, 61, 255))
# 가운데 줄
put("kang", 720, 1250, 170, bright=0.78)
put("bau", 1700, 1280, 150, bright=0.8, flip=True)
# 앞줄
put("yuri", 470, 1180, 330)
put("moa", 1950, 1220, 300, flip=True)
put("harin", 1030, 1400, 110)
put("doyun", 1400, 1400, 120)
cv.save("/home/user/korea-airspace/sim/img/title/keyart.webp", "WEBP", quality=88, method=6)
prev = Image.open("/home/user/korea-airspace/sim/img/title/2-combat.jpg").convert("RGBA").resize((W, int(W * 9 / 16)))
bg = Image.new("RGBA", (W, H)); bg.paste(prev.crop((0, 0, W, H)), (0, 0)); bg = Image.alpha_composite(bg, Image.new("RGBA", (W, H), (5, 8, 18, 150)))
bg.alpha_composite(cv); bg.convert("RGB").resize((1200, 650)).save("/tmp/claude-0/-home-user-korea-airspace/1b458f86-960e-5244-bd16-d3566aa39a56/scratchpad/shots/keyart.jpg", quality=85)
