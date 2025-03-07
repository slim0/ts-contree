import http, { Server } from 'node:http'
import { createWebSocketServer } from 'backend/src/server'

export function startServer(port: number): Promise<Server> {
  const server = http.createServer()
  createWebSocketServer(server)

  return new Promise<Server>((resolve) => {
    server.listen(port, () => resolve(server))
  })
}

export class TestWebSocket extends WebSocket {
  waitUntil(
    state: 'open' | 'close',
    timeout: number = 1000,
  ): Promise<void> | void {
    if (this.readyState === this.OPEN && state === 'open') return
    if (this.readyState === this.CLOSED && state === 'close') return

    return new Promise((resolve, reject) => {
      let timerId: NodeJS.Timeout
      const handleStateEvent = () => {
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
}
