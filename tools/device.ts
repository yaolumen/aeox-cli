import { tool } from "@opencode-ai/plugin"
import { spawn } from "node:child_process"

// devecocli device/log/run 封装

const CLI_JS = "C:/Users/Administrator/AppData/Roaming/npm/node_modules/@deveco/deveco-code/node_modules/@deveco/deveco-cli/dist/cli.js"
const MAX_OUTPUT = 30000

async function runCli(args: string[], cwd: string, timeoutMs: number): Promise<string> {
  return new Promise<string>((resolve) => {
    const child = spawn("node", [CLI_JS, ...args], {
      cwd: cwd,
      windowsHide: true,
      env: process.env,
    })
    let out = ""
    const timer = setTimeout(() => {
      child.kill()
      resolve(`[TIMEOUT after ${Math.round(timeoutMs / 1000)}s]\n${out.slice(-MAX_OUTPUT)}`)
    }, timeoutMs)
    child.stdout.on("data", (chunk: Buffer) => {
      out += chunk.toString()
    })
    child.stderr.on("data", (chunk: Buffer) => {
      out += chunk.toString()
    })
    child.on("error", (err: Error) => {
      clearTimeout(timer)
      resolve(`[SPAWN ERROR] ${err.message}`)
    })
    child.on("close", (code: number | null) => {
      clearTimeout(timer)
      const tail = out.length > MAX_OUTPUT
        ? `...[output truncated, showing last ${MAX_OUTPUT} chars]\n${out.slice(-MAX_OUTPUT)}`
        : out
      resolve(`[exit code: ${code}]\n${tail}`)
    })
  })
}

export const list = tool({
  description:
    "List connected HarmonyOS devices/emulators (wraps `devecocli device list`). " +
    "Run this FIRST before any on-device operation (run/log/screenshot) to check a device is actually connected.",
  args: {},
  async execute(_args, context) {
    return runCli(["device", "list"], context.directory, 30_000)
  },
})

export const log = tool({
  description:
    "Fetch device application logs (wraps `devecocli log`) — one-shot dump, never streams. " +
    "Supports filtering by bundle name, keyword, level, crash-only, and time window (--from/--to offsets like 5m). " +
    "Use for diagnosing runtime crashes/behavior after reproducing an issue on the device.",
  args: {
    bundleName: tool.schema.string().optional().describe("Filter by application bundle name, e.g. com.example.myapp"),
    keyword: tool.schema.string().optional().describe("Keyword filter"),
    level: tool.schema.enum(["D", "I", "W", "E", "F"]).optional().describe("Log level filter"),
    crash: tool.schema.boolean().optional().describe("Only crash logs"),
    tail: tool.schema.number().optional().describe("Only the latest N lines (default 200)"),
    from: tool.schema.string().optional().describe("Start offset from now, e.g. 30s, 5m, 2.5m"),
    to: tool.schema.string().optional().describe("End offset from now, e.g. 10s"),
    device: tool.schema.string().optional().describe("Target device name or serial (required when multiple devices)"),
  },
  async execute(args, context) {
    const cliArgs = ["log"]
    if (args.bundleName) cliArgs.push("--bundle-name", args.bundleName)
    if (args.keyword) cliArgs.push("--keyword", args.keyword)
    if (args.level) cliArgs.push("--level", args.level)
    if (args.crash) cliArgs.push("--crash")
    if (args.tail) cliArgs.push("--tail", String(args.tail))
    else cliArgs.push("--tail", "200")
    if (args.from) cliArgs.push("--from", args.from)
    if (args.to) cliArgs.push("--to", args.to)
    if (args.device) cliArgs.push("--device", args.device)
    return runCli(cliArgs, context.directory, 60_000)
  },
})

export const run = tool({
  description:
    "Build and run the project on a connected device (wraps `devecocli run`). " +
    "Prefer the native start_app tool for a plain launch; use THIS tool when you need " +
    "--uninstall (clean reinstall), --skip-build (deploy existing artifact), or specific modules/ability. " +
    "Check device_list first.",
  args: {
    device: tool.schema.string().optional().describe("Target device name or serial"),
    modules: tool.schema.array(tool.schema.string()).optional().describe('Module(s) to run, e.g. ["entry"]'),
    buildMode: tool.schema.enum(["debug", "release"]).optional().describe("Build mode (default debug)"),
    ability: tool.schema.string().optional().describe("Ability name to launch"),
    uninstall: tool.schema.boolean().optional().describe("Uninstall existing app before installation"),
    skipBuild: tool.schema.boolean().optional().describe("Skip build and deploy existing artifacts"),
  },
  async execute(args, context) {
    const cliArgs = ["run"]
    if (args.device) cliArgs.push("--device", args.device)
    if (args.modules && args.modules.length > 0) cliArgs.push("--module", ...args.modules)
    if (args.buildMode) cliArgs.push("--build-mode", args.buildMode)
    if (args.ability) cliArgs.push("--ability", args.ability)
    if (args.uninstall) cliArgs.push("--uninstall")
    if (args.skipBuild) cliArgs.push("--skip-build")
    return runCli(cliArgs, context.directory, 10 * 60 * 1000)
  },
})
