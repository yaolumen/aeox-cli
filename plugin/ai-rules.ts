// ai-rules plugin: dynamically inject AI coding rules into the system prompt.
// Rules live as markdown files (with frontmatter) in:
//   global : ~/.config/deveco/rules/*.md
//   project: <project>/.deveco/rules/*.md   (overrides global by rule name)
//
// Frontmatter fields:
//   name:        rule id (must be unique)
//   description: what this rule is for
//   globs:       file patterns, e.g. ["*.ets", "src/**/*.ts"] - matched against
//                recently edited files and file paths mentioned in the user message
//   keywords:    matched (word-boundary, case-insensitive) against the latest user message
//   alwaysApply: true = inject on every request
//
// A rule is selected if alwaysApply, OR any glob matches, OR any keyword matches.

import fs from "fs"
import path from "path"
import os from "os"
import { fileURLToPath } from "url"

interface RuleDef {
  name: string
  description: string
  globs: string[]
  keywords: string[]
  alwaysApply: boolean
  content: string
}

interface SessionState {
  recentFiles: string[]
  lastUserText: string
}

interface ToolBeforeInput {
  tool?: string
  sessionID?: string
}

interface ToolArgs {
  filePath?: string
  file_path?: string
  [key: string]: string | undefined
}

interface ToolBeforeOutput {
  args?: ToolArgs
}

interface MsgPart {
  type?: string
  text?: string
}

interface MessageLike {
  role?: string
  info?: { role?: string; sessionID?: string }
  parts?: MsgPart[]
  content?: string | MsgPart[]
}

interface MessagesOutput {
  messages?: MessageLike[]
}

interface SystemInput {
  sessionID?: string
}

interface SystemOutput {
  system?: string[]
}

interface PluginInput {
  directory: string
}

const MAX_RECENT_FILES = 20
const MAX_SELECTED_RULES = 8
const MAX_SESSIONS = 64

const globalRulesDir = path.join(os.homedir(), ".config", "deveco", "rules")
const configRoot = path.join(os.homedir(), ".config", "deveco")
const dataSkillsDir = path.join(os.homedir(), ".local", "share", "deveco", "skills")

// ---- aeox identity banner (always injected, so users can confirm aeox is active) ----

function readAeoxVersion(): string {
  try {
    // plugin/ is junction-linked into the config dir; realpath resolves back to the repo
    const selfReal = fs.realpathSync(fileURLToPath(import.meta.url))
    const pkgPath = path.join(path.dirname(selfReal), "..", "package.json")
    const parsed: object = JSON.parse(fs.readFileSync(pkgPath, "utf8"))
    const v = (parsed as { version?: unknown }).version
    return typeof v === "string" && v.length > 0 ? v : "unknown"
  } catch {
    return "unknown"
  }
}

function countCustomTools(): number {
  let n = 0
  try {
    const dir = path.join(configRoot, "tools")
    for (const f of fs.readdirSync(dir).filter((f) => f.endsWith(".ts"))) {
      const raw = fs.readFileSync(path.join(dir, f), "utf8")
      n += [...raw.matchAll(/export const (\w+)/g)].length
    }
  } catch {
    // ignore
  }
  return n
}

function countRuleFiles(): number {
  try {
    return fs.readdirSync(globalRulesDir).filter((f) => f.endsWith(".md")).length
  } catch {
    return 0
  }
}

function countAeoxSkills(): number {
  try {
    return fs
      .readdirSync(dataSkillsDir)
      .filter((d) => {
        try {
          return fs.lstatSync(path.join(dataSkillsDir, d)).isSymbolicLink()
        } catch {
          return false
        }
      }).length
  } catch {
    return 0
  }
}

function aeoxBanner(): string {
  return [
    "<aeox>",
    `aeox-cli v${readAeoxVersion()} 已启用 — HarmonyOS/Node 开发增强层（自定义工具 ${countCustomTools()} / 规则 ${countRuleFiles()} / 自研技能 ${countAeoxSkills()}，另有 agent 预设与构建诊断插件）。`,
    "当用户询问 aeox 是否已安装/启用时，如实回答已启用并给出上述版本与资产数。",
    "</aeox>",
  ].join("\n")
}

const sessions = new Map<string, SessionState>()

function stateFor(id: string): SessionState {
  const key = id || "default"
  let s = sessions.get(key)
  if (!s) {
    if (sessions.size >= MAX_SESSIONS) {
      const oldest = sessions.keys().next().value
      if (oldest !== undefined) sessions.delete(oldest)
    }
    s = { recentFiles: [], lastUserText: "" }
    sessions.set(key, s)
  }
  return s
}

function unquote(v: string): string {
  return v
    .trim()
    .replace(/^["'`]+|["'`]+$/g, "")
    .trim()
}

function parseScalar(v: string): string | boolean | string[] {
  const t = v.trim()
  if (t === "true") return true
  if (t === "false") return false
  if (t.startsWith("[") && t.endsWith("]")) {
    return t
      .slice(1, -1)
      .split(",")
      .map(unquote)
      .filter((s) => s.length > 0)
  }
  if (t.includes(",")) {
    return t
      .split(",")
      .map(unquote)
      .filter((s) => s.length > 0)
  }
  return unquote(t)
}

function parseFrontmatter(raw: string): { fields: Map<string, string | boolean | string[]>, body: string } {
  const fields = new Map<string, string | boolean | string[]>()
  let body = raw
  const lines = raw.split(/\r?\n/)
  if (lines[0]?.trim() === "---") {
    let end = -1
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim() === "---") {
        end = i
        break
      }
    }
    if (end > 0) {
      let currentKey = ""
      for (let i = 1; i < end; i++) {
        const line = lines[i]
        const m = line.match(/^([A-Za-z_][\w-]*)\s*:\s*(.*)$/)
        if (m) {
          currentKey = m[1]
          const value = parseScalar(m[2])
          fields.set(currentKey, value)
        } else if (/^\s+-\s+/.test(line) && currentKey) {
          const item = unquote(line.replace(/^\s+-\s+/, ""))
          if (item.length === 0) continue
          const prev = fields.get(currentKey)
          if (Array.isArray(prev)) fields.set(currentKey, [...prev, item])
          else if (typeof prev === "string" && prev.length > 0) fields.set(currentKey, [prev, item])
          else fields.set(currentKey, [item])
        }
      }
      body = lines.slice(end + 1).join("\n")
    }
  }
  return { fields, body }
}

function asStringArray(v: string | boolean | string[] | undefined): string[] {
  if (Array.isArray(v)) return v.filter((s) => typeof s === "string" && s.length > 0)
  if (typeof v === "string" && v.length > 0) return [v]
  return []
}

function parseRuleFile(file: string): RuleDef | null {
  let raw = ""
  try {
    raw = fs.readFileSync(file, "utf8")
  } catch {
    return null
  }
  const { fields, body } = parseFrontmatter(raw)
  const name = fields.get("name")
  if (typeof name !== "string" || name.length === 0) return null
  const content = body.trim()
  if (content.length === 0) return null
  const desc = fields.get("description")
  const always = fields.get("alwaysApply")
  return {
    name,
    description: typeof desc === "string" ? desc : "",
    globs: asStringArray(fields.get("globs")),
    keywords: asStringArray(fields.get("keywords")),
    alwaysApply: always === true,
    content,
  }
}

const dirCache = new Map<string, { mtime: number; rules: RuleDef[] }>()

function loadRulesFrom(dir: string): RuleDef[] {
  let entries: fs.Dirent[] = []
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  } catch {
    return []
  }
  const files = entries.filter((e) => e.isFile() && /\.md$/i.test(e.name)).map((e) => path.join(dir, e.name))
  let mtime = 0
  for (const f of files) {
    try {
      mtime = Math.max(mtime, fs.statSync(f).mtimeMs)
    } catch {
      // ignore
    }
  }
  const cached = dirCache.get(dir)
  if (cached && cached.mtime === mtime) return cached.rules
  const rules: RuleDef[] = []
  for (const f of files) {
    const r = parseRuleFile(f)
    if (r) rules.push(r)
  }
  dirCache.set(dir, { mtime, rules })
  return rules
}

function globToRegex(pattern: string): RegExp {
  let re = ""
  for (let i = 0; i < pattern.length; i++) {
    const ch = pattern[i]
    if (ch === "*") {
      if (pattern[i + 1] === "*") {
        re += "[\\s\\S]*"
        i++
      } else {
        re += "[^/\\\\]*"
      }
    } else if (ch === "?") {
      re += "[^/\\\\]"
    } else {
      re += ch.replace(/[.+^${}()|[\]\\]/g, "\\$&")
    }
  }
  return new RegExp("^" + re + "$", "i")
}

function globMatch(pattern: string, filepath: string): boolean {
  const re = globToRegex(pattern)
  const normalized = filepath.replace(/\\/g, "/")
  if (re.test(normalized)) return true
  if (!/[/\\]/.test(pattern)) {
    const base = normalized.split("/").pop() ?? filepath
    return re.test(base)
  }
  return false
}

function keywordMatch(keyword: string, text: string): boolean {
  if (keyword.length === 0 || text.length === 0) return false
  if (/[^\x00-\x7F]/.test(keyword)) return text.includes(keyword)
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  return new RegExp(`(^|[^\\p{L}\\p{N}_])${escaped}([^\\p{L}\\p{N}_]|$)`, "iu").test(text)
}

function extractText(m: MessageLike): string {
  const out: string[] = []
  if (typeof m.content === "string") {
    out.push(m.content)
  } else if (Array.isArray(m.parts)) {
    for (const p of m.parts) {
      if (p?.type === "text" && typeof p.text === "string") out.push(p.text)
    }
  }
  return out.join("\n")
}

export default async (input: PluginInput) => {
  const projectRulesDir = path.join(input.directory, ".deveco", "rules")

  return {
    "tool.execute.before": async (tInput: ToolBeforeInput, tOutput: ToolBeforeOutput) => {
      const tool = tInput.tool ?? ""
      if (tool !== "edit" && tool !== "write" && tool !== "read") return
      const fp = tOutput.args?.filePath ?? tOutput.args?.file_path
      if (typeof fp !== "string" || fp.length === 0 || !path.isAbsolute(fp)) return
      const st = stateFor(tInput.sessionID ?? "default")
      st.recentFiles = [fp, ...st.recentFiles.filter((f) => f !== fp)].slice(0, MAX_RECENT_FILES)
    },

    "experimental.chat.messages.transform": async (_mInput: object, mOutput: MessagesOutput) => {
      const msgs = mOutput.messages
      if (!Array.isArray(msgs)) return
      for (let i = msgs.length - 1; i >= 0; i--) {
        const m = msgs[i]
        if (!m) continue
        const role = m.info?.role ?? m.role
        if (role !== "user") continue
        const text = extractText(m)
        if (text.length === 0) continue
        const sid = m.info?.sessionID
        stateFor(typeof sid === "string" ? sid : "default").lastUserText = text
        break
      }
    },

    "experimental.chat.system.transform": async (sInput: SystemInput, sOutput: SystemOutput) => {
      const arr = sOutput.system
      if (!Array.isArray(arr)) return
      const st = stateFor(sInput.sessionID ?? "default")

      arr.push(aeoxBanner())

      const merged = new Map<string, RuleDef>()
      for (const r of loadRulesFrom(globalRulesDir)) merged.set(r.name, r)
      for (const r of loadRulesFrom(projectRulesDir)) merged.set(r.name, r)
      if (merged.size === 0) return

      const text = st.lastUserText
      const mentioned = text.match(/[\w./\\-]+\.[A-Za-z0-9]{1,6}/g) ?? []
      const candidates = [...st.recentFiles, ...mentioned]

      const selected: RuleDef[] = []
      for (const r of merged.values()) {
        if (r.alwaysApply) {
          selected.push(r)
          continue
        }
        if (r.globs.some((g) => candidates.some((f) => globMatch(g, f)))) {
          selected.push(r)
          continue
        }
        if (r.keywords.some((k) => keywordMatch(k, text))) {
          selected.push(r)
        }
      }
      if (selected.length === 0) return

      selected.sort((a, b) => a.name.localeCompare(b.name))
      const capped = selected.slice(0, MAX_SELECTED_RULES)
      const block = [
        "<ai-rules>",
        "The following coding rules were selected by the ai-rules plugin based on the current context. Treat them as binding requirements for this request.",
        ...capped.map((r) => `## Rule: ${r.name}\n\n${r.content}`),
        "</ai-rules>",
      ].join("\n\n")
      arr.push(block)
    },
  }
}
