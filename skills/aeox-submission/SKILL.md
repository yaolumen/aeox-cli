---
name: aeox-submission
description: AppGallery 提审流水线（audit_check 体检 → 签名 → Release 出包 → 市场材料）。Load when the user wants to 提审/上架/发布 an app to AppGallery, or asks about audit_check reports, signature_generate, or release packaging.
---

# AppGallery 提审流水线

按序执行，任何一步不过不进下一步：

1. **体检**：`audit_check`（项目根路径）→ ERROR 必须清零，WARN 逐条确认
   - 硬编码中文：中文市场可接受，保留
   - 图标缺失/layered icon json 校验失败：必须补
   - 仅提示"无 .hap 产物"：正常，出包在步骤 3
2. **签名**（无 signingConfigs 时）：`signature_generate`
   - 前置：用户已在终端 `devecocli auth login`（一次性，过期需重登）
   - 材料自动写入项目签名配置；失败先查登录态
3. **Release 出包**：`devecocli_build --build-mode release`（或原生 build_project）
   - 产物：`entry/build/default/outputs/default/entry-default-signed.hap`
   - 出包后可再跑一次 audit_check 复核
4. **市场截图**：模拟器装包 + `ui_screenshot`（截图存 `%TEMP%\aeox-shots\`，尺寸以 AGC 当期要求为准）
5. **材料核对清单**：
   - 应用图标（前景/背景/monochrome）
   - 应用简介/关键词（中文市场）
   - 隐私政策 URL（协议页内容一致）
   - 版本号递增（versionCode/versionName）
   - 权限用途声明与 module.json5 实际权限一致
6. **收尾**：更新 `PROJECT_STATUS.md`（状态、版本、日期），修复过程中产生的经验 kb_add 入库

## audit_check 报告解读

- `ERROR`：阻断项（清单页损坏/配置错误/引用缺失）
- `WARN`：人工判断（图标缺失、硬编码文案、无产物）
- `INFO`：仅提示（构建模式、依赖版本）
