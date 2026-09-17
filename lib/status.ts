import fs from "node:fs"
import path from "node:path"
import { DATA_SKILLS_DIR, LINKED_SUBDIRS, configDir, repoDir } from "./paths.ts"
import { cyan, dim, green, yellow } from "./ui.ts"

interface RuleSummary {
  file: string
  name: string
  desc: string
  trigger: string
}

function listTools(): string[] {
  const dir = repoDir("tools")
  const out: string[] = []
  if (!fs.existsSync(dir)) return out
  for (const f of fs.readdirSync(dir).filter((f) => f.endsWith(".ts"))) {
    const raw = fs.readFileSync(path.join(dir, f), "utf8")
    const names = [...raw.matchAll(/export const (\w+)/g)].map((m) => m[1])
    for (const n of names) out.push(`${f.replace(/\.ts$/, "")}_${n}`)
  }
  return out
}

function listRules(): RuleSummary[] {
  const dir = repoDir("rules")
  const out: RuleSummary[] = []
  if (!fs.existsSync(dir)) return out
  for (const f of fs.readdirSync(dir).filter((f) => f.endsWith(".md"))) {
    const raw = fs.readFileSync(path.join(dir, f), "utf8")
    if (!raw.startsWith("---")) continue
    const end = raw.indexOf("\n---", 3)
    if (end < 0) continue
    const fm = raw.slice(0, end)
    const name = fm.match(/^name:\s*(.+)$/m)?.[1]?.trim() ?? ""
    if (name.length === 0) continue
    const desc = fm.match(/^description:\s*(.+)$/m)?.[1]?.trim() ?? ""
    const always = /^alwaysApply:\s*true/m.test(fm)
    const globs = fm.match(/^globs:\s*(.+)$/m)?.[1]?.trim() ?? ""
    const kws = fm.match(/^keywords:\s*(.+)$/m)?.[1]?.trim() ?? ""
    const trigger = always ? "always" : [globs, kws].filter((s) => s.length > 0).join(" | ")
    out.push({ file: f, name, desc, trigger })
  }
  return out
}

export function runStatus(): void {
  const tools = listTools()
  console.log(cyan("custom tools") + dim(` (${tools.length})`))
  for (const t of tools) console.log(`  - ${t}`)
  console.log()
  const rules = listRules()
  console.log(cyan("rules") + dim(` (${rules.length})`))
  for (const r of rules) console.log(`  - ${r.name.padEnd(12)} ${dim(`[${r.trigger}]`)} ${dim(r.desc)}`)
  console.log()
  const skillsDir = repoDir("skills")
  if (fs.existsSync(skillsDir)) {
    const skills = fs.readdirSync(skillsDir).filter((f) => fs.statSync(path.join(skillsDir, f)).isDirectory())
    console.log(cyan("skills") + dim(` (${skills.length})`))
    for (const s of skills) {
      const link = path.join(DATA_SKILLS_DIR, s)
      try {
        const st = fs.lstatSync(link)
        const state = st.isSymbolicLink() ? "linked" : "orphan"
        console.log(`  - ${state === "linked" ? green("linked") : yellow("not linked")} ${s} ${state === "linked" ? dim("-> repo") : dim("(run: aeox install)")}`)
      } catch {
        console.log(`  - ${yellow("not linked")} ${s} ${dim("(run: aeox install)")}`)
      }
    }
    console.log()
  }
  console.log(cyan("deployment"))
  for (const sub of LINKED_SUBDIRS) {
    const link = configDir(sub)
    try {
      const st = fs.lstatSync(link)
      if (st.isSymbolicLink()) {
        let t = fs.readlinkSync(link)
        if (t.startsWith("\\\\?\\")) t = t.slice(4)
        console.log(`  - ${green("linked")} ${sub}/ -> ${dim(t)}`)
      } else {
        console.log(`  - ${yellow("real dir")} ${sub}/ (not linked)`)
      }
    } catch {
      console.log(`  - ${yellow("missing")} ${sub}/`)
    }
  }
}
