# aeox-cli

**HarmonyOS + Node.js 双栈 AI 编程环境增强包** —— 为 DevEco Code (opencode) 注入鸿蒙开发所需的工具、规则、技能与诊断能力。

零 fork、零侵入：所有能力都通过官方扩展机制（自定义工具 / 规则 / 技能 / 插件 / 斜杠命令 / Agent 预设）注入，本仓库是这些增强资产的唯一源。

- 主页：<https://cli.aeox.uk>
- 许可：MIT © YAOLUMEN TECHNOLOGIES LTD

## 为什么需要它

AI 编程助手写鸿蒙应用时的三大痛点：

1. **构建输出即噪声** —— Java/Gradle 冗长日志把真正的 ArkTS 错误淹没，AI 在垃圾信息里打转
2. **环境黑盒** —— Node 版本、SDK 路径、devecocli 是否可用，每个新会话都要从头排查
3. **重复踩坑** —— 同一个编译错误这次修完，换个会话又从零开始

aeox-cli 用一组针对性工具、规则与诊断插件，把这三件事变成开箱即用。

## 安装

要求：Windows + Node ≥ 22.18 + DevEco Code。

一键安装（推荐）：

```powershell
iwr -useb https://cli.aeox.uk/install.ps1 | iex
```

或手动安装：

```powershell
npm install -g aeox-cli
aeox install
```

> 请勿使用 `npx aeox-cli install` —— npx 缓存目录会被定期清理，导致部署的 junction 失效。

## 验证安装

```powershell
aeox doctor    # 13 项环境体检
aeox status    # 已部署资产一览
```

在 DevEco Code 会话中：

- 输入 `/aeox` —— AI 现场报告 aeox 安装与启用状态
- 直接问"aeox 启用了吗" —— 常驻身份横幅会注入每个会话，随时可验证

## 能力清单

| 资产 | 数量 | 说明 |
|---|---|---|
| 自定义工具 | 13 | 构建 / 静态检查 / 提审体检 / 文档检索 / 知识库 / 设备链路 / 截图 / 签名 / 原型 |
| 规则 | 8 | 通用准则常驻注入，其余按编辑文件与关键词触发 |
| 自研技能 | 2 | aeox-harmony-workflow / aeox-submission |
| 插件 | 2 | ai-rules（规则注入）/ build-diagnostics（构建诊断） |
| Agent 预设 | 4 | harmony / harmony-debug / proto / node |
| 斜杠命令 | 1 | `/aeox` 状态报告 |

### 13 个自定义工具

| 工具 | 用途 |
|---|---|
| `devecocli_build` / `devecocli_lint` | 构建与静态检查（绝对路径调用、超时与输出截断保护） |
| `audit_check` | AppGallery 提审体检：只读扫描配置完整性、敏感权限、签名、硬编码字符串 |
| `docs_search` / `docs_read` | 鸿蒙官方文档检索与阅读，AI 不确定 API 行为先查证 |
| `kb_add` / `kb_search` | 本地错误知识库：排查 → 修复 → 沉淀的复利闭环 |
| `device_list` / `device_log` / `device_run` | 设备链路：日志按包名/关键词/时间窗过滤，支持干净重装 |
| `ui_screenshot` | 设备屏幕截图，配合多模态会话让 AI 看图 |
| `signature_generate` | 签名材料自动生成，补齐原生工具链空白 |
| `proto_shot` | Edge headless 渲染 HTML 原型并截图，零依赖 |

### 2 个插件

- **ai-rules**：按最近编辑文件（globs）与消息关键词动态注入规则到系统提示词，并注入常驻 `<aeox>` 身份横幅
- **build-diagnostics**：`tool.execute.after` 钩子——结构化提取 ArkTS 错误、白名单过滤 SDK benign 噪声，摘要前置；对原生 build 与自研构建工具同时生效

### 2 个技能 / 4 个 Agent 预设

- **aeox-harmony-workflow**：aeox 工具链工作流、项目惯例与环境事实
- **aeox-submission**：AppGallery 提审流水线（体检 → 签名 → 出包 → 材料清单）
- Agent 预设（`deveco run --agent <name>` 或 TUI 切换）：harmony（鸿蒙开发主 agent）、harmony-debug（只诊断不动代码的子 agent）、proto（HTML 原型设计）、node（Node.js 栈开发）

## 部署机制

`aeox install` 把仓库内的 `tools/`、`rules/`、`plugin/`、`command/` 以 **NTFS junction** 链接到全局配置目录 `~/.config/deveco/`，每个技能单独链接到 `~/.local/share/deveco/skills/`（与官方技能并存）。

编辑仓库文件即全局生效：规则 .md 按 mtime 热加载，工具与插件文件需新会话生效。junction 不需要管理员权限或开发者模式。

## 命令

```
aeox              横幅 + 帮助
aeox install      部署 junction + 插件注册 + 依赖安装（幂等）
aeox doctor       环境体检（13 项：Node/仓库/依赖/配置/链接/skills/注册/deveco/devecocli/SDK 等）
aeox status       已部署的工具、规则、技能、链接状态
aeox version      版本号
```

## 目录结构

```
aeox-cli/
├── bin/aeox.ts          CLI 入口（prepack 时经 build.mjs 剥离类型为 dist/ 纯 JS：Node 禁止 node_modules 内 TS 类型剥离，发布包不能直接跑 .ts）
├── lib/                 CLI 实现（paths / install / doctor / status / ui）
├── tools/               13 个自定义工具
├── rules/               8 条 AI 编程规则（frontmatter: name/globs/keywords/alwaysApply）
├── skills/              2 个自研技能
├── command/aeox.md      /aeox 斜杠命令
├── plugin/              2 个插件
└── site/                cli.aeox.uk 展示站源码（纯静态单文件，含 4 个交互演示页）
```

## 路线图（0.1.1 候选）

- 修正 npm 包内 README 的"12 项体检"为 13 项（发布早于修正，需随版本更新）
- 泛化 agent / rules 中的个人化文案（来啦系列、com.cheeseopt 等示例化）
- `doctor` 增加在线设备连通性检查（INFO 级，不阻断体检）
- `store_screenshots` 批量截图 / `version_bump` / `new_app` 应用模板
- 跨平台支持（macOS / Linux symlink）

## 许可

[MIT](./LICENSE) © YAOLUMEN TECHNOLOGIES LTD
