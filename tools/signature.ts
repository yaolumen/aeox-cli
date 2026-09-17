import { tool } from "@opencode-ai/plugin"
import { spawn } from "node:child_process"

// 签名材料生成：devecocli signature generate 封装（原生工具链的空白点）

const CLI_JS = "C:/Users/Administrator/AppData/Roaming/npm/node_modules/@deveco/deveco-code/node_modules/@deveco/deveco-cli/dist/cli.js"
const MAX_OUTPUT = 20000

export const generate = tool({
  description:
    "Automatically generate signing materials and write them into the project build config " +
    "(wraps `devecocli signature generate`) — fills the gap of the native toolset having no signing command. " +
    "Requires prior AGC authentication (`devecocli auth login` in a terminal, done once by the user). " +
    "Use when a project has no signingConfigs and needs a signed release package.",
  args: {
    force: tool.schema.boolean().optional().describe("Force overwrite existing local signing materials"),
    teamId: tool.schema.string().optional().describe("Team ID to use"),
    product: tool.schema.string().optional().describe('Product name (default "default")'),
  },
  async execute(args, context) {
    const cliArgs = ["signature", "generate"]
    if (args.force) cliArgs.push("--force")
    if (args.teamId) cliArgs.push("--team-id", args.teamId)
    if (args.product) cliArgs.push("--product", args.product)
    return new Promise<string>((resolve) => {
      const child = spawn("node", [CLI_JS, ...cliArgs], {
        cwd: context.directory,
        windowsHide: true,
        env: process.env,
      })
      let out = ""
      const timer = setTimeout(() => {
        child.kill()
        resolve(`[TIMEOUT after 5min]\n${out.slice(-MAX_OUTPUT)}`)
      }, 5 * 60 * 1000)
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
      child.on("close", (code: number | null) => {
        clearTimeout(timer)
        resolve(`[exit code: ${code}]\n${out.slice(-MAX_OUTPUT)}`)
      })
    })
  },
})
