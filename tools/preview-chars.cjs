// 인물 일러스트 미리보기: node tools/preview-chars.cjs <id> [출력.png]
// 6개 표정을 한 장에 렌더링 + 얼굴 확대 줄. 배경은 실제 장면 배경(작전실 톤)
const { chromium } = require("playwright");
const fs = require("fs"), path = require("path");
(async () => {
  const id = process.argv[2], out = process.argv[3] || `/tmp/${id}-preview.png`;
  const dir = path.resolve("sim/img/story/chars");
  const ex = ["normal", "smile", "angry", "sad", "surprise", "serious"];
  const uri = (e) => "data:image/svg+xml;base64," + fs.readFileSync(path.join(dir, `${id}_${e}.svg`)).toString("base64");
  const bg = "data:image/jpeg;base64," + fs.readFileSync(path.resolve("sim/img/story/factory.jpg")).toString("base64");
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1800, height: 1500 } });
  await page.setContent(`<body style="margin:0;background:#0c1424">
    <div style="display:flex;background:url(${bg}) center/cover;height:900px">${ex.map((e) => `<div style="flex:1;position:relative"><img src="${uri(e)}" style="position:absolute;bottom:0;left:50%;transform:translateX(-50%);height:880px"><span style="position:absolute;top:6px;left:8px;color:#fff;font:700 16px sans-serif;text-shadow:0 1px 2px #000">${e}</span></div>`).join("")}</div>
    <div style="display:flex;height:600px">${ex.map((e) => `<div style="flex:1;overflow:hidden;position:relative;background:#1a2438"><img src="${uri(e)}" style="position:absolute;width:300%;left:-100%;top:-6%"></div>`).join("")}</div></body>`);
  await page.waitForTimeout(800);
  await page.screenshot({ path: out });
  await browser.close();
  console.log("saved", out);
})();
