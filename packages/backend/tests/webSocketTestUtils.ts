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

  constructor(...args: ConstructorParameters<typeof WebSocket>) {
    super(...args)

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

  waitForMessage(
    message: string,
    debug?: boolean,
    includeExistingMessages: boolean = true,
    timeout: number = 1000,
  ): void | Promise<void> {
    if (includeExistingMessages && this.#messages.includes(message)) return
    const originalMessageIndex = this.#messages.lastIndexOf(message)

    return new Promise((resolve, reject) => {
      let timerId: NodeJS.Timeout | undefined
      const checkForMessage = (event: MessageEvent): void => {
        debug && console.log('Received message:', event.data.toString('utf8'))
        if (event.data.toString('utf8') !== message) return

        resolve()
        clearTimeout(timerId)
        this.removeEventListener('message', checkForMessage)
      }

      this.addEventListener('message', checkForMessage)

      timerId = setTimeout(() => {
        this.removeEventListener('message', checkForMessage)

        const success = includeExistingMessages
          ? this.#messages.includes(message)
          : this.#messages.lastIndexOf(message) > originalMessageIndex

        if (success) return resolve()
        reject(
          new Error(
            `WebSocket did not receive the message "${message}" in time.`,
          ),
        )
      }, timeout)
    })
  }
}
