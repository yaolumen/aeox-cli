import { tool } from "@opencode-ai/plugin"
import fs from "node:fs"
import path from "node:path"

// 提审体检：只读扫描 HarmonyOS 项目，输出上架前检查报告

interface Issue {
  level: "ERROR" | "WARN" | "INFO" | "OK"
  text: string
}

function readSafe(p: string): string {
  try {
    return fs.readFileSync(p, "utf8")
  } catch {
    return ""
  }
}

function exists(p: string): boolean {
  try {
    fs.accessSync(p)
    return true
  } catch {
    return false
  }
}

function field(src: string, name: string): string | null {
  const m = src.match(new RegExp("[\"']?" + name + "[\"']?\\s*:\\s*[\"']([^\"']+)[\"']"))
  return m ? m[1] : null
}

function fieldNum(src: string, name: string): string | null {
  const m = src.match(new RegExp("[\"']?" + name + "[\"']?\\s*:\\s*(\\d+)"))
  return m ? m[1] : null
}

function extractArrayItems(src: string, name: string): string[] {
  const m = src.match(new RegExp("[\"']?" + name + "[\"']?\\s*:\\s*\\[([^\\]]*)\\]", "s"))
  if (!m) return []
  const out: string[] = []
  for (const hit of m[1].matchAll(/[\"']([^\"']+)[\"']/g)) out.push(hit[1])
  return out
}

function findModuleJson5(root: string): string[] {
  const found: string[] = []
  let top: fs.Dirent[] = []
  try {
    top = fs.readdirSync(root, { withFileTypes: true })
  } catch {
    return found
  }
  for (const e of top) {
    if (!e.isDirectory() || e.name.startsWith(".") || e.name === "build") continue
    const cand = path.join(root, e.name, "src", "main", "module.json5")
    if (exists(cand)) found.push(cand)
  }
  return found
}

function walkEts(dir: string, out: string[], depth: number): void {
  if (depth > 8) return
  let entries: fs.Dirent[] = []
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  } catch {
    return
  }
  for (const e of entries) {
    if (["build", "oh_modules", "node_modules", ".hvigor", ".git", ".cxx", ".preview"].includes(e.name)) continue
    const full = path.join(dir, e.name)
    if (e.isDirectory()) walkEts(full, out, depth + 1)
    else if (e.isFile() && /\.ets$/.test(e.name)) out.push(full)
  }
}

function findOutputArtifacts(root: string): { file: string; mtimeMs: number; size: number }[] {
  const buildDir = path.join(root, "build")
  const results: { file: string; mtimeMs: number; size: number }[] = []
  const queue: { dir: string; depth: number }[] = [{ dir: buildDir, depth: 0 }]
  while (queue.length > 0) {
    const item = queue.shift()
    if (!item || item.depth > 6) continue
    let entries: fs.Dirent[] = []
    try {
      entries = fs.readdirSync(item.dir, { withFileTypes: true })
    } catch {
      continue
    }
    for (const e of entries) {
      const full = path.join(item.dir, e.name)
      if (e.isDirectory()) {
        queue.push({ dir: full, depth: item.depth + 1 })
      } else if (e.isFile() && /\.(hap|app)$/.test(e.name)) {
        try {
          const st = fs.statSync(full)
          results.push({ file: full, mtimeMs: st.mtimeMs, size: st.size })
        } catch {
          // ignore
        }
      }
    }
  }
  results.sort((a, b) => b.mtimeMs - a.mtimeMs)
  return results
}

const SENSITIVE_PERMISSIONS = new Set([
  "ohos.permission.READ_CALENDAR",
  "ohos.permission.WRITE_CALENDAR",
  "ohos.permission.READ_CONTACTS",
  "ohos.permission.WRITE_CONTACTS",
  "ohos.permission.APPROXIMATELY_LOCATION",
  "ohos.permission.LOCATION",
  "ohos.permission.LOCATION_IN_BACKGROUND",
  "ohos.permission.MICROPHONE",
  "ohos.permission.CAMERA",
  "ohos.permission.READ_MEDIA",
  "ohos.permission.WRITE_MEDIA",
  "ohos.permission.READ_PASTEBOARD",
  "ohos.permission.KEEP_BACKGROUND_RUNNING",
])

function checkMediaResource(baseDir: string, ref: string | null): string | null {
  if (!ref) return null
  const name = ref.includes(":") ? ref.split(":").pop() ?? ref : ref
  for (const ext of [".png", ".svg", ".jpg", ".webp", ".json"]) {
    const p = path.join(baseDir, "resources", "base", "media", name + ext)
    if (exists(p)) return p
  }
  return null
}

export const check = tool({
  description:
    "Pre-submission audit for a HarmonyOS app project (read-only). " +
    "Checks app.json5/module.json5 completeness (version, icon, label), declared permissions (flags sensitive ones), " +
    "user agreement / privacy pages in rawfile, release artifacts (.hap/.app), signing config in build-profile.json5, " +
    "and hardcoded CJK strings in .ets code. " +
    "Run this before submitting an app to AppGallery, or when onboarding to a project to assess its readiness.",
  args: {
    maxSamples: tool.schema
      .number()
      .optional()
      .describe("Max hardcoded-string samples to list (default 10)"),
  },
  async execute(args, context) {
    const root = context.directory
    const issues: Issue[] = []
    const lines: string[] = []
    lines.push("# 提审体检报告 — " + path.basename(root))

    // 1. AppScope/app.json5
    const appJsonPath = path.join(root, "AppScope", "app.json5")
    const appJson = readSafe(appJsonPath)
    lines.push("")
    lines.push("## 1. 应用信息 (AppScope/app.json5)")
    if (!appJson) {
      issues.push({ level: "ERROR", text: "AppScope/app.json5 不存在" })
      lines.push("- ❌ AppScope/app.json5 不存在")
    } else {
      const versionCode = fieldNum(appJson, "versionCode")
      const versionName = field(appJson, "versionName")
      const icon = field(appJson, "icon")
      const label = field(appJson, "label")
      lines.push(`- versionCode: ${versionCode ?? "缺失"} ${versionCode ? "✅" : "❌"}`)
      lines.push(`- versionName: ${versionName ?? "缺失"} ${versionName ? "✅" : "❌"}`)
      if (!versionCode) issues.push({ level: "ERROR", text: "app.json5 缺少 versionCode" })
      if (!versionName) issues.push({ level: "ERROR", text: "app.json5 缺少 versionName" })
      if (icon) {
        const iconFile = checkMediaResource(path.join(root, "AppScope"), icon)
        lines.push(`- icon: ${icon} ${iconFile ? "✅ 文件存在" : "❌ 资源文件缺失"}`)
        if (!iconFile) issues.push({ level: "ERROR", text: `应用图标资源缺失: ${icon}` })
      } else {
        lines.push("- icon: 缺失 ❌")
        issues.push({ level: "ERROR", text: "app.json5 缺少 icon" })
      }
      if (!label) {
        lines.push("- label: 缺失 ❌")
        issues.push({ level: "ERROR", text: "app.json5 缺少 label" })
      } else {
        lines.push(`- label: ${label} ✅`)
      }
    }

    // 2. module.json5
    const moduleJson5Paths = findModuleJson5(root)
    lines.push("")
    lines.push("## 2. 模块配置 (module.json5)")
    if (moduleJson5Paths.length === 0) {
      lines.push("- ❌ 未找到 <module>/src/main/module.json5")
      issues.push({ level: "ERROR", text: "未找到 module.json5" })
    }
    const allPermissions: string[] = []
    for (const mjp of moduleJson5Paths) {
      const mj = readSafe(mjp)
      const modDir = path.dirname(mjp) // <module>/src/main
      const moduleName = field(mj, "name") ?? path.basename(path.dirname(path.dirname(path.dirname(mjp))))
      lines.push(`### 模块 ${moduleName}`)
      const icon = field(mj, "icon")
      if (icon) {
        const iconFile = checkMediaResource(modDir, icon)
        lines.push(`- module icon: ${icon} ${iconFile ? "✅" : "❌ 资源缺失"}`)
        if (!iconFile) issues.push({ level: "ERROR", text: `${moduleName} 图标资源缺失: ${icon}` })
      }
      const abilities = extractArrayItems(mj, "abilities")
      const extAbilities = extractArrayItems(mj, "extensionAbilities")
      lines.push(`- abilities: ${abilities.length} 个; extensionAbilities: ${extAbilities.length} 个`)
      if (abilities.length === 0 && extAbilities.length === 0) {
        issues.push({ level: "ERROR", text: `${moduleName} 无 abilities/extensionAbilities` })
        lines.push("- ❌ 无 abilities / extensionAbilities")
      }
      const perms = extractArrayItems(mj, "requestPermissions")
      allPermissions.push(...perms)
      const sensitive = perms.filter((p) => SENSITIVE_PERMISSIONS.has(p))
      lines.push(`- requestPermissions: ${perms.length} 个${perms.length > 0 ? " (" + perms.join(", ") + ")" : ""}`)
      if (perms.length === 0) lines.push("- ℹ️ 未声明任何权限（纯本地应用可接受）")
      for (const sp of sensitive) {
        issues.push({
          level: "WARN",
          text: `敏感权限 ${sp}：需确认 AppGallery Connect 隐私声明中已说明用途，且代码确实使用`,
        })
        lines.push(`- ⚠️ 敏感权限: ${sp}（需隐私声明说明用途）`)
      }

      // 3. 协议页
      const rawfileDir = path.join(modDir, "resources", "rawfile")
      let htmlFiles: string[] = []
      try {
        htmlFiles = fs.readdirSync(rawfileDir).filter((f) => /\.html$/i.test(f))
      } catch {
        htmlFiles = []
      }
      lines.push(`- rawfile HTML: ${htmlFiles.length > 0 ? htmlFiles.join(", ") : "无"}`)
      const hasAgreement = htmlFiles.some((f) => /privacy|agreement|privacy|协议|隐私|用户/i.test(f))
      if (!hasAgreement) {
        issues.push({ level: "WARN", text: "rawfile 中未发现用户协议/隐私政策页面（如应用内已通过链接提供可忽略）" })
        lines.push("- ⚠️ 未发现用户协议/隐私政策 HTML")
      } else {
        lines.push("- ✅ 已包含协议/隐私页面")
      }
    }

    // 4. Release 产物
    lines.push("")
    lines.push("## 3. 构建产物 (.hap/.app)")
    const artifacts = findOutputArtifacts(root)
    if (artifacts.length === 0) {
      issues.push({ level: "WARN", text: "build 目录下未找到 .hap/.app 产物，提审前需先出 Release 包" })
      lines.push("- ⚠️ 未找到 .hap/.app（提审前需构建 Release 包）")
    } else {
      const cap = Math.min(artifacts.length, 10)
      for (let i = 0; i < cap; i++) {
        const a = artifacts[i]
        const ageDays = Math.round((Date.now() - a.mtimeMs) / 86400000)
        lines.push(`- ${a.file} (${(a.size / 1048576).toFixed(1)} MB, ${ageDays} 天前)`)
      }
      if (artifacts.length > cap) lines.push(`- ...共 ${artifacts.length} 个`)
      const newest = artifacts[0]
      if (Date.now() - newest.mtimeMs > 30 * 86400000) {
        issues.push({ level: "WARN", text: "最新构建产物超过 30 天，提审前建议重新构建" })
      }
    }

    // 5. 签名配置
    lines.push("")
    lines.push("## 4. 签名配置 (build-profile.json5)")
    const bp = readSafe(path.join(root, "build-profile.json5"))
    if (!bp) {
      lines.push("- ❌ build-profile.json5 不存在")
      issues.push({ level: "ERROR", text: "build-profile.json5 不存在" })
    } else {
      const signingNames = extractArrayItems(bp, "signingConfigs").length
      const hasSigning = /signingConfigs/.test(bp)
      if (hasSigning) {
        lines.push("- ✅ 已配置 signingConfigs")
      } else {
        issues.push({ level: "WARN", text: "build-profile.json5 无 signingConfigs，提审需要 Release 签名" })
        lines.push("- ⚠️ 无 signingConfigs（提审需 Release 签名）")
      }
    }

    // 6. 硬编码中文字符串（建议级）
    lines.push("")
    lines.push("## 5. 硬编码中文字符串（i18n 建议）")
    const etsFiles: string[] = []
    walkEts(root, etsFiles, 0)
    const cjkRe = /["'`][^"'`\n]*[\u4e00-\u9fff][^"'`\n]*["'`]/
    const hits: { file: string; line: number; text: string }[] = []
    for (const f of etsFiles) {
      const src = readSafe(f)
      const fileLines = src.split(/\r?\n/)
      for (let i = 0; i < fileLines.length; i++) {
        const t = fileLines[i]
        const trimmed = t.trim()
        if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) continue
        if (/\$r\(|\$rawfile\(|import\s|console\.|hilog/.test(t)) continue
        if (cjkRe.test(t)) {
          hits.push({ file: path.relative(root, f), line: i + 1, text: trimmed.slice(0, 120) })
          if (hits.length > 500) break
        }
      }
      if (hits.length > 500) break
    }
    const maxSamples = args.maxSamples ?? 10
    lines.push(`- 共 ${hits.length} 处（扫描 ${etsFiles.length} 个 .ets 文件）`)
    if (hits.length > 0) {
      issues.push({ level: "INFO", text: `${hits.length} 处硬编码中文字符串，当前仅中文市场可接受，未来 i18n 需迁移到资源文件` })
      for (let i = 0; i < Math.min(hits.length, maxSamples); i++) {
        lines.push(`  - ${hits[i].file}:${hits[i].line} ${hits[i].text}`)
      }
    }

    // 汇总
    const errors = issues.filter((i) => i.level === "ERROR").length
    const warns = issues.filter((i) => i.level === "WARN").length
    const infos = issues.filter((i) => i.level === "INFO").length
    const summary = [`\n## 总结: ${errors} 个错误 / ${warns} 个需注意 / ${infos} 个建议`]
    if (issues.length > 0) {
      summary.push("")
      for (const i of issues) {
        const mark = i.level === "ERROR" ? "❌" : i.level === "WARN" ? "⚠️" : "ℹ️"
        summary.push(`- ${mark} [${i.level}] ${i.text}`)
      }
    } else {
      summary.push("\n全部通过，可提审 ✅")
    }

    return [lines.join("\n"), ...summary].join("\n")
  },
})
