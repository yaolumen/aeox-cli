---
name: harmony-prototype
description: 鸿蒙应用 HTML 原型编写约束（确保 ArkTS 可高度还原）
globs: ["**原型设计**/*.html", "**原型设计**/*.css"]
keywords: ["鸿蒙原型", "harmony原型", "原型还原", "还原原型", "arkts还原"]
---

# 鸿蒙原型编写约束（ArkUI 可兑现性）

本规则仅当 HTML 原型**面向鸿蒙应用**时生效。原型 = 设计契约：每个视觉效果和交互都必须是 ArkUI 能实现的，否则不许写进契约。非鸿蒙网页不受本规则限制。

## 视觉特性清单
允许（ArkUI 有直接等价物）：
- Flexbox 布局；position:absolute + z-index（→ Stack）
- linear-gradient / radial-gradient、border-radius、opacity
- transform 的 translate / scale / rotate
- backdrop-filter:blur（→ backgroundBlurStyle）、filter:blur（→ blur）
- overflow:hidden（→ clip）、**单层** box-shadow（→ shadow）

禁用或替换（无等价物 / 还原代价过高）：
- 多层 box-shadow、带 spread 的阴影 → 改单层阴影或边框/遮罩模拟
- ::before / ::after 伪元素 → 改真实子元素
- position:sticky → 删除，或改固定栏
- CSS Grid → 改 Flex 布局（ArkUI Grid 语义不同）
- vh / vw 单位 → 改百分比
- 图标字体（Font Awesome）→ 改**内联 SVG**（ArkUI Image 原生支持，还原零损耗）
- Google Fonts → 默认 HarmonyOS Sans；确需特色字体时在 UI设计稿.md 标注"需打包字体文件"

## 交互词汇（只写 ArkUI 有的）
- 底部弹层 → bindSheet 对应物；全屏覆盖层 → bindContentCover 对应物
- Toast → promptAction.showToast 对应物（不自制 div）
- 下拉刷新 → Refresh；滑动 → SwipeGesture；长按 → LongPressGesture

## 契约要求
- `:root` 主题变量 = 实现契约：每个变量将来 1:1 进应用 Constants.ets，命名保持可翻译（--tomato → TOMATO_COLOR）
- 尺寸按 vp 思维书写（数值即 vp），避免小数像素
- 手机壳（phone-shell / notch / statusbar）是演示外壳，**不属于还原对象**，在注释中标明
- 实在放不下的创意，直接砍掉或降级——不要给实现阶段埋雷
