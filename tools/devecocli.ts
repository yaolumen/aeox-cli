import { tool } from "@opencode-ai/plugin"
import { spawn } from "node:child_process"

const CLI_JS = "C:/Users/Administrator/AppData/Roaming/npm/node_modules/@deveco/deveco-code/node_modules/@deveco/deveco-cli/dist/cli.js"
const MAX_OUTPUT = 20000

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

export const build = tool({
  description:
    "Build the HarmonyOS project in the session working directory (wraps `devecocli build`). " +
    "Returns the command exit code and the tail of the build output. " +
    "Run this after writing or editing .ets files to verify the project compiles.",
  args: {
    product: tool.schema
      .string()
      .optional()
      .describe("Product name defined in build-profile.json5 (default: default)"),
    modules: tool.schema
      .array(tool.schema.string())
      .optional()
      .describe('Modules to build, e.g. ["entry"] or ["entry@phone"]; omit to build the whole product'),
    buildMode: tool.schema
      .enum(["debug", "release"])
      .optional()
      .describe("Build mode (default: debug)"),
  },
  async execute(args, context) {
    const cliArgs = ["build"]
    if (args.product) {
      cliArgs.push("--product", args.product)
    }
    if (args.modules && args.modules.length > 0) {
      cliArgs.push("--modules", ...args.modules)
    }
    if (args.buildMode) {
      cliArgs.push("--build-mode", args.buildMode)
    }
    return runCli(cliArgs, context.directory, 15 * 60 * 1000)
  },
})

export const lint = tool({
  description:
    "Run DevEco Code Linter checks on TS/ArkTS code (wraps `devecocli check lint`). " +
    "Faster than a full build; use it for quick static verification of .ets/.ts files.",
  args: {
    path: tool.schema
      .string()
      .optional()
      .describe("File or directory to lint; omit to lint the project working directory"),
  },
  async execute(args, context) {
    const cliArgs = ["check", "lint"]
    if (args.path) {
      cliArgs.push(args.path)
    }
    return runCli(cliArgs, context.directory, 10 * 60 * 1000)
  },
})
