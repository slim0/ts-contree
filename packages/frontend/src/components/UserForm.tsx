import { useEffect, useState } from 'react'
import useWebSocket, { ReadyState } from 'react-use-websocket'

export default function UserForm() {
    const WS_URL = 'ws://localhost:8080'
    const { sendJsonMessage, lastJsonMessage, readyState } = useWebSocket(
        WS_URL,
        {
            share: false,
            shouldReconnect: () => true,
        }
    )
    const [message, setMessage] = useState('')

    // Run when the connection state (readyState) changes
    useEffect(() => {
        console.log('Connection state changed')
        if (readyState === ReadyState.OPEN) {
            sendJsonMessage({
                event: 'join',
                data: {
                    channel: 'general-chatroom',
                },
            })
        }
    }, [readyState])

    // Run when a new WebSocket message is received (lastJsonMessage)
    useEffect(() => {
        console.log(`Got a new message: ${JSON.stringify(lastJsonMessage)}`)
    }, [lastJsonMessage])

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault()
        sendJsonMessage({
            event: 'message',
            data: {
                message: message,
            },
        })
    }

    return (
        <div>
            <form onSubmit={handleSubmit}>
                <input
                    placeholder="Message"
                    type="text"
                    required
                    onChange={(e) => setMessage(e.target.value)}
                    value={message}
                ></input>
                <button type="submit">Click to submit</button>
            </form>
            <>{JSON.stringify(lastJsonMessage)}</>
        </div>
    )
}
