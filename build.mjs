// Build: strip types from bin/ + lib/ into dist/ (pure JS, no new dependencies).
// Reason: Node refuses native TS type stripping for files under node_modules
// (ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING), so the published package
// must ship a JS bin entry.
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { stripTypeScriptTypes } from "node:module"

const root = path.dirname(fileURLToPath(import.meta.url))
const out = path.join(root, "dist")
const dirs = ["bin", "lib"]

fs.rmSync(out, { recursive: true, force: true })
let count = 0
for (const dir of dirs) {
  fs.mkdirSync(path.join(out, dir), { recursive: true })
  for (const f of fs.readdirSync(path.join(root, dir))) {
    if (!f.endsWith(".ts")) continue
    let code = fs.readFileSync(path.join(root, dir, f), "utf8")
    let shebang = ""
    if (code.startsWith("#!")) {
      const i = code.indexOf("\n")
      shebang = i < 0 ? code : code.slice(0, i + 1)
      code = i < 0 ? "" : code.slice(i + 1)
    }
    let js = stripTypeScriptTypes(code, { mode: "strip" })
    js = js.replace(/((?:\bfrom|\bimport)\s*"[^"]*)\.ts"/g, '$1.js"')
    fs.writeFileSync(path.join(out, dir, f.replace(/\.ts$/, ".js")), shebang + js)
    count++
  }
}
console.log(`[ OK ] built dist/ (${count} files, type-stripped to JS)`)
