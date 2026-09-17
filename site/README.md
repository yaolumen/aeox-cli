# aeox-cli site — 项目展示站

纯静态、单文件、零依赖。每个页面自包含（CSS/JS 内联），无构建步骤。
Minimal 米白杂志风（纸色底 / 衬线标题 / 朱红强调），全站固定浅色。

## 页面（对外发布，共 6 个文件）

| 文件 | 内容 |
|---|---|
| `index.html` | 定稿首页：痛点叙事 01-05 / 资产盘点 / 快速开始 / 体验入口，顶部导航 + AEOX 家族式大页脚 |
| `doctor.html` | 在线体验：aeox doctor 体检（3 种场景，终端打字动画） |
| `diagnostics.html` | 在线体验：构建诊断对比（日志泥潭 vs 结构化摘要） |
| `rules.html` | 在线体验：规则注入模拟（8 条规则按上下文点亮） |
| `agents.html` | 在线体验：4 个 Agent 预设提示词预览 |
| `install.ps1` | 一键安装脚本：`iwr -useb https://cli.aeox.uk/install.ps1 \| iex` |

## 本地预览

```powershell
npx serve site          # 或
python -m http.server 8080 --directory site
```

## 部署

**已上线：https://cli.aeox.uk** （Hostinger，2026-09-17 部署并验证：6 文件 200 / HTTP 301 强制 HTTPS / 旧 demo-\* 页面 404 无残留）

重新部署：覆盖上传本目录全部 6 个文件（5 个 .html + install.ps1）到 Hostinger 站点根目录。也适用于任意静态托管：

- **nginx**：`root` 指向本目录
- **对象存储**（OBS/COS/S3）：直接上传
- **GitHub Pages / Cloudflare Pages**：推送本目录

无需 Node、无需构建、无外部 CDN 依赖（离线可用）。
