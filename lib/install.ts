import fs from "node:fs"
import path from "node:path"
import { spawnSync } from "node:child_process"
import { CONFIG_DIR, DATA_SKILLS_DIR, DEVECO_JSONC, LINKED_SUBDIRS, configDir, repoDir } from "./paths.ts"
import { dim, green, red, yellow } from "./ui.ts"

function ensureDeps(): void {
  if (fs.existsSync(path.join(repoDir("node_modules"), "@opencode-ai", "plugin"))) {
    console.log(`  ${green("[ OK ]")} dependencies already installed`)
    return
  }
  console.log(dim("  running npm install ..."))
  const r = spawnSync("cmd.exe", ["/c", "npm", "install"], { cwd: repoDir("."), stdio: "inherit" })
  if (r.status !== 0) {
    console.log(`  ${red("[FAIL]")} npm install failed`)
  }
}

function normalizeLinkTarget(t: string): string {
  let out = t
  if (out.startsWith("\\\\?\\")) out = out.slice(4)
  if (out.startsWith("\\??\\")) out = out.slice(4)
  return path.resolve(out)
}

function ensureLinks(): void {
  fs.mkdirSync(CONFIG_DIR, { recursive: true })
  for (const sub of LINKED_SUBDIRS) {
    const target = path.resolve(repoDir(sub))
    const link = configDir(sub)
    if (!fs.existsSync(target)) {
      console.log(`  ${red("[SKIP]")} repo ${sub}/ missing`)
      continue
    }
    let st: fs.Stats | undefined
    try {
      st = fs.lstatSync(link)
    } catch {
      st = undefined
    }
    if (st?.isSymbolicLink()) {
      const t = normalizeLinkTarget(fs.readlinkSync(link))
      if (t === target) {
        console.log(`  ${green("[ OK ]")} ${sub}/ already linked -> repo`)
      } else {
        console.log(`  ${yellow("[WARN]")} ${sub}/ links to ${t}, leaving untouched`)
      }
      continue
    }
    if (st) {
      const backup = `${link}.backup-${Date.now()}`
      try {
        fs.renameSync(link, backup)
        console.log(`  ${yellow("[BACKUP]")} existing ${sub}/ -> ${path.basename(backup)}`)
      } catch {
        console.log(`  ${red("[FAIL]")} cannot move existing ${sub}/, skipped`)
        continue
      }
    }
    fs.symlinkSync(target, link, "junction")
    console.log(`  ${green("[ OK ]")} ${sub}/ linked -> ${target}`)
  }
}

function ensureSkills(): void {
  const repoSkills = repoDir("skills")
  if (!fs.existsSync(repoSkills)) {
    console.log(`  ${yellow("[WARN]")} repo skills/ missing`)
    return
  }
  fs.mkdirSync(DATA_SKILLS_DIR, { recursive: true })
  for (const name of fs.readdirSync(repoSkills)) {
    const target = path.resolve(path.join(repoSkills, name))
    if (!fs.statSync(target).isDirectory()) continue
    const link = path.join(DATA_SKILLS_DIR, name)
    let st: fs.Stats | undefined
    try {
      st = fs.lstatSync(link)
    } catch {
      st = undefined
    }
    if (st?.isSymbolicLink()) {
      const t = normalizeLinkTarget(fs.readlinkSync(link))
      if (t === target) {
        console.log(`  ${green("[ OK ]")} skill ${name} already linked -> repo`)
      } else {
        console.log(`  ${yellow("[WARN]")} skill ${name} links to ${t}, leaving untouched`)
      }
      continue
    }
    if (st) {
      console.log(`  ${yellow("[WARN]")} skill ${name} exists but is not a link, leaving untouched`)
      continue
    }
    fs.symlinkSync(target, link, "junction")
    console.log(`  ${green("[ OK ]")} skill ${name} linked -> ${target}`)
  }
}

function ensureRegistration(): void {
  if (!fs.existsSync(DEVECO_JSONC)) {
    console.log(`  ${yellow("[WARN]")} deveco.jsonc not found, plugin registration skipped`)
    return
  }
  const text = fs.readFileSync(DEVECO_JSONC, "utf8")
  const hasRules = text.includes("ai-rules")
  const hasDiag = text.includes("build-diagnostics")
  if (hasRules && hasDiag) {
    console.log(`  ${green("[ OK ]")} plugins ai-rules + build-diagnostics already registered`)
    return
  }
  if (hasRules && !hasDiag) {
    // ai-rules 已注册但缺 build-diagnostics：在 ai-rules 条目后追加
    const backup = `${DEVECO_JSONC}.backup-${Date.now()}`
    fs.copyFileSync(DEVECO_JSONC, backup)
    const updated = text.replace(
      /("plugin"\s*:\s*\[\s*"[^"]*ai-rules[^"]*")/,
      '$1, "plugin/build-diagnostics.ts"'
    )
    if (updated === text) {
      console.log(`  ${yellow("[WARN]")} ai-rules registered but cannot auto-add build-diagnostics, add "plugin/build-diagnostics.ts" to the plugin array manually`)
      return
    }
    fs.writeFileSync(DEVECO_JSONC, updated, "utf8")
    console.log(`  ${green("[ OK ]")} registered build-diagnostics (backup: ${path.basename(backup)})`)
    return
  }
  if (/^\s*"plugin"\s*:/m.test(text)) {
    console.log(`  ${yellow("[WARN]")} "plugin" key exists without ai-rules, add "plugin/ai-rules.ts" manually`)
    return
  }
  const lines = text.split(/\r?\n/)
  const insertAt = lines.findIndex((l) => l.includes("{"))
  if (insertAt < 0) {
    console.log(`  ${yellow("[WARN]")} cannot locate insertion point in deveco.jsonc, add manually`)
    return
  }
  const backup = `${DEVECO_JSONC}.backup-${Date.now()}`
  fs.copyFileSync(DEVECO_JSONC, backup)
  lines.splice(insertAt + 1, 0, `  "plugin": ["plugin/ai-rules.ts", "plugin/build-diagnostics.ts"],`)
  fs.writeFileSync(DEVECO_JSONC, lines.join("\n"), "utf8")
  console.log(`  ${green("[ OK ]")} registered plugins (backup: ${path.basename(backup)})`)
}

export function runInstall(): void {
  console.log("aeox install")
  console.log()
  ensureDeps()
  ensureLinks()
  ensureSkills()
  ensureRegistration()
  console.log()
  console.log(dim("next: aeox doctor"))
}
