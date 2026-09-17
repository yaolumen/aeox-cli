import { tool } from "@opencode-ai/plugin"
import { spawn } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { pathToFileURL } from "node:url"

// 原型截图：Edge headless 渲染 HTML 原型并截图（零依赖，不用 Puppeteer）

const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"

export const shot = tool({
  description:
    "Screenshot an HTML file (prototype/agreement page/icon draft) using headless Edge — zero dependencies. " +
    "Returns the saved PNG path — then use the read tool on that path to actually view the image. " +
    "Use for visual self-verification of HTML prototypes, or as the prototype side of a " +
    "prototype-vs-implementation comparison (pair with ui_screenshot for the device side).",
  args: {
    file: tool.schema.string().describe("Absolute path to the .html file to render"),
    width: tool.schema.number().optional().describe("Viewport width (default 1280)"),
    height: tool.schema.number().optional().describe("Viewport height (default 900)"),
    budgetMs: tool.schema.number().optional().describe("Virtual time budget for fonts/JS to settle (default 8000ms)"),
  },
  async execute(args) {
    if (!fs.existsSync(args.file)) {
      return `文件不存在: ${args.file}`
    }
    const dir = path.join(os.tmpdir(), "aeox-shots")
    fs.mkdirSync(dir, { recursive: true })
    const outPng = path.join(dir, `proto-${Date.now()}.png`)
    const width = args.width ?? 1280
    const height = args.height ?? 900
    const budget = args.budgetMs ?? 8000
    const edgeArgs = [
      "--headless=new",
      "--disable-gpu",
      "--no-first-run",
      "--no-default-browser-check",
      "--hide-scrollbars",
      `--window-size=${width},${height}`,
      `--virtual-time-budget=${budget}`,
      `--screenshot=${outPng}`,
      pathToFileURL(args.file).href,
    ]
    return new Promise<string>((resolve) => {
      const child = spawn(EDGE, edgeArgs, { windowsHide: true })
      let out = ""
      const timer = setTimeout(() => {
        child.kill()
        resolve(`[TIMEOUT after 30s]\n${out}`)
      }, 30_000)
      child.stdout.on("data", (c: Buffer) => {
        out += c.toString()
      })
      child.stderr.on("data", (c: Buffer) => {
        out += c.toString()
      })
      child.on("error", (err: Error) => {
        clearTimeout(timer)
        resolve(`[SPAWN ERROR] ${err.message}（Edge 未安装或路径不对: ${EDGE}）`)
      })
      child.on("close", () => {
        clearTimeout(timer)
        if (fs.existsSync(outPng)) {
          resolve(`截图已保存: ${outPng}（${width}x${height}）\n请用 read 工具查看该图片。`)
        } else {
          resolve(`截图失败（未生成文件）。stderr:\n${out.slice(-2000)}`)
        }
      })
    })
  },
})
