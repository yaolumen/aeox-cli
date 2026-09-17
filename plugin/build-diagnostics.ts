// build-diagnostics plugin: post-process build tool output.
// Extracts structured ArkTS compiler errors, filters known-benign SDK errors
// (e.g. @arkts.lang.d.ets declaration-file errors inside the SDK directory),
// and prepends a concise diagnostics summary so the model sees the real
// errors first instead of digging through raw hvigor output.
//
// Applies to: native `build_project` tool and custom `devecocli_build` tool.

export interface BuildError {
  code: string
  message: string
  file: string
  line: string
  col: string
  benign: boolean
}

const ANSI_RE = /\x1b\[[0-9;]*m/g

function isBenignPath(file: string, message: string): boolean {
  const hay = file + " " + message
  if (/@arkts\.lang\.d\.ets/i.test(hay)) return true
  if (/Huawei[\/\\]DevEco Studio[\/\\](sdk|tools)/i.test(file)) return true
  return false
}

export function extractErrors(raw: string): BuildError[] {
  const text = raw.replace(ANSI_RE, "")
  const lines = text.split(/\r?\n/)
  const errors: BuildError[] = []
  for (let i = 0; i < lines.length; i++) {
    const hm = lines[i].match(/^\s*(\d+)\s+ERROR:\s+(\d+)\s+(.*)$/)
    if (!hm) continue
    const code = hm[2]
    let message = ""
    let file = ""
    let line = ""
    let col = ""
    for (let j = i + 1; j < Math.min(i + 6, lines.length); j++) {
      const em = lines[j].match(/Error Message:\s*(.*)$/)
      if (!em) continue
      let msgLine = em[1].trim()
      // The "At File:" tail may wrap onto the next line
      if (/At File:/.test(msgLine) && !/:\d+:\d+\s*$/.test(msgLine) && lines[j + 1]) {
        msgLine += lines[j + 1].trim()
      }
      const atIdx = msgLine.indexOf("At File:")
      if (atIdx >= 0) {
        message = msgLine.slice(0, atIdx).trim()
        const filePart = msgLine.slice(atIdx + "At File:".length).trim()
        const fm = filePart.match(/(.+):(\d+):(\d+)\s*$/)
        if (fm) {
          file = fm[1]
          line = fm[2]
          col = fm[3]
        } else {
          file = filePart
        }
      } else {
        message = msgLine
        for (let k = j + 1; k < Math.min(j + 3, lines.length); k++) {
          if (/At File:/.test(lines[k])) {
            const fm2 = lines[k].match(/At File:\s*(.+?):?(\d*):?(\d*)\s*$/)
            if (fm2) {
              file = fm2[1]
              line = fm2[2]
              col = fm2[3]
            }
            break
          }
        }
      }
      break
    }
    errors.push({ code, message, file, line, col, benign: isBenignPath(file, message) })
  }
  return errors
}

function summarize(raw: string): string | null {
  const clean = raw.replace(ANSI_RE, "")
  const failed = /BUILD FAILED|COMPILE RESULT:FAIL/i.test(clean)
  const success = /BUILD SUCCESSFUL|COMPILE RESULT:SUCCESS/i.test(clean)
  const errors = extractErrors(raw)
  const real = errors.filter((e) => !e.benign)
  const benign = errors.filter((e) => e.benign)

  if (failed && real.length > 0) {
    const out: string[] = []
    out.push(`[aeox 构建诊断] FAIL — 真实错误 ${real.length} 处${benign.length > 0 ? `（已过滤 SDK benign 错误 ${benign.length} 条）` : ""}`)
    real.forEach((e, idx) => {
      const loc = e.file ? `${e.file}:${e.line}:${e.col}` : "位置未知"
      out.push(`${idx + 1}. [${e.code}] ${e.message || "(见原始输出)"}`)
      out.push(`   -> ${loc}`)
    })
    out.push("优先修复以上真实错误，然后重新构建。原始输出附后。")
    return out.join("\n")
  }
  if (failed && real.length === 0) {
    return `[aeox 构建诊断] FAIL — 未能解析出结构化错误（可能是配置/资源/环境问题），请查看原始输出${benign.length > 0 ? `（已识别 ${benign.length} 条 SDK benign 错误，可忽略）` : ""}。`
  }
  if (success && benign.length > 0) {
    return `[aeox 构建诊断] SUCCESS — 构建成功；输出中的 ${benign.length} 条 SDK benign 错误（@arkts.lang.d.ets / SDK 目录内）不影响编译，可忽略。`
  }
  return null
}

interface ToolAfterInput {
  tool?: string
  sessionID?: string
  callID?: string
}

interface ToolAfterOutput {
  title?: string
  output?: string
}

export default async () => {
  return {
    "tool.execute.after": async (tInput: ToolAfterInput, tOutput: ToolAfterOutput) => {
      const tool = tInput.tool ?? ""
      if (tool !== "build_project" && tool !== "devecocli_build") return
      const raw = tOutput.output
      if (typeof raw !== "string" || raw.length === 0) return
      const summary = summarize(raw)
      if (!summary) return
      tOutput.output = summary + "\n\n===== 原始构建输出 =====\n" + raw
    },
  }
}
