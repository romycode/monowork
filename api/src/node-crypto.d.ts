export {}

declare module 'node:crypto' {
  export function randomUUIDv7(): string
}
