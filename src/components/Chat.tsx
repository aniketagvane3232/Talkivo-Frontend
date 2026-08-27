import { useState, useEffect, useRef } from "react";
import {
  HubConnection,
  HubConnectionBuilder,
  LogLevel,
} from "@microsoft/signalr";

interface Message {
  user?: string;
  msg: string;
  system?: boolean;
}

const chatHubUrl = (import.meta as any).env.VITE_CHATHUB_URL;

export default function Chat() {
  const [connection, setConnection] = useState<HubConnection | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [user, setUser] = useState<string>("");
  const [usernameSet, setUsernameSet] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const newConnection = new HubConnectionBuilder()
      .withUrl(chatHubUrl)
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Information)
      .build();

    setConnection(newConnection);
  }, []);

  useEffect(() => {
    if (connection) {
      connection
        .start()
        .then(() => {
          console.log("Connected to SignalR hub");

          connection.on("ReceiveMessage", (user: string, msg: string) => {
            setMessages((prev) => [...prev, { user, msg }]);
          });

          connection.on("SystemMessage", (msg: string) => {
            setMessages((prev) => [...prev, { msg, system: true }]);
          });
        })
        .catch((err) => console.error("Connection failed: ", err));

      return () => {
        connection.stop();
      };
    }
  }, [connection]);

  const setName = async () => {
    if (user.trim() && connection) {
      await connection.invoke("SetUserName", user.trim());
      setUsernameSet(true);
    }
  };

  const sendMessage = async () => {
    if (message.trim() && connection && usernameSet) {
      try {
        await connection.invoke("SendMessage", user, message);
        setMessage("");
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-gray-900 text-white">
      <div className="bg-gray-800 p-4 text-lg font-semibold shadow">
        SignalR Chat
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.system
                ? "text-center text-gray-400 text-sm italic"
                : `max-w-xs p-2 rounded-lg ${
                    m.user === user
                      ? "ml-auto bg-blue-500 text-white"
                      : "mr-auto bg-gray-700 text-white"
                  }`
            }
          >
            {!m.system && <span className="block text-sm text-gray-300">{m.user}</span>}
            <span className="block">{m.msg}</span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-gray-800 flex gap-2">
        {!usernameSet ? (
          <>
            <input
              type="text"
              placeholder="Enter your name"
              value={user}
              onChange={(e) => setUser(e.target.value)}
              className="flex-1 px-3 py-2 rounded bg-gray-700 text-white focus:outline-none"
            />
            <button
              onClick={setName}
              className="px-4 py-2 bg-green-500 rounded text-white hover:bg-green-600"
            >
              Join
            </button>
          </>
        ) : (
          <>
            <input
              type="text"
              placeholder="Type a message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              className="flex-1 px-3 py-2 rounded bg-gray-700 text-white focus:outline-none"
            />
            <button
              onClick={sendMessage}
              className="px-4 py-2 bg-blue-500 rounded text-white hover:bg-blue-600"
            >
              Send
            </button>
          </>
        )}
      </div>
    </div>
  );
}