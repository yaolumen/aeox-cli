---
name: node
description: Node.js 运行时与工程化约定（ESM、子进程、Windows、npm）。仅在修改 Node 项目代码（aeox-cli 及各类 Node 服务）时注入。
globs: ["package.json", "*.mjs", "*.cjs"]
keywords: ["node", "npm", "esm", "require", "child_process", "spawn", "express", "服务器", "后端", "接口开发"]
---

# Node.js 开发约定

## 模块体系

- 一律 ESM：`import fs from "node:fs"`，标准库必须带 `node:` 前缀；禁 `require`/`module.exports`
- Node ≥ 22 原生跑 TS：只用**可擦除语法**（无 enum/namespace/参数属性）；相对导入必须写显式 `.ts` 扩展名
- 验证语法最快路径：`node --input-type=module -e "import('file:///D:/path/file.ts')"`，不必 tsc

## 子进程（Windows 现实）

- `spawnSync/spawn` 必带：`windowsHide: true` + 超时（同步必设 timeout，防挂死）
- 调 `.cmd`（npm/deveco.cmd 等）必须经 `cmd.exe /c` 或 `shell: true`
- 路径含空格/中文 → 文件 URL 用 `pathToFileURL()` 转换，禁手拼 `file://` 字符串
- 输出必须收集并检查 `status !== 0`；捕获 stderr 用于诊断

## 路径与文件

- 用 `path.join`/`path.resolve`，禁字符串拼接路径
- `readlinkSync` 对 junction 返回值可能带 `\\?\` 或 `\??\` 前缀，比较前先剥掉
- 遍历目录先 `existsSync`，写文件前 `mkdirSync(dir, { recursive: true })`

## npm 与依赖

- 依赖解析走物理路径的 node_modules（junction 指向的项目与本体共享依赖）
- 全局命令 shim 在 `%AppData%\npm\*.cmd`；`npm link` 后用 `where <cmd>` 确认可达
- 改 package.json 依赖后必须重跑 `npm install` 再验证

## 验证闭环

- 改 aeox-cli 自身：`aeox doctor` 全绿 + 相关命令手动跑一遍
- CLI 输出风格：`[ OK ]/[WARN]/[FAIL]` 前缀，FAIL 非零退出码
- 涉及 deveco 工具/插件/agent 配置的改动：提示用户**新会话生效**
