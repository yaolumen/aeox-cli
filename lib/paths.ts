import fs from "node:fs"
import path from "node:path"
import os from "node:os"
import { fileURLToPath } from "node:url"

const here = path.dirname(fileURLToPath(import.meta.url))

// Walk up to the nearest package.json so this works both from source
// (<root>/lib) and from the published build (<root>/dist/lib).
function findRepoRoot(start: string): string {
  let dir = path.resolve(start)
  while (true) {
    if (fs.existsSync(path.join(dir, "package.json"))) return dir
    const parent = path.dirname(dir)
    if (parent === dir) return path.resolve(start, "..")
    dir = parent
  }
}

export const REPO_ROOT = findRepoRoot(here)
export const CONFIG_DIR = path.join(os.homedir(), ".config", "deveco")
export const LINKED_SUBDIRS: string[] = ["tools", "rules", "plugin", "command"]
export const DATA_SKILLS_DIR = path.join(os.homedir(), ".local", "share", "deveco", "skills")
export const DEVECO_JSONC = path.join(CONFIG_DIR, "deveco.jsonc")
export const NPM_GLOBAL_DIR = path.join(os.homedir(), "AppData", "Roaming", "npm")
export const DEVECO_CLI_CMD = path.join(os.homedir(), ".cache", "deveco", "bin", "devecocli.cmd")
export const DEVECO_CLI_PATH_FILE = path.join(os.homedir(), ".cache", "deveco", "bin", ".deveco-cli-path")

export function repoDir(name: string): string {
  return path.join(REPO_ROOT, name)
}

export function configDir(name: string): string {
  return path.join(CONFIG_DIR, name)
}
