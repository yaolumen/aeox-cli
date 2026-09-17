---
name: web
description: HTML/CSS/JS 原型界面与网页开发规范（单文件原型、双主题、手机壳）
globs: ["*.html", "*.css"]
keywords: ["html", "css", "原型", "prototype", "网页", "图标渲染", "协议页"]
---

# HTML/CSS/JS 规范（原型 Demo 场景）

## 文件形态
- 原型一律**单文件自包含**：CSS/JS 全部内联，双击即可打开演示；不建工程、不引构建工具
- 鸿蒙应用原型三件套惯例：`UI演示.html`（原型）+ `UI设计稿.md`（设计说明）+ `应用图标.html`（图标渲染稿）
- HTML 骨架：`<!DOCTYPE html>` + `lang="zh-CN"` + `<meta charset="UTF-8">` + viewport meta

## 主题系统（必须）
- 用 CSS 自定义属性建主题：`:root` 默认深色，`:root[data-theme="light"]` 覆盖浅色
- 变量命名参考：--bg / --surface / --surface-2 / --fg / --muted / --border / --overlay / --tabbar-bg / --toast-bg / --shadow / --phone-shell / --notch / --statusbar / --on-brand
- 品牌色三元组模式：`--品牌`（基色）/ `--品牌-2`（亮部）/ `--品牌-deep`（深部），如 --tomato / --tomato-2 / --tomato-deep
- 页面必须提供主题切换按钮，默认深色

## 手机壳模拟
- 页面中央渲染手机外壳：--phone-shell / --phone-ring-1 / --phone-ring-2 / --notch / --statusbar 变量控制
- 底部 TabBar 用 --tabbar-bg 半透明毛玻璃效果，状态栏时间用 --statusbar 色

## 字体与图标
- Google Fonts（Manrope / Fraunces 等）与 Font Awesome CDN 允许使用
- 全局重置：`*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}`

## JS 约定
- 原型用原生 JS（ES6+），零框架零构建依赖
- 交互演示用 class 切换 / 条件渲染模拟，不做真实状态管理
- 不做数据持久化；演示数据直接写在 JS 常量里，保证刷新即复位

## 特殊页面约束
- **应用内协议页**（user_agreement_zh.html 等 rawfile）：必须遵循华为模板格式（Web 组件中加载），以所属应用的主题配色渲染并支持深色模式，**不得自由发挥结构**
- **图标渲染稿**：固定画布尺寸（如 512x512），纯 CSS 画图形，供 Puppeteer 截图导出 PNG；深色圆角矩形背景由导出流程决定，画布内只画前景与渐变

## 鸿蒙原型附加约束
- 面向鸿蒙应用的原型（位于原型设计目录，或用户说明用于鸿蒙应用）：额外遵守 harmony-prototype 规则——只用 ArkUI 能兑现的特性（内联 SVG 图标、禁伪元素/sticky/vh、单层阴影等）
- 非鸿蒙网页（落地页、博客、独立 Web 项目）不受鸿蒙约束，自由发挥
