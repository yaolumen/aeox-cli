import { tool } from "@opencode-ai/plugin"
import { spawn } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"

// 设备截图：devecocli ui screenshot 封装

const CLI_JS = "C:/Users/Administrator/AppData/Roaming/npm/node_modules/@deveco/deveco-code/node_modules/@deveco/deveco-cli/dist/cli.js"

function shotDir(): string {
  const d = path.join(os.tmpdir(), "aeox-shots")
  fs.mkdirSync(d, { recursive: true })
  return d
}

export const screenshot = tool({
  description:
    "Capture a screenshot of the connected device screen (wraps `devecocli ui screenshot`). " +
    "Returns the saved PNG path — then use the read tool on that path to actually view the image. " +
    "Use for visual verification of the running app, or for prototype-vs-implementation comparison " +
    "(pair with proto_shot for the HTML prototype screenshot). Check device_list first.",
  args: {
    device: tool.schema.string().optional().describe("Target device name or serial (required when multiple devices)"),
    display: tool.schema.string().optional().describe("Target display id (omit for default screen)"),
  },
  async execute(args, context) {
    const file = path.join(shotDir(), `device-${Date.now()}.png`)
    const cliArgs = ["ui", "screenshot", "--path", file]
    if (args.device) cliArgs.push("--device", args.device)
    if (args.display) cliArgs.push("--display", args.display)
    return new Promise<string>((resolve) => {
      const child = spawn("node", [CLI_JS, ...cliArgs], {
        cwd: context.directory,
        windowsHide: true,
        env: process.env,
      })
      let out = ""
      const timer = setTimeout(() => {
        child.kill()
        resolve(`[TIMEOUT]\n${out}`)
      }, 60_000)
      child.stdout.on("data", (c: Buffer) => {
        out += c.toString()
      })
      child.stderr.on("data", (c: Buffer) => {
        out += c.toString()
      })
      child.on("error", (err: Error) => {
        clearTimeout(timer)
        resolve(`[SPAWN ERROR] ${err.message}`)
      })
      child.on("close", () => {
        clearTimeout(timer)
        if (fs.existsSync(file)) {
          resolve(`截图已保存: ${file}\n请用 read 工具查看该图片。\n${out}`)
        } else {
          resolve(`截图失败（未生成文件）。\n${out}`)
        }
      })
    })
  },
})
