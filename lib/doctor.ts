import fs from "node:fs"
import path from "node:path"
import {
  CONFIG_DIR,
  DATA_SKILLS_DIR,
  DEVECO_CLI_CMD,
  DEVECO_CLI_PATH_FILE,
  DEVECO_JSONC,
  LINKED_SUBDIRS,
  NPM_GLOBAL_DIR,
  configDir,
  repoDir,
} from "./paths.ts"
import { bold, dim, green, red, yellow } from "./ui.ts"

interface CheckResult {
  name: string
  state: "ok" | "warn" | "fail"
  detail: string
}

function checkNode(): CheckResult {
  const m = process.version.match(/^v(\d+)\.(\d+)\./)
  const major = m ? Number(m[1]) : 0
  const minor = m ? Number(m[2]) : 0
  const ok = major >= 23 || (major === 22 && minor >= 18)
  return {
    name: "Node.js runtime",
    state: ok ? "ok" : "fail",
    detail: `${process.version}${ok ? "" : " (need >= 22.18)"}`,
  }
}

function checkRepoAssets(): CheckResult {
  const missing: string[] = []
  if (!fs.existsSync(repoDir("tools"))) missing.push("tools/")
  if (!fs.existsSync(repoDir("rules"))) missing.push("rules/")
  if (!fs.existsSync(repoDir("plugin/ai-rules.ts"))) missing.push("plugin/ai-rules.ts")
  if (!fs.existsSync(repoDir("plugin/build-diagnostics.ts"))) missing.push("plugin/build-diagnostics.ts")
  if (!fs.existsSync(repoDir("command"))) missing.push("command/")
  const rules = fs.existsSync(repoDir("rules"))
    ? fs.readdirSync(repoDir("rules")).filter((f) => f.endsWith(".md")).length
    : 0
  if (rules === 0) missing.push("rules/*.md")
  return {
    name: "Repo assets",
    state: missing.length === 0 ? "ok" : "fail",
    detail: missing.length === 0 ? `tools + plugin + ${rules} rules` : `missing: ${missing.join(", ")}`,
  }
}

function checkRepoDeps(): CheckResult {
  const ok = fs.existsSync(path.join(repoDir("node_modules"), "@opencode-ai", "plugin", "package.json"))
  return {
    name: "Repo dependencies",
    state: ok ? "ok" : "fail",
    detail: ok ? "@opencode-ai/plugin installed" : "run npm install in repo root",
  }
}

function checkConfigDir(): CheckResult {
  const ok = fs.existsSync(CONFIG_DIR)
  return {
    name: "DevEco Code config",
    state: ok ? "ok" : "fail",
    detail: ok ? CONFIG_DIR : `${CONFIG_DIR} not found`,
  }
}

function readLinkTarget(p: string): string {
  let t = fs.readlinkSync(p)
  if (t.startsWith("\\\\?\\")) t = t.slice(4)
  if (t.startsWith("\\??\\")) t = t.slice(4)
  return path.resolve(t)
}

function checkJunctions(): CheckResult[] {
  const results: CheckResult[] = []
  for (const sub of LINKED_SUBDIRS) {
    const link = configDir(sub)
    const target = path.resolve(repoDir(sub))
    const name = `Link ${sub}/`
    try {
      const st = fs.lstatSync(link)
      if (st.isSymbolicLink()) {
        const t = readLinkTarget(link)
        results.push({
          name,
          state: t === target ? "ok" : "warn",
          detail: t === target ? "-> aeox-cli repo" : `-> ${t} (unexpected target)`,
        })
      } else if (st.isDirectory()) {
        results.push({ name, state: "warn", detail: "real directory, not linked (run: aeox install)" })
      } else {
        results.push({ name, state: "fail", detail: "exists but is a file" })
      }
    } catch {
      results.push({ name, state: "fail", detail: "missing (run: aeox install)" })
    }
  }
  return results
}

function checkPluginRegistration(): CheckResult {
  try {
    const text = fs.readFileSync(DEVECO_JSONC, "utf8")
    const hasRules = text.includes("ai-rules")
    const hasDiag = text.includes("build-diagnostics")
    const ok = hasRules && hasDiag
    const detail = `${hasRules ? "ai-rules" : ""}${hasRules && hasDiag ? " + " : ""}${hasDiag ? "build-diagnostics" : ""} registered`
    return {
      name: "Plugin registration",
      state: ok ? "ok" : "warn",
      detail: ok ? detail : `missing registration: ${!hasRules ? "ai-rules " : ""}${!hasDiag ? "build-diagnostics" : ""}`,
    }
  } catch {
    return { name: "Plugin registration", state: "fail", detail: "deveco.jsonc not found" }
  }
}

function checkSkills(): CheckResult {
  const repoSkills = repoDir("skills")
  if (!fs.existsSync(repoSkills)) {
    return { name: "Skills", state: "warn", detail: "repo skills/ missing" }
  }
  const names = fs.readdirSync(repoSkills).filter((f) => fs.statSync(path.join(repoSkills, f)).isDirectory())
  const linked = names.filter((n) => {
    try {
      const st = fs.lstatSync(path.join(DATA_SKILLS_DIR, n))
      return st.isSymbolicLink() && readLinkTarget(path.join(DATA_SKILLS_DIR, n)) === path.resolve(path.join(repoSkills, n))
    } catch {
      return false
    }
  })
  if (names.length === 0) {
    return { name: "Skills", state: "warn", detail: "no skills in repo" }
  }
  return {
    name: "Skills",
    state: linked.length === names.length ? "ok" : "warn",
    detail: linked.length === names.length ? `${linked.length} linked -> repo` : `${linked.length}/${names.length} linked (run: aeox install)`,
  }
}

function checkDevecoCommand(): CheckResult {
  const shim = path.join(NPM_GLOBAL_DIR, "deveco.cmd")
  const ok = fs.existsSync(shim)
  return {
    name: "deveco command",
    state: ok ? "ok" : "fail",
    detail: ok ? shim : "npm global deveco not found",
  }
}

function checkDevecocli(): CheckResult {
  if (!fs.existsSync(DEVECO_CLI_CMD)) {
    return { name: "devecocli", state: "fail", detail: `${DEVECO_CLI_CMD} not found` }
  }
  try {
    const js = fs.readFileSync(DEVECO_CLI_PATH_FILE, "utf8").trim()
    const ok = fs.existsSync(js)
    return { name: "devecocli", state: ok ? "ok" : "fail", detail: ok ? "cli.js resolvable" : "cli.js missing" }
  } catch {
    return { name: "devecocli", state: "warn", detail: "found but .deveco-cli-path unreadable" }
  }
}

function checkSdk(): CheckResult {
  const home = process.env.DEVECO_HOME ?? "C:\\Program Files\\Huawei\\DevEco Studio"
  const ok = fs.existsSync(path.join(home, "sdk", "default", "sdk-pkg.json"))
  return {
    name: "DevEco Studio SDK",
    state: ok ? "ok" : "fail",
    detail: ok ? `found (${home})` : `sdk-pkg.json not found under ${home}`,
  }
}

export function runDoctor(): number {
  const checks: CheckResult[] = [
    checkNode(),
    checkRepoAssets(),
    checkRepoDeps(),
    checkConfigDir(),
    ...checkJunctions(),
    checkSkills(),
    checkPluginRegistration(),
    checkDevecoCommand(),
    checkDevecocli(),
    checkSdk(),
  ]
  console.log(bold("aeox doctor") + dim("  - environment health check"))
  console.log()
  let fails = 0
  let warns = 0
  for (const c of checks) {
    const mark = c.state === "ok" ? green("[ OK ]") : c.state === "warn" ? yellow("[WARN]") : red("[FAIL]")
    console.log(`  ${mark} ${c.name.padEnd(24)} ${dim(c.detail)}`)
    if (c.state === "fail") fails++
    if (c.state === "warn") warns++
  }
  console.log()
  if (fails > 0) console.log(red(`${fails} failed, ${warns} warnings`))
  else if (warns > 0) console.log(yellow(`all checks passed with ${warns} warnings`))
  else console.log(green("all checks passed"))
  return fails > 0 ? 1 : 0
}
