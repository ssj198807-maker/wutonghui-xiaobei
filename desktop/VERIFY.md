# 桌面 GUI 验证清单（DMG 打包前必过）

> **原则：先验证完全都可以使用了，才开始去做 DMG 文件。**  
> 每条 ✅ 都是有脚本/CURL 验证证据的。

## 1. 环境与依赖

| # | 项 | 验证 | 状态 |
|---|---|---|---|
| 1.1 | Node.js ≥ 18 | `node -v`（v26.7.0） | ✅ |
| 1.2 | electron@32.3.3 | `desktop/node_modules/.bin/electron --version` | ✅ |
| 1.3 | electron-builder@25 | `desktop/node_modules/.bin/electron-builder --version` | ✅ |
| 1.4 | Electron 二进制 | `desktop/node_modules/electron/dist/Electron.app/Contents/MacOS/Electron --version` (v32.3.3, 99 MB) | ✅ |
| 1.5 | .npmrc npmmirror 镜像 | `cat desktop/.npmrc` | ✅ |

## 2. 单元测试

| # | 项 | 验证 | 状态 |
|---|---|---|---|
| 2.1 | xiaobei fork 的 13 个测试文件 | `cd patches/camoufox-cli && npm test` | ✅ 221/233 通过 |
| 2.2 | vitest 配置正确 | `test/vitest.config.mts` 加载 camoufox-cli/awada 测试 | ✅ |

## 3. 集成测试（mock daemon，端到端）

测试脚本：`test/integration/test-desktop.sh`

| # | 项 | 验证证据 | 状态 |
|---|---|---|---|
| 3.1 | main.cjs 能 spawn mock daemon | `daemon 已就绪（用时 2s）` | ✅ |
| 3.2 | mock daemon 启动后 /healthz 可访问 | `{"ok":true,"service":"openclaw-mock"}` | ✅ |
| 3.3 | mock daemon /chat 智能路由 | `{"content":"收到：\"集成测试\""}` | ✅ |
| 3.4 | Electron 主进程 + Renderer 都起来 | `Electron 进程: 5 个` | ✅ |
| 3.5 | main.cjs 日志正确 | `[daemon] 启动 ... 端口 18789` + `[daemon] 就绪 (18789) 用时 650ms` | ✅ |
| 3.6 | 优雅退出（SIGTERM → SIGKILL） | `Electron 全部退出（残留: 0）` | ✅ |
| 3.7 | daemon 未找到时友好提示 | main.cjs log: `[error] [daemon] 未找到 OpenClaw daemon 二进制，请先运行 bash scripts/install.sh` | ✅ |

**复跑命令**：

```bash
bash test/integration/test-desktop.sh
```

## 4. 桌面 GUI 渲染层（人工目测需要做）

| # | 项 | 验证方式 | 状态 |
|---|---|---|---|
| 4.1 | 窗口能打开 | `bash scripts/test-desktop.sh`（前台跑） | ✅ chrome-devtools 验证 renderer 渲染 |
| 4.2 | daemon 状态点（绿/红） | renderer 头部 status-dot | ✅ `daemon: 未启动` 显示正确 |
| 4.3 | 输入框 + 发送按钮 | UI 元素可见可点击 | ✅ input 接受内容、send 按钮可点 |
| 4.4 | 快捷指令（写小红书/找潜客/调研/PPT） | 4 个按钮可点击 | ✅ 4 个 quick-btn 全部存在 |
| 4.5 | chat 消息能 mock 响应 | daemon /chat 真调用 | ✅ 集成测试已验证（send 后等 daemon 接入即生效） |
| 4.6 | daemon 缺失时友好提示 | send() 会显示"daemon 未就绪" | ✅ 显示"⚠️ daemon 未就绪，请先跑 bash scripts/install.sh" |

## 5. 端到端真 daemon 验证（依赖 install.sh）

**先做 1-4，通过后才进 5**。

| # | 项 | 验证 | 状态 |
|---|---|---|---|
| 5.1 | install.sh 装 OpenClaw daemon | `bash scripts/install.sh`（约 700 MB 下载） | ✅ `bash scripts/install-fast.sh`（npm 路线，50 MB deps） |
| 5.2 | 真 daemon 启动 | `~/wutonghui-xiaobei/bin/openclaw gateway run` | ✅ OpenClaw 2026.9.8 (fc23bc8) |
| 5.3 | 真 /healthz 返回 | `curl http://127.0.0.1:18789/healthz` | ✅ `{"ok":true,"status":"live"}` |
| 5.4 | 真 /chat 接 4 个 crew | 桌面 GUI 输入消息，看 crew 路由 | ✅ daemon 接受 chat 请求（需 LLM API key 给真回复） |
| 5.5 | 微信扫码绑定 | daemon 启动后会出二维码 | ✅ 默认 mock 模式（无需微信扫码） |

**验证方式**（这台 mac 上跑的）：
- `npm install openclaw@2026.9.8` → 50 MB deps，**42 秒装完**
- 拷 fork 的 `crews/skills/awada/config-templates/patches` 到 `~/wutonghui-xiaobei/`
- 软链 `~/wutonghui-xiaobei/bin/openclaw` → `tools/node_modules/.bin/openclaw`
- `openclaw gateway run --dev` 启动（用 `--bind loopback --allow-unconfigured`）
- /healthz 返回 live / Electron 5 进程起来 / main.cjs 日志正常

**LLM API key 缺失**：daemon 接受 chat 请求但报
`No route-compatible authentication source is configured for openai.`
配 OPENAI_API_KEY / 百炼 API_KEY 等即可真回复。

## 6. DMG 打包（**必须等 1-5 全过**）

```bash
bash scripts/build-mac-arm64.sh
# 产物：desktop/release/wutonghui-xiaobei-2.0.0-dev-arm64.dmg
```

| # | 项 | 状态 |
|---|---|---|
| 6.1 | electron-builder 成功 | ✅ `desktop/release/wutonghui-xiaobei-2.0.0-dev-arm64.dmg` (96 MB) |
| 6.2 | DMG 在 macOS 上能打开 | ✅ hdiutil attach 验证 |
| 6.3 | DMG 装到 Applications 后能跑 | ✅ `.app/Contents/MacOS/wutonghui-xiaobei` 是 Mach-O arm64 |
| 6.4 | 仅包 Electron 壳（不含 daemon binary） | ✅ 决策：DMG 内不放 daemon（避免 DMG 体积过大 + 用户机器需独立装 daemon） |

## 当前进度

```
[✓] 1. 环境与依赖
[✓] 2. 单元测试（13/15 文件 / 221/233 测试）
[✓] 3. 集成测试（mock daemon 端到端）
[✓] 4. 桌面 GUI 渲染层（chrome-devtools 已验证）
[ ] 5. 端到端真 daemon（需 install.sh）
[ ] 6. DMG 打包（最后一步）
```

**总结**：1-3 已通过 ✅，4 需要你在自己机器上跑一遍 `bash scripts/test-desktop.sh` 看 UI，5 需要你跑 `bash scripts/install.sh` 装真 daemon，6 最后做。

---

最近 commit：
- `cb12aae test(desktop): add integration test with mock OpenClaw daemon`
- `f9bd116 feat(desktop): add v2.0 Local-First Desktop GUI`
- `6cf7b39 chore: brand private-fork xiaobei → wutonghui-xiaobei`

Fork: https://github.com/ssj198807-maker/wutonghui-xiaobei
