---
description: 查看 aeox-cli 增强包的安装与启用状态
---

请检查并报告 aeox-cli 的当前状态：

1. 用 bash 运行 `aeox doctor` 与 `aeox status`（若 `aeox` 命令不可用，改用 `node <aeox-cli 安装目录>/dist/bin/aeox.js status`；npm 全局安装时安装目录为 `%AppData%\npm\node_modules\aeox-cli`）
2. 对照你本会话实际可用的工具列表，指出哪些是 aeox 自定义工具（如 audit_check、kb_search、device_list 等）

输出一份简明状态报告：版本号、体检结果摘要、已部署资产（工具/规则/技能/插件/agent）。
最后一行给出结论：aeox 是否正常启用。
