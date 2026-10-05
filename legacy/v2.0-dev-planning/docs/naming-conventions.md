# 命名规范 ADR（Architecture Decision Record）

| 项 | 值 |
|----|----|
| **状态** | 已采纳（Accepted） |
| **日期** | 2026-09-27 |
| **决策者** | 架构师 |
| **适用范围** | `wutonghui-ops-platform` 全仓库 |

## 背景

吴桐荟运营平台从 v0.26.0 演进到 v2.0 阶段时，需要统一全栈命名规范，
避免：

1. 包名 / IPC 频道 / 环境变量 / 数据库表 / API 路径之间风格不统一
2. v0.26.0 旧代码（包名 `clipforge`）与 v2.0+ 新代码混淆
3. 多个潜在歧义前缀（`wt` / `wth` / `wutonghui`）随意混用

## 决策

### 1. 品牌名（中文 / 英文）

| 场景 | 用词 |
|------|------|
| 中文正式品牌 | **吴桐荟运营平台** |
| 中文简称 | 吴桐荟 |
| 英文正式 | **WutongHui Ops Platform** |
| 英文缩写 | WutongHui / WHOP |
| 不再使用 | 「吴桐荟经营平台」（已废弃）/ 「吴桐荟剪辑」（v0.26.0 过渡品牌） |

### 2. 代码包命名

| 维度 | 规范 | 示例 |
|------|------|------|
| **Python 顶层包** | `wutonghui` | `import wutonghui.api.main` |
| **Python 子模块** | `wutonghui.<模块>` | `wutonghui.acquisition.leads` |
| **PyPI 分发名** | `wutonghui` | `pip install wutonghui` |
| **CLI 入口名** | `wutonghui` | `wutonghui render timeline.json` |
| **兼容旧名（v0.26.0 过渡）** | `clipforge` 别名导入 | `import wutonghui as clipforge`（兼容层） |

**迁移期**（v0.26.0 → v2.0）：保留 `clipforge` 作为 alias 至少 6 个月，渐进废弃。

### 3. 环境变量 / 配置前缀

| 维度 | 规范 | 示例 |
|------|------|------|
| **环境变量** | `WUTONGHUI_*` | `WUTONGHUI_FFMPEG`、`WUTONGHUI_DATA_DIR`、`WUTONGHUI_API_KEY` |
| **.env 文件** | `.env` / `.env.local` | 顶部加 `# WutongHui Ops Platform v2.0` |
| **JSON 配置** | `{ "wutonghui": { ... } }` | 根键名统一 |

### 4. IPC 与进程间通信

| 维度 | 规范 | 示例 |
|------|------|------|
| **Electron main ↔ renderer 频道** | `wutonghui:*` | `wutonghui:render-clip`、`wutonghui:get-config` |
| **WebSocket 命名空间** | `/ws/wth/*` | `/ws/wth/jobs`、`/ws/wth/leads` |
| **消息总线 topic** | `wth.*` | `wth.lead.created`、`wth.outreach.sent` |

### 5. 持久化与存储

| 维度 | 规范 | 示例 |
|------|------|------|
| **SQLite 表前缀** | `wth_*` | `wth_leads`、`wth_personas`、`wth_conversations`、`wth_outreach_log`、`wth_funnel_events` |
| **索引命名** | `idx_wth_<table>_<col>` | `idx_wth_leads_source` |
| **迁移文件** | `migrations/0001_init.sql` 等序号 | 不带前缀，纯序号 |
| **localStorage 键** | `wutonghui:*` | `wutonghui:settings`、`wutonghui:onboarding-done` |
| **IndexedDB 数据库名** | `wutonghui_ops_platform` | |
| **缓存键（Redis/Memory）** | `wth:<entity>:<id>` | `wth:lead:abc123`、`wth:persona:xyz` |

### 6. HTTP API 路径

| 维度 | 规范 | 示例 |
|------|------|------|
| **API 根前缀** | `/api/v1/wth/` | |
| **资源命名（复数名词）** | `/api/v1/wth/leads` | |
| **资源嵌套** | `/api/v1/wth/leads/{id}/events` | |
| **动作（动词）** | `/api/v1/wth/leads/{id}/qualify` | |
| **WebSocket 端点** | `/api/v1/wth/ws/jobs` | |

### 7. 文件系统路径

| 维度 | 规范 | 示例 |
|------|------|------|
| **用户数据根** | `~/.wutonghui/` | `~/.wutonghui/data/`、`~/.wutonghui/models/`、`~/.wutonghui/logs/` |
| **应用配置** | `~/.wutonghui/config.json` | |
| **临时文件** | `~/.wutonghui/cache/` | |
| **覆盖路径** | env `WUTONGHUI_DATA_DIR` | |

### 8. 日志与审计

| 维度 | 规范 | 示例 |
|------|------|------|
| **logger name** | `wutonghui.<module>` | `wutonghui.acquisition.leads` |
| **审计事件名** | `wth.<entity>.<action>` | `wth.lead.created`、`wth.outreach.sent` |
| **结构化日志字段** | snake_case | `lead_id`、`intent_score` |

### 9. 前端组件 / Store

| 维度 | 规范 | 示例 |
|------|------|------|
| **Vue 组件名** | PascalCase，前缀 `Wth` | `WthLeadCard`、`WthDialogWorkspace` |
| **Pinia store id** | camelCase，前缀 `wth` | `useWthLeadsStore`、`useWthAgentStore` |
| **路由 path** | `/wth/...` | `/wth/agent`、`/wth/playbook` |
| **i18n key** | `wth.<scope>.<key>` | `wth.agent.welcome` |

### 10. 安装包 / 桌面端

| 维度 | 规范 | 示例 |
|------|------|------|
| **macOS .dmg** | `WutongHuiOpsPlatform-v{major}.{minor}.{patch}-mac-{arch}.dmg` | `WutongHuiOpsPlatform-v2.0.0-mac-arm64.dmg` |
| **Windows .exe** | `WutongHuiOpsPlatform-v{major}.{minor}.{patch}-win-x64.exe` | `WutongHuiOpsPlatform-v2.0.0-win-x64.exe` |
| **Windows .zip 绿色版** | `WutongHuiOpsPlatform-v{major}.{minor}.{patch}-win-x64.zip` | |
| **Linux AppImage** | `WutongHuiOpsPlatform-v{major}.{minor}.{patch}-linux-x86_64.AppImage` | 阶段 B 评估 |
| **macOS 应用名** | `WutongHui Ops Platform` | 窗口标题 / 菜单 |
| **进程名** | `WutongHuiOpsPlatform` | Activity Monitor / ps |
| **Bundle ID** | `com.wutonghui.opsplatform` | macOS / iOS |
| **NSIS 应用 ID** | `com.wutonghui.opsplatform` | Windows |

### 11. CLI / 二进制工具名

| 维度 | 规范 | 示例 |
|------|------|------|
| **主 CLI** | `wutonghui` | `wutonghui render`、`wutonghui config` |
| **次级工具** | `wth-*` | `wth-doctor`、`wth-pack`、`wth-migrate` |

### 12. 命名空间总结（一图速查）

```
产品:  吴桐荟运营平台 / WutongHui Ops Platform
       |
       ├─ 代码:    wutonghui / wutonghui-<sub>
       ├─ 环境变量: WUTONGHUI_*
       ├─ IPC:      wutonghui:*
       ├─ WS 命名空间: /ws/wth/*
       ├─ 表前缀:    wth_*
       ├─ 缓存键:    wth:<entity>:<id>
       ├─ API:      /api/v1/wth/*
       ├─ 路由:    /wth/...
       ├─ LS 键:   wutonghui:*
       ├─ DB 名:   wutonghui_ops_platform
       ├─ 数据目录: ~/.wutonghui/
       ├─ logger:  wutonghui.<module>
       └─ 组件:    Wth<PascalCase>
```

## 迁移路径

### v0.26.0 → v2.0 兼容期（≥ 6 个月）

| 旧名 | 处理 |
|------|------|
| `clipforge` Python 包 | 在 `wutonghui/__init__.py` 中加 `from . import clipforge_compat` 或 `sys.modules['clipforge'] = sys.modules['wutonghui']` |
| `CLIPFORGE_*` 环境变量 | 同时识别，优先用新名 |
| `clipforge:*` IPC 频道 | 同时识别，逐步迁移 |

### 不兼容项（强制迁移）

- 数据库表前缀（v2.0 数据迁移时强制 `wth_*`）
- HTTP API 路径前缀（v2.0 仅暴露 `/api/v1/wth/*`）

## 影响范围

| 受影响模块 | 改造时间点 |
|------------|----------|
| `server/wutonghui/` 包骨架 | M0（已完成目录创建） |
| `pyproject.toml` 改名 + CLI 入口 | M0 |
| `web/package.json` + Pinia/Vue 改造 | M0-M1 |
| 各 channel adapter | M1-M2 |
| 安装包命名 | 阶段 B 首次打包 |

## 反向链接

- [`docs/ai-agent-upgrade-plan.md`](ai-agent-upgrade-plan.md) §6.3 命名规范
- v0.26.0 → v2.0 迁移指南（M1 阶段产出）
