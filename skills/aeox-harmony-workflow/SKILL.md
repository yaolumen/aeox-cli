---
name: aeox-harmony-workflow
description: aeox 工具链下的鸿蒙开发工作流与项目惯例（Constants.ets 主题契约、原型三件套、设备链路、知识库闭环、环境事实）。Load when developing or debugging HarmonyOS apps with the aeox toolset, or when asked how aeox tools fit into the dev loop.
---

# aeox 鸿蒙开发工作流

## 工具链地图（aeox 13 工具）

| 环节 | 工具 | 要点 |
|---|---|---|
| 构建 | 原生 build_project（优先）/ devecocli_build | 失败输出已被 build-diagnostics 插件后处理，先读 `[aeox 构建诊断]` 摘要，再翻原始日志 |
| 静态检查 | 原生 arkts_check / devecocli_lint | 改完 .ets 先 lint 再 build |
| API 查证 | docs_search → docs_read | 写代码前不确定的 API 一律先查，禁止凭记忆 |
| 错误复盘 | kb_search（修前）/ kb_add（修后） | 非平凡错误的必经闭环 |
| 设备 | device_list → device_run / device_log / ui_screenshot | 上机前必先 list；日志按 bundle 过滤、禁流式 |
| 原型 | proto_shot | HTML 原型渲染截图，ArkUI 还原度对比的左图 |
| 提审 | audit_check → signature_generate → release build | 见 aeox-submission skill |
| 知识库 | kb_add / kb_search | 存于 ~/.local/share/deveco/kb/，单文件 markdown |

## 项目惯例

- 进度真相源 `PROJECT_STATUS.md`：每个鸿蒙应用仓库以它为准，阶段完成必须更新（首次接触项目时向用户确认仓库根与该文件位置）
- bundle 命名遵循 `com.<组织名>.*` 前缀约定（以项目实际为准）
- **Constants.ets = 主题契约**：常量名与原型 `:root` 变量一一对应（如 --tomato → TOMATO_COLOR），色值禁散落硬编码
- 原型三件套：`UI演示.html` + `UI设计稿.md` + `应用图标.html`（目录名含"原型设计"会触发 harmony-prototype 规则注入）
- 协议页（用户协议/隐私政策）：rawfile HTML，华为模板格式，支持深色模式
- 图标链路：HTML 设计稿 → 截图导出 → resources/base/media/

## 环境事实（勿踩坑）

- 上真机前先用 device_list 确认真机系统版本能否运行目标应用（如 HarmonyOS 4.x 真机无法运行 NEXT 应用）——不满足时改用模拟器（`devecocli emulator`）或 AGC 云测试
- SDK 构建时的 `@arkts.lang.d.ets` 报错（约 6 条）为 benign，已被 build-diagnostics 插件过滤，不要试图"修复"它们
- AGC 云测试要求 compatibleSdkVersion ≥ 6.0.0(20)
- 新增自定义工具需在 deveco.jsonc permission 登记，且**新会话才加载**
- 修改 aeox-cli 自身后：`aeox doctor` 验证；工具/插件/agent 配置改动均需新会话

## 闭环纪律

1. 修 bug：先 kb_search → 复现 → 单点修改 → 验证 → kb_add 记录（症状/根因/解法三段）
2. 答疑：ArkTS API 行为先 docs_search，引用文档而非记忆
3. 完成阶段：更新 PROJECT_STATUS.md，必要时用原生 todo 工具拆任务
