import { tool } from "@opencode-ai/plugin"
import { spawn } from "node:child_process"

const CLI_JS = "C:/Users/Administrator/AppData/Roaming/npm/node_modules/@deveco/deveco-code/node_modules/@deveco/deveco-cli/dist/cli.js"
const MAX_OUTPUT = 30000

async function runCli(args: string[], timeoutMs: number): Promise<string> {
  return new Promise<string>((resolve) => {
    const child = spawn("node", [CLI_JS, ...args], {
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

export const search = tool({
  description:
    "Search the local HarmonyOS developer documentation (wraps `devecocli docs search`). " +
    "Use this FIRST when unsure about ArkTS/ArkUI/OpenHarmony API behavior, decorators, lifecycle, or error semantics, " +
    "instead of answering from memory. Extract concise keywords (API names, decorator names, error text) for best results.",
  args: {
    keywords: tool.schema
      .array(tool.schema.string())
      .min(1)
      .describe("Search keywords, e.g. [\"Navigation\", \"返回拦截\"] or [\"@Local\"]"),
    catalog: tool.schema.string().optional().describe("Optional catalog name to narrow the search"),
    limit: tool.schema.number().optional().describe("Max results (default 20)"),
  },
  async execute(args) {
    const cliArgs = ["docs", "search", ...args.keywords]
    if (args.catalog) cliArgs.push("--catalog", args.catalog)
    if (args.limit) cliArgs.push("--limit", String(args.limit))
    return runCli(cliArgs, 60_000)
  },
})

export const read = tool({
  description:
    "Read the full content of a HarmonyOS documentation page by its documentId (wraps `devecocli docs read`). " +
    "Pick a documentId from docs_search results, then use this to read the complete doc before answering or coding.",
  args: {
    documentId: tool.schema
      .string()
      .describe("documentId from a docs_search result, e.g. 开发指南/.../xxx"),
  },
  async execute(args) {
    return runCli(["docs", "read", args.documentId], 60_000)
  },
})
