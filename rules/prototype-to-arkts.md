---
name: prototype-to-arkts
description: 从 HTML 原型还原 ArkTS UI 的映射与取舍规范
globs: ["*.ets"]
keywords: ["还原", "设计稿", "UI演示", "高度还原", "原型实现"]
---

# 原型 → ArkTS 还原规范

依据：`UI演示.html`（视觉契约）+ `UI设计稿.md`（设计说明）。目标是高度还原，不是像素黑客。

## 契约对齐
- 原型 `:root` 每个主题变量 → Constants.ets 常量 1:1 对应（如 --tomato → TOMATO_COLOR），色值/圆角/间距一律从变量取值，不凭感觉
- 原型若遵守 harmony-prototype 约束，则每个效果都有等价物，直接按下表翻译

## CSS → ArkUI 核心映射
| 原型写法 | ArkUI 实现 |
|---|---|
| display:flex 横向/纵向 | Row / Column（复杂场景 Flex） |
| position:absolute + z-index | Stack + zIndex / align |
| linear-gradient 背景 | .linearGradient() |
| border-radius / opacity | .borderRadius() / .opacity() |
| transform:translate/scale/rotate | .translate() / .scale() / .rotate() |
| backdrop-filter:blur | .backgroundBlurStyle() |
| overflow:hidden | .clip(true) |
| 单层 box-shadow | .shadow({ radius, color, offsetX, offsetY }) |
| 底部弹层容器 | bindSheet |
| 全屏遮罩 modal | bindContentCover |
| 自制 toast div | promptAction.showToast |
| 列表滚动 | Scroll / List + ForEach（稳定 key） |
| CSS transition / animation | animateTo / keyframeAnimateTo |
| 点击态 / 涟漪 | stateStyles / hoverEffect |

## 视觉对比闭环（有设备/模拟器时）
1. `proto_shot` 截原型图 → 用 read 工具查看
2. `ui_screenshot` 截真机/模拟器实现图 → 用 read 工具查看
3. 逐区块对比（布局/配色/间距/圆角/层级），偏差写入 UI设计稿.md 的"实现偏差"小节
4. 无设备时也至少用 `proto_shot` 自验原型渲染效果，不要盲写 HTML

## 取舍政策
- 遇到无等价物的效果：用最近的 ArkUI 惯用法替代，禁止嵌套黑客拼像素
- 每处偏差记录到 UI设计稿.md 的"实现偏差"小节，保持契约同步
- 图标：原型内联 SVG → 存为资源 svg 文件，Image 加载
- 字体：原型标 HarmonyOS Sans 直接用；其他字体打包 .ttf 后 FontFamily 指定
- 手机壳 / 状态栏 / 演示装饰一律不实现，只实现应用本体
