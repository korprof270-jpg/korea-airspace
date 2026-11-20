// PC 앱: 게임 파일을 app:// 주소로 띄운다 (ES 모듈·게임패드·전체 화면이 그대로 동작)
const { app, BrowserWindow, protocol, net, Menu, shell } = require("electron");
const path = require("path");
const { pathToFileURL } = require("url");

const WEB = path.join(__dirname, "web");
protocol.registerSchemesAsPrivileged([{ scheme: "app", privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } }]);

function createWindow() {
  const win = new BrowserWindow({
    width: 1600, height: 900, minWidth: 960, minHeight: 540,
    backgroundColor: "#0b1020", title: "FPV PROJECT", autoHideMenuBar: true,
    icon: path.join(WEB, "icons", "icon-512.png"),
    webPreferences: { contextIsolation: true, backgroundThrottling: false },
  });
  win.loadURL("app://game/sim/index.html");
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action: "deny" }; });
  win.webContents.on("before-input-event", (e, i) => {
    if (i.type !== "keyDown") return;
    if (i.key === "F11") { win.setFullScreen(!win.isFullScreen()); e.preventDefault(); }
    if (i.key === "F12" && !app.isPackaged) win.webContents.toggleDevTools();
  });
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  protocol.handle("app", (req) => {
    const u = new URL(req.url);
    const p = path.normalize(path.join(WEB, decodeURIComponent(u.pathname)));
    if (!p.startsWith(WEB)) return new Response("forbidden", { status: 403 });
    return net.fetch(pathToFileURL(p).toString());
  });
  createWindow();
  app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
