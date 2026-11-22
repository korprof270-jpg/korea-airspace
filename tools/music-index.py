# 배경음 분석 → sim/audio/bgm/index.json (music.js 가 단조로운 구간을 건너뛰고, 변화가 많은 지점에서 반복을 시작한다)
# 사용: python3 tools/music-index.py  (sim/audio/bgm 의 전투·비행 곡을 분석)
# 곡의 단조로운 구간 찾기: 2초 단위로 음색(대역 에너지)·세기 특징을 뽑아, 앞뒤 구간과 거의 같은 상태가 오래 이어지는 곳을 찾는다
import subprocess, sys, json, numpy as np
SR = 11025
def load(p):
    raw = subprocess.run(["ffmpeg", "-v", "quiet", "-i", p, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.float32)
def feats(x, hop=1.0):
    n = int(SR * hop); fr = len(x) // n; F = []
    edges = np.geomspace(40, SR / 2, 17)
    for i in range(fr):
        seg = x[i * n:(i + 1) * n] * np.hanning(n)
        sp = np.abs(np.fft.rfft(seg)); fq = np.fft.rfftfreq(n, 1 / SR)
        bands = [sp[(fq >= edges[j]) & (fq < edges[j + 1])].sum() for j in range(16)]
        b = np.log1p(np.array(bands)); rms = np.sqrt((x[i * n:(i + 1) * n] ** 2).mean())
        # 리듬 변화: 짧은 구간 세기 변동
        m = (n // 16) * 16; sub = x[i * n:i * n + m].reshape(16, -1); env = np.sqrt((sub ** 2).mean(1))
        F.append(np.concatenate([b / (np.linalg.norm(b) + 1e-9), [np.log1p(rms * 50)], env / (env.max() + 1e-9)]))
    return np.array(F)
import os, glob
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "sim", "audio", "bgm")
files = sys.argv[1:] or [f for f in sorted(glob.glob(os.path.join(ROOT, "*.mp3"))) if not os.path.basename(f).startswith("vn_")]
out = {}
for p in files:
    x = load(p); F = feats(x); T = len(F)
    d = np.linalg.norm(np.diff(F, axis=0), axis=1); k = 10
    dm = np.convolve(d, np.ones(k) / k, mode="same")
    thr = np.percentile(dm, 30)
    flat = dm < thr; spans = []; s0 = None
    for i, f in enumerate(flat):
        if f and s0 is None: s0 = i
        if (not f or i == len(flat) - 1) and s0 is not None:
            e = i if not f else i + 1
            if e - s0 >= 14: spans.append([s0, e])
            s0 = None
    # 건너뛰기: 단조 구간의 처음 6초만 듣고 나머지는 건너뛴다 (곡 끝 6초 전까지만)
    skip = [[a + 6, min(b, T - 6)] for a, b in spans if min(b, T - 6) - (a + 6) >= 6]
    # 반복 시작점: 곡의 20~70% 사이에서 변화가 가장 큰 8초 창의 시작 (건너뛰기 구간 밖)
    best, bi = -1, int(T * 0.3)
    for t in range(int(T * 0.2), int(T * 0.7)):
        if any(a - 2 <= t <= b for a, b in skip): continue
        v = float(dm[t:t + 8].mean())
        if v > best: best, bi = v, t
    out[os.path.splitext(os.path.basename(p))[0]] = {"skip": skip, "loop": bi}
json.dump(out, open(os.path.join(ROOT, "index.json"), "w"), indent=1)
print(json.dumps(out))
