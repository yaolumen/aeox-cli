import { tool } from "@opencode-ai/plugin"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"

// 本地错误知识库：修复后记录，遇到问题先检索

const KB_DIR = path.join(os.homedir(), ".local", "share", "deveco", "kb")

type KbType = "arkts" | "build" | "runtime" | "review" | "tooling" | "other"

const KB_TYPES: KbType[] = ["arkts", "build", "runtime", "review", "tooling", "other"]

function timestampId(): string {
  const d = new Date()
  const p = (n: number): string => String(n).padStart(2, "0")
  return (
    `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}` +
    `-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
  )
}

function countOccurrences(haystack: string, needle: string): number {
  if (needle.length === 0) return 0
  let count = 0
  let idx = haystack.indexOf(needle)
  while (idx !== -1) {
    count++
    idx = haystack.indexOf(needle, idx + needle.length)
  }
  return count
}

export const add = tool({
  description:
    "Record a RESOLVED error/issue into the local knowledge base so future sessions can search it. " +
    "Call this after fixing any non-trivial arkts / build / runtime / review issue (symptom, root cause, solution). " +
    "Keep the exact key error text in the symptom so it can be matched by keyword search later.",
  args: {
    symptom: tool.schema.string().describe("Observed symptom — include the exact key error message / behavior"),
    rootCause: tool.schema.string().describe("Root cause explanation"),
    solution: tool.schema.string().describe("How it was fixed (concrete steps/code)"),
    type: tool.schema.enum(KB_TYPES).describe("Category: arkts | build | runtime | review | tooling | other"),
    tags: tool.schema.array(tool.schema.string()).optional().describe("Extra search keywords"),
    project: tool.schema.string().optional().describe("Project / app name it occurred in"),
  },
  async execute(args) {
    fs.mkdirSync(KB_DIR, { recursive: true })
    const id = `${timestampId()}-${args.type}`
    const file = path.join(KB_DIR, `${id}.md`)
    const frontmatter = [
      "---",
      `id: ${id}`,
      `type: ${args.type}`,
      `tags: ${(args.tags ?? []).join(", ")}`,
      `project: ${args.project ?? ""}`,
      `created: ${new Date().toISOString()}`,
      "---",
      "",
      "# 症状",
      args.symptom,
      "",
      "# 根因",
      args.rootCause,
      "",
      "# 解法",
      args.solution,
      "",
    ].join("\n")
    fs.writeFileSync(file, frontmatter, "utf8")
    const total = fs.readdirSync(KB_DIR).filter((f) => f.endsWith(".md")).length
    return `已记录到知识库: ${file}\n当前知识库共 ${total} 条`
  },
})

export const search = tool({
  description:
    "Search the local error knowledge base (entries recorded via kb_add). " +
    "Call this BEFORE debugging a non-trivial error — a previously resolved identical issue may save the whole investigation. " +
    "If no entry matches, proceed with normal debugging and record the fix with kb_add afterwards.",
  args: {
    query: tool.schema.string().describe("Error text / symptom keywords, e.g. \"arkts-no-any 对象字面量\""),
    type: tool.schema.enum(KB_TYPES).optional().describe("Optional category filter"),
    limit: tool.schema.number().optional().describe("Max entries to return (default 5)"),
  },
  async execute(args) {
    let files: string[] = []
    try {
      files = fs.readdirSync(KB_DIR).filter((f) => f.endsWith(".md"))
    } catch {
      return "知识库为空（目录不存在）。调试完成后请用 kb_add 记录解法。"
    }
    if (files.length === 0) {
      return "知识库为空。调试完成后请用 kb_add 记录解法。"
    }
    const tokens = args.query
      .toLowerCase()
      .split(/[\s,，;；]+/)
      .filter((t) => t.length > 0)
    const limit = args.limit ?? 5
    interface Scored {
      file: string
      score: number
      content: string
    }
    const scored: Scored[] = []
    for (const f of files) {
      const full = path.join(KB_DIR, f)
      let content = ""
      try {
        content = fs.readFileSync(full, "utf8")
      } catch {
        continue
      }
      if (args.type && !content.toLowerCase().includes(`type: ${args.type}`)) continue
      const lower = content.toLowerCase()
      let score = 0
      for (const t of tokens) score += countOccurrences(lower, t)
      if (args.query.length > 2 && lower.includes(args.query.toLowerCase())) score += 10
      if (score > 0) scored.push({ file: f, score: score, content: content })
    }
    if (scored.length === 0) {
      return `没有匹配条目（知识库共 ${files.length} 条）。请继续排查，解决后用 kb_add 记录。`
    }
    scored.sort((a, b) => b.score - a.score)
    const out: string[] = [`匹配 ${scored.length} 条（知识库共 ${files.length} 条），按相关度排序：`]
    for (const s of scored.slice(0, limit)) {
      const excerpt = s.content.length > 1500 ? s.content.slice(0, 1500) + "\n...[截断]" : s.content
      out.push(`\n===== ${s.file} (score ${s.score}) =====\n${excerpt}`)
    }
    return out.join("\n")
  },
})
