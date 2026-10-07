/**
 * wutonghui-xiaobei 桌面 GUI（v2.0 差异化能力）
 *
 * 与上游 xiaobei 的差异：
 *   - xiaobei 是微信扫码绑定 OpenClaw daemon
 *   - 我们加 Electron 桌面壳 + 极简聊天 UI（不需要扫码）
 *   - 用户可以"开箱即用"，无需外部微信
 *
 * 架构：
 *   - Electron 主进程：spawn OpenClaw daemon（fork 后 wutonghui-xiaobei 安装目录）
 *   - 渲染进程：聊天 UI（与 daemon 通过 HTTP/WS 通信）
 *   - preload.cjs：暴露安全的 IPC 接口给渲染进程
 */
'use strict';

const { app, BrowserWindow, ipcMain, Menu, Tray, shell, dialog, nativeImage } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { spawn } = require('node:child_process');
const http = require('node:http');

// ===== 常量 =====
const APP_NAME = 'wutonghui-xiaobei';
const DAEMON_PORT_START = 18789;  // OpenClaw 默认端口
const DAEMON_HOST = '127.0.0.1';

// ===== 路径解析（dev / packaged 两种模式）=====
const isPackaged = app.isPackaged;
const APP_ROOT = isPackaged ? process.resourcesPath : path.join(__dirname);

// OpenClaw daemon 二进制
// OpenClaw 安装到 ~/wutonghui-xiaobei/（受 WUTONGHUI_HOME 环境变量影响）
// 在 dev 模式下通过 $HOME 查找；packaged 模式下随 .app 一起打包（macOS: Contents/Resources/wutonghui-xiaobei/）
const HOME = process.env.WUTONGHUI_HOME || require('node:os').homedir();
const DAEMON_BIN = isPackaged
  ? path.join(HOME, 'wutonghui-xiaobei', 'bin', 'openclaw')
  : path.join(HOME, 'wutonghui-xiaobei', 'bin', 'openclaw');

const XIAOBEI_BIN_FALLBACK = isPackaged
  ? path.join(HOME, 'wutonghui-xiaobei', 'bin', 'wutonghui-xiaobei')
  : path.join(HOME, 'wutonghui-xiaobei', 'bin', 'wutonghui-xiaobei');

// 用户配置 / 数据目录（~/.wutonghui/）
const USER_HOME = process.env.WUTONGHUI_HOME || path.join(require('node:os').homedir(), '.wutonghui');

// ===== 全局状态 =====
let mainWindow = null;
let daemonProcess = null;
let daemonReady = false;
let daemonStartTime = null;

// ===== 工具函数 =====
function fileExists(p) {
  try { return fs.statSync(p).isFile(); } catch { return false; }
}

function dirExists(p) {
  try { return fs.statSync(p).isDirectory(); } catch { return false; }
}

function logLine(stream, line) {
  const ts = new Date().toISOString().substring(11, 19);
  const msg = `[${ts}] [${stream}] ${line}`;
  process.stdout.write(msg);
  // 落盘日志
  try {
    fs.mkdirSync(path.join(USER_HOME, 'logs'), { recursive: true });
    fs.appendFileSync(
      path.join(USER_HOME, 'logs', 'daemon.log'),
      msg
    );
  } catch (_) { /* ignore */ }
}

// ===== 等待 daemon HTTP 端口 =====
async function waitForPort(port, host, timeoutMs = 30_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const ok = await new Promise((resolve) => {
      const req = http.request({ host, port, path: '/healthz', timeout: 1000 }, (res) => {
        resolve(res.statusCode < 500);
      });
      req.on('error', () => resolve(false));
      req.end();
    });
    if (ok) return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

// ===== 启动 OpenClaw daemon =====
async function startDaemon() {
  // 查找 daemon 二进制（OpenClaw 或 wutonghui-xiaobei 名字）
  let binPath = null;
  for (const p of [DAEMON_BIN, XIAOBEI_BIN_FALLBACK]) {
    if (fileExists(p)) { binPath = p; break; }
  }

  if (!binPath) {
    logLine('error', `[daemon] 未找到 OpenClaw daemon 二进制，请先运行 bash scripts/install.sh\n`);
    logLine('error', `  期望位置：${DAEMON_BIN}\n`);
    logLine('error', `  或：      ${XIAOBEI_BIN_FALLBACK}\n`);
    return false;
  }

  logLine('info', `[daemon] 启动 ${binPath} 端口 ${DAEMON_PORT_START}\n`);

  daemonProcess = spawn(binPath, [
    'gateway', 'run',
    '--port', String(DAEMON_PORT_START),
    '--bind', 'loopback',  // 替代 --host（OpenClaw upstream 用 --bind）
    '--allow-unconfigured',  // 允许无配置启动（首次安装友好）
  ], {
    cwd: USER_HOME,
    env: { ...process.env, WUTONGHUI_HOME: USER_HOME, OPENCLAW_HOME: USER_HOME },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  daemonStartTime = Date.now();

  daemonProcess.stdout.on('data', (buf) => logLine('daemon:stdout', buf.toString()));
  daemonProcess.stderr.on('data', (buf) => logLine('daemon:stderr', buf.toString()));

  daemonProcess.on('exit', (code, signal) => {
    logLine('info', `[daemon] 退出 code=${code} signal=${signal}\n`);
    daemonReady = false;
    daemonProcess = null;
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('daemon:exit', { code, signal });
    }
  });

  // 等待 daemon HTTP 端口起来
  const ready = await waitForPort(DAEMON_PORT_START, DAEMON_HOST, 30_000);
  if (ready) {
    daemonReady = true;
    logLine('info', `[daemon] 就绪 (${DAEMON_PORT_START}) 用时 ${Date.now() - daemonStartTime}ms\n`);
  } else {
    logLine('error', `[daemon] 30 秒内未就绪，可能安装有问题\n`);
  }
  return ready;
}

// ===== 创建主窗口 =====
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: 800,
    minHeight: 540,
    title: APP_NAME,
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // 加载本地 renderer
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  // 开发模式打开 DevTools
  if (!isPackaged && process.env.WUTONGHUI_DEV) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  // 外部链接走系统浏览器
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

// ===== IPC handlers =====
function setupIpc() {
  ipcMain.handle('app:status', () => ({
    name: APP_NAME,
    version: app.getVersion(),
    daemonReady,
    daemonPort: DAEMON_PORT_START,
    daemonStartTime,
    userHome: USER_HOME,
    isPackaged,
  }));

  ipcMain.handle('app:openExternal', async (_evt, url) => {
    await shell.openExternal(url);
  });

  ipcMain.handle('app:revealLogDir', async () => {
    await shell.openPath(path.join(USER_HOME, 'logs'));
  });

  // 让 renderer 知道 daemon 状态变化
  setInterval(() => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('daemon:status', {
        ready: daemonReady,
        uptime: daemonStartTime ? Date.now() - daemonStartTime : 0,
      });
    }
  }, 3000);
}

// ===== 应用生命周期 =====
app.whenReady().then(async () => {
  // 创建 menu
  const menu = Menu.buildFromTemplate([
    {
      label: '文件',
      submenu: [
        { label: '打开日志目录', click: () => shell.openPath(path.join(USER_HOME, 'logs')) },
        { type: 'separator' },
        { role: 'quit', label: '退出' },
      ],
    },
    {
      label: '查看',
      submenu: [
        { role: 'reload', label: '刷新' },
        { role: 'toggleDevTools', label: '开发者工具' },
        { type: 'separator' },
        { role: 'resetZoom', label: '重置缩放' },
        { role: 'zoomIn', label: '放大' },
        { role: 'zoomOut', label: '缩小' },
      ],
    },
  ]);
  Menu.setApplicationMenu(menu);

  setupIpc();
  createWindow();

  // 后台启动 daemon
  startDaemon().catch((err) => logLine('error', `[daemon] 启动异常 ${err}\n`));

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (daemonProcess) {
    logLine('info', `[shutdown] 关闭 daemon (pid=${daemonProcess.pid})\n`);
    try { daemonProcess.kill('SIGTERM'); } catch (_) {}
    setTimeout(() => {
      if (daemonProcess) { try { daemonProcess.kill('SIGKILL'); } catch (_) {} }
    }, 3000);
  }
});
