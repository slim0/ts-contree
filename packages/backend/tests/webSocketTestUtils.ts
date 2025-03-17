import { Schema } from '@effect/schema'
import { createWebSocketServer } from 'backend/src/server'
import http, { Server } from 'node:http'

export function startServer(port: number): Promise<Server> {
  const server = http.createServer()
  createWebSocketServer(server)

  return new Promise<Server>((resolve) => {
    server.listen(port, () => resolve(server))
  })
}

export class TestWebSocket extends WebSocket {
  #messages: string[] = []
  #playerName: string

  constructor(
    playerName: string,
    ...args: ConstructorParameters<typeof WebSocket>
  ) {
    super(...args)
    this.#playerName = playerName

    const addNewMessage = (event: MessageEvent) =>
      this.#messages.push(event.data.toString('utf8'))

    this.addEventListener('message', addNewMessage)
    this.addEventListener(
      'close',
      () => this.removeEventListener('message', addNewMessage),
      { once: true },
    )
  }

  get messages(): string[] {
    return this.#messages.slice()
  }

  clearMessages(): void {
    this.#messages.splice(0, this.#messages.length)
  }

  waitUntil(
    state: 'open' | 'close',
    timeout: number = 1000,
  ): Promise<void> | void {
    if (this.readyState === this.OPEN && state === 'open') return
    if (this.readyState === this.CLOSED && state === 'close') return

    return new Promise((resolve, reject) => {
      let timerId: NodeJS.Timeout | undefined
      const handleStateEvent = (): void => {
        resolve()
        clearTimeout(timerId)
      }

      this.addEventListener(state, handleStateEvent, { once: true })

      timerId = setTimeout(() => {
        this.removeEventListener(state, handleStateEvent)
        if (this.readyState === this.OPEN && state === 'open') return resolve()
        if (this.readyState === this.CLOSED && state === 'close')
          return resolve()

        reject(new Error(`WebSocket did not ${state} in time.`))
      }, timeout)
    })
  }

  #getLastMessageIndexThatMatchesSchema(schema: Schema.Schema<any>): number {
    for (let i = this.#messages.length - 1; i >= 0; i--) {
      if (Schema.is(schema)(JSON.parse(this.#messages[i]))) return i
    }

    return -1
  }

  #messageMatchesSchemaAlreadyArrived<A, I>(
    messageSchema: Schema.Schema<A, I, never>,
  ): string | undefined {
    return this.#messages.find((message: string) =>
      Schema.is(messageSchema)(JSON.parse(message)),
    )
  }

  waitForMessageSchema<A, I>(
    messageSchema: Schema.Schema<A, I, never>,
    includeExistingMessages: boolean = true,
    debug?: boolean,
    timeout: number = 1000,
  ): A | Promise<A> {
    const alreadyMatchingMessage =
      this.#messageMatchesSchemaAlreadyArrived(messageSchema)
    if (includeExistingMessages && alreadyMatchingMessage !== undefined) {
      return Schema.decodeUnknownSync(messageSchema)(
        JSON.parse(alreadyMatchingMessage),
      )
    }

    const originalMessageIndex =
      this.#getLastMessageIndexThatMatchesSchema(messageSchema)
    return new Promise((resolve, reject) => {
      let timerId: NodeJS.Timeout | undefined
      function checkForMessage(event: MessageEvent): void {
        const dataString = event.data.toString('utf8')
        debug && console.log('Received message:', dataString)
        const message = JSON.parse(dataString)
        const isMessageValidUpponSchema = Schema.is(messageSchema)(message)
        if (isMessageValidUpponSchema === false) {
          return
        }

        resolve(Schema.decodeUnknownSync(messageSchema)(message))
        clearTimeout(timerId)
        this.removeEventListener('message', checkForMessage)
      }

      this.addEventListener('message', checkForMessage)

      timerId = setTimeout(() => {
        this.removeEventListener('message', checkForMessage)
        const alreadyMathingMessage =
          this.#messageMatchesSchemaAlreadyArrived(messageSchema)
        const success = includeExistingMessages
          ? alreadyMathingMessage !== undefined
          : this.#getLastMessageIndexThatMatchesSchema(messageSchema) >
            originalMessageIndex

        if (success)
          return resolve(
            Schema.decodeUnknownSync(messageSchema)(
              JSON.parse(alreadyMatchingMessage!),
            ),
          )
        reject(
          new Error(
            `WebSocket did not receive message in time from "${this.#playerName}" matching schema "${messageSchema}"`,
          ),
        )
      }, timeout)
    })
  }
}
