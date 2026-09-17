const useColor = process.stdout.isTTY === true && process.env.NO_COLOR === undefined

function paint(code: string, s: string): string {
  return useColor ? `\x1b[${code}m${s}\x1b[0m` : s
}

export const green = (s: string): string => paint("32", s)
export const red = (s: string): string => paint("31", s)
export const yellow = (s: string): string => paint("33", s)
export const cyan = (s: string): string => paint("36", s)
export const dim = (s: string): string => paint("2", s)
export const bold = (s: string): string => paint("1", s)

export function banner(version: string): void {
  console.log(cyan("   ▄▀█ █▀█ █▀▄▀█ █▄▄ █▀▀ █▀█ ▄▀█"))
  console.log(cyan("   █▀█ █▀▄ █ ▀ █ █▄█ ██▄ █▀▄ █▀█"))
  console.log(`   ${bold("aeox-cli")} ${dim(`v${version}`)}  ${dim("dual-stack AI coding environment")}`)
  console.log()
}

export function help(): void {
  console.log("Usage: aeox <command>")
  console.log()
  console.log("Commands:")
  console.log("  install    Deploy aeox-cli into DevEco Code global config (idempotent)")
  console.log("  doctor     Run full environment health checks")
  console.log("  status     Show deployed tools, rules and plugin state")
  console.log("  version    Print version")
  console.log("  help       Show this help")
  console.log()
}
