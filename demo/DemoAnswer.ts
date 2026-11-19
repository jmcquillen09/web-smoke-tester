// What a demo server answers one address with.
export interface DemoAnswer {
  readonly status: number
  readonly contentType: string
  readonly body: string
}
