"use client"

import { useState } from "react";
import { useSocket } from "../context/SocketProvider";

export default function Page() {
  const { sendMessage, messages } = useSocket();
  const [message, setMessage] = useState('');

  return (
    <div>
      <div>
        <h1>All messages will appear here</h1>
      </div>
      <div>
        <input onChange={e => setMessage(e.target.value)} className="w-24 h-12 p-2.5 border-[1px] border-solid" placeholder="Message..." />
        <button onClick={e => sendMessage(message)} className="h-12 w-12 p-2.5">Send</button>
      </div>
      <div>
        {messages.map((e) => (
          <li>{e}</li>
        ))}
      </div>
    </div>
  );
}