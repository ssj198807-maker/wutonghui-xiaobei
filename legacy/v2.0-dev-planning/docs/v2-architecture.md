# 吴桐荟运营平台 v2.0 — AI Agent ChatOps 架构

> **更新时间**：2026-10-05  
> **变更原因**：原规划（4 层 SaaS 架构 + 6 个空壳模块）无法对标 xiaobei。重新定义为 **OpenClaw-style 多 Agent ChatOps**，用户通过自然语言驱动 4 个 crew 团队。

---

## 1. 一句话定位

> **吴桐荟运营平台 = "本地跑的中文版小北（xiaobei）"**  
> 区别于 xiaobei：本地优先、桌面 GUI 入口、面向 OPC/中小微企业老板、与微信/企微/飞书无缝协同。

**核心体验**：用户说一句话（比如"给美甲店写 3 篇小红书"），系统自动：
1. main crew 路由给 content-producer
2. content-producer 调度 awk-img-gen + 小红书发布 skill
3. sales-cs 监听评论区新留言 → 自动应答
4. it-engineer 提供基础设施（网站 / ICP 备案材料）

---

## 2. 新架构：4 个 Crew + 1 个 Core

```
┌────────────────────────────────────────────────────────────────┐
│  Channels（触达入口）                                          │
│  ┌────────────┬────────────┬────────────┬────────────┐         │
│  │ openclaw-  │ WeChat MP  │  小红书    │ 飞书/企微  │         │
│  │ weixin     │ 公众号     │  XHS       │ Lark/WeCom │         │
│  └────────────┴────────────┴────────────┴────────────┘         │
└───────────────────────────┬────────────────────────────────────┘
                            │ 统一消息总线
┌───────────────────────────▼────────────────────────────────────┐
│  Core（Crew Runner + LLM 适配）                                │
│  ┌─────────────┬──────────────┬──────────────┬──────────────┐  │
│  │ crew.py     │ message_bus  │ memory.py    │ heartbeat.py │  │
│  │ 加载 crew   │ crew 间通信  │ 短期+长期记忆│ 定时调度     │  │
│  └─────────────┴──────────────┴──────────────┴──────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ LLM 适配层：OpenAI-compatible + function calling         │ │
│  │ providers: 百炼 / OpenAI / Anthropic / Mock              │ │
│  └──────────────────────────────────────────────────────────┘ │
└───────────────────────────┬────────────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────────────┐
│  Crews（4 个 Agent 团队）                                      │
│  ┌─────────────┬─────────────┬─────────────┬──────────────┐   │
│  │ main        │ content-    │ sales-cs    │ it-engineer  │   │
│  │ 总控调度    │ producer    │ 销售获客    │ IT 任务      │   │
│  │             │ 内容生产    │ 评论获客    │ 网站/ICP     │   │
│  │ 路由消息    │ 视频/图文/  │ 7×24 客服   │ 建站辅助     │   │
│  │ 业务知识    │ 海报/复刻   │             │              │   │
│  └─────────────┴─────────────┴─────────────┴──────────────┘   │
└───────────────────────────┬────────────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────────────┐
│  Skills（可被 crew 调用的工具集）                              │
│  ┌──────────────┬──────────────┬──────────────┬──────────────┐ │
│  │ smart-search │ aigc-video-  │ awk-img-gen  │ lead-ingest  │ │
│  │ 18 类信源     │ gen          │ 百炼图生成   │ 表单/评论    │ │
│  ├──────────────┼──────────────┼──────────────┼──────────────┤ │
│  │ comment-     │ wx-mp-       │ xhs-publish  │ pexels-      │ │
│  │ reply        │ publish      │              │ footage      │ │
│  │ 评论回复      │ 公众号发布   │ 小红书发布   │ 视频素材     │ │
│  └──────────────┴──────────────┴──────────────┴──────────────┘ │
└────────────────────────────────────────────────────────────────┘
```

---

## 3. 4 个 Crew 的职责分工

### 3.1 main（总控调度）
- **职责**：接收消息 → 理解意图 → 路由到合适的 crew → 汇总结果
- **配置**：9 个 .md 文件（IDENTITY / SOUL / USER / AGENTS / TOOLS / HEARTBEAT / MEMORY / ALLOWED_COMMANDS / DENIED_SKILLS）
- **核心能力**：业务知识库（business_knowledge/）+ 多渠道资产（campaign_assets/）

### 3.2 content-producer（内容生产）
- **职责**：视频生成、图文写作、海报制作、爆款仿写、DNA 复刻
- **关键 Skill**：aigc-video-gen / awk-img-gen / awk-tts / pexels-footage / pixabay-footage / video-review
- **典型任务**：用户说"给美甲店写 3 篇小红书" → 自动生成图文 + 调用 xhs-publish

### 3.3 sales-cs（销售获客）
- **职责**：7×24 AI 客服 + 评论区获客 + 客户跟进 + 销售话术
- **关键 Skill**：lead-ingest / comment-reply / wxwork-drive
- **典型任务**：监听公众号/小红书评论区 → 自动识别购买意向 → 升级 lead → 跟进

### 3.4 it-engineer（IT 任务）
- **职责**：网站搭建辅助、ICP 备案材料准备、产品 deck / PPT 生成、IR 材料
- **关键 Skill**：web-form-fill / awk-tts（语音转写）
- **典型任务**：用户说"做融资 PPT" → 自动收集业务信息 → 生成 deck

---

## 4. 目录结构（OpenClaw 风格）

```
server/wutonghui/
├── core/                          # Crew Runner 引擎
│   ├── crew.py                    # 加载 crew 配置 + 执行
│   ├── message_bus.py             # 跨 crew 消息总线
│   ├── memory.py                  # 短期记忆 + 长期记忆
│   ├── heartbeat.py               # 心跳调度（每日复盘等）
│   ├── llm_adapter.py             # OpenAI-compatible LLM 适配
│   └── tool_registry.py           # skill 注册中心
│
├── crews/                         # 4 个 Agent crew
│   ├── main/                      # 总控
│   │   ├── IDENTITY.md            # "你是吴桐荟的首席运营官..."
│   │   ├── SOUL.md                # 性格 + 价值观
│   │   ├── USER.md                # 默认用户画像
│   │   ├── AGENTS.md              # 子 agent 列表
│   │   ├── TOOLS.md               # 可用工具
│   │   ├── HEARTBEAT.md           # 定时任务
│   │   ├── MEMORY.md              # 记忆策略
│   │   ├── ALLOWED_COMMANDS.md    # 允许执行的命令
│   │   ├── DENIED_SKILLS          # 禁止使用的能力
│   │   ├── config.yaml            # LLM provider / temperature / ...
│   │   ├── business_knowledge/    # 业务知识 RAG
│   │   └── skills/                # main 专属 skill
│   │
│   ├── content-producer/          # 内容生产（同样 9 个 .md + skills/）
│   ├── sales-cs/                  # 销售获客
│   └── it-engineer/               # IT 任务
│
├── skills/                        # 全局共享 skill
│   ├── smart-search/              # 18 类信源情报
│   ├── aigc-video-gen/            # 视频生成
│   ├── awk-img-gen/               # 图片生成（百炼）
│   ├── awk-tts/                   # 语音合成
│   ├── lead-ingest/               # 线索接入
│   ├── comment-reply/             # 评论回复
│   ├── wx-mp-publish/             # 公众号发布
│   ├── xhs-publish/               # 小红书发布
│   ├── pexels-footage/            # 视频素材
│   └── wxwork-drive/              # 企微云盘
│
├── channels/                      # 触达渠道（保留现有）
│   ├── openclaw_weixin/           # 微信聊天（核心入口，未来集成）
│   ├── wechat_mp/                 # 公众号
│   └── ...（xiaobei 等同渠道）
│
├── store/                         # SQLite + 向量存储
│   ├── wutonghui.db               # 业务数据
│   └── memory/                    # crew 记忆
│
├── api/                           # HTTP API（GUI 调试用）
└── app.py                         # FastAPI 入口
```

---

## 5. Crew 配置：每个 crew = 9 个 .md 文件

| 文件 | 作用 | 示例 |
|------|------|------|
| **IDENTITY.md** | Agent 身份描述 | "你是吴桐荟运营平台的首席运营官，负责理解用户意图并调度合适的 crew" |
| **SOUL.md** | 性格、价值观、边界 | "务实、不浮夸、不夸大效果、不收费承诺" |
| **USER.md** | 默认服务对象 | "中小微企业老板 / OPC / 内容创业者" |
| **AGENTS.md** | 可调度的子 agent 列表 | "@content-producer / @sales-cs / @it-engineer" |
| **TOOLS.md** | 可用工具清单 | "@lead-ingest / @smart-search / @wx-mp-publish" |
| **HEARTBEAT.md** | 定时任务 | "每日 9:00 复盘昨日 leads / 每周一生成运营周报" |
| **MEMORY.md** | 记忆策略 | "短期：当前会话上下文 / 长期：用户业务画像 + 历史决策" |
| **ALLOWED_COMMANDS.md** | 允许执行的命令白名单 | "shell:ls / curl / python / pnpm（禁止 rm -rf）" |
| **DENIED_SKILLS** | 禁用 skill 黑名单 | "禁止调用任何计费接口 / 禁止写文件到用户 Documents" |

---

## 6. 里程碑重定义（M0 → M5）

### M0：架构重构 + Crew Runner 核心（1 周）★ 进行中
- [ ] 写本文档 ✓
- [ ] 建 crews/ + core/ + skills/ 目录骨架
- [ ] 实现 core/crew.py（加载 .md + 执行）
- [ ] 实现 core/llm_adapter.py（OpenAI-compatible + function calling）
- [ ] 实现 core/message_bus.py（跨 crew 通信）
- [ ] 迁移现有 wutonghui 包到 crews/main/（保留 leads/channels/media 作为 skill）
- [ ] main crew 的 9 个 .md 文件（最小可用）
- [ ] 重打 DMG + 启动验证

### M1：对话控制台 + main crew 端到端（1-2 周）★ 关键路径
- [ ] 前端重构为「对话控制台」（单一聊天窗口 + 侧边 crew 状态面板）
- [ ] main crew 完整配置（IDENTITY/SOUL/USER/AGENTS/TOOLS/HEARTBEAT/MEMORY）
- [ ] 接入 mock LLM → 真实 LLM（OpenAI-compatible，百炼/DeepSeek）
- [ ] 心跳调度：每日复盘 demo
- [ ] memory 持久化（SQLite）
- [ ] smoke test：用户说"你好"→ main crew 路由 → 返回"我能帮你什么"

### M2：content-producer crew + 内容生成（2-3 周）
- [ ] content-producer 完整配置
- [ ] smart-search skill（先支持 3 类信源：小红书/微博/新闻）
- [ ] awk-img-gen skill（百炼图片生成）
- [ ] xhs-publish skill（小红书图文发布）
- [ ] wx-mp-publish skill（公众号文章）
- [ ] 端到端测试："给美甲店写 3 篇小红书" → 自动生成 + 发布

### M3：sales-cs crew + 评论获客（2-3 周）
- [ ] sales-cs 完整配置
- [ ] lead-ingest skill（表单/评论接入）
- [ ] comment-reply skill（自动回复）
- [ ] 监控 + 升级流程
- [ ] 端到端测试：mock 评论场景

### M4：smart-search 18 类信源 + it-engineer（2-3 周）
- [ ] smart-search 扩展到 18 类
- [ ] it-engineer crew 完整配置
- [ ] web-form-fill skill
- [ ] IR 材料生成

### M5：商业模式 + Token Plan 接入（2-3 周）
- [ ] 接入阿里云百炼 Token Plan
- [ ] 用户计费 + 用量统计
- [ ] 模板市场
- [ ] 推广 + 生态

**总周期：约 9-12 周**（按 1 人小团队估算）

---

## 7. 与 xiaobei 的差异（明确"我们不一样"）

| 维度 | xiaobei | 吴桐荟 v2.0-dev |
|------|---------|------------------|
| **形态** | ChatOps（微信聊天入口）| ChatOps + 桌面 GUI（双入口） |
| **LLM 渠道** | 阿里云百炼一家 | OpenAI-compatible（百炼 / DeepSeek / OpenAI / 私有模型） |
| **数据存储** | 云端为主 | **本地优先**（SQLite + 本地 RAG） |
| **微信绑定** | 需要扫 openclaw-weixin 二维码 | **可选**（桌面 GUI 默认开箱即用）|
| **商业模式** | VIP 订阅 + Token Plan 导流 | 同 + **本地优先** 隐私差异化 |
| **代码形态** | TypeScript 引擎（awada/）| **Python** 引擎（更易二次开发 + LLM 生态成熟） |

---

## 8. 用户可见的体验升级（vs 当前 v2.0-dev）

**之前**：
- 6 个菜单按钮，4 个是占位
- 不知道点哪里能用

**之后（M1 完成）**：
- 一个聊天窗口（"吴桐荟，请问需要什么帮助？"）
- 输入框 + 发送按钮
- 右侧：4 个 crew 的实时状态（"main 待命中 / sales-cs 监控 5 个评论区"）
- 顶部：心形按钮 = 当前 LLM provider + 用量统计
- 输入"给美甲店写 3 篇小红书" → 看到 main 路由 → content-producer 接管 → 自动执行 → 返回结果

**对应物理产品**：
- 旧 DMG（139 MB）"完全不知道怎么用"
- 新 DMG（M1 后）"跟老板在微信里指挥一个员工一样自然"
