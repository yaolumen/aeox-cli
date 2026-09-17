#!/usr/bin/env node
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { runDoctor } from "../lib/doctor.ts"
import { runInstall } from "../lib/install.ts"
import { runStatus } from "../lib/status.ts"
import { banner, help, yellow } from "../lib/ui.ts"

const pkgPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "package.json")
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8")) as { version?: string }
const version = pkg.version ?? "0.0.0"

const cmd = process.argv[2] ?? "help"
switch (cmd) {
  case "doctor":
    process.exitCode = runDoctor()
    break
  case "install":
    runInstall()
    break
  case "status":
    runStatus()
    break
  case "version":
  case "--version":
  case "-v":
    console.log(version)
    break
  case "help":
  case "--help":
  case "-h":
    banner(version)
    help()
    break
  default:
    console.log(yellow(`unknown command: ${cmd}`))
    console.log()
    banner(version)
    help()
    process.exitCode = 1
}
