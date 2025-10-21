declare module 'reactive-vscode' {
  export function defineConfigObject<T = any>(scope: string, defaults: any): T
  export function useLogger(name: string): {
    info: (...args: any[]) => void
    warn: (...args: any[]) => void
    error: (...args: any[]) => void
  }
}
