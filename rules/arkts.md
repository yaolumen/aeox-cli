---
name: arkts
description: ArkTS/ArkUI (HarmonyOS) 开发规范
globs: ["*.ets"]
keywords: ["arkts", "arkui", "harmonyos", "鸿蒙", "ets"]
---

# ArkTS 规范

- ArkTS 不是标准 TypeScript：禁止结构化类型、动态属性访问 obj[key]、any、as 断言
- 对象字面量必须有明确类型上下文（类型化变量或类型化函数参数）
- 状态管理：组件内部状态用 @State；父传子用 @Prop/@Param；子改父用 @Link/@Event
- ForEach 必须提供稳定唯一的 keyGenerator，避免渲染错乱
- 页面路由用 Navigation/NavPathStack，不使用已废弃的 router API
- 修改 .ets 文件后必须通过 ArkTS 严格模式检查（arkts-* 规则集）
