import { useState, useEffect, useRef } from "react";
import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
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
  const [isConnected, setIsConnected] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // ========================================
  // Scroll to latest message
  // ========================================

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);


  // ========================================
  // Create SignalR connection
  // ========================================

  useEffect(() => {
    if (!chatHubUrl) {
      console.error(
        "VITE_CHATHUB_URL is not defined. Check your environment variables."
      );
      return;
    }

    const newConnection = new HubConnectionBuilder()
      .withUrl(chatHubUrl)
      .withAutomaticReconnect([0, 2000, 5000, 10000])
      .configureLogging(LogLevel.Information)
      .build();

    setConnection(newConnection);

    return () => {
      newConnection.stop().catch((err) => {
        console.error("Error stopping SignalR connection:", err);
      });
    };
  }, []);


  // ========================================
  // Start SignalR connection
  // ========================================

  useEffect(() => {
    if (!connection) return;

    let isMounted = true;

    const startConnection = async () => {
      try {
        if (
          connection.state === HubConnectionState.Disconnected
        ) {
          console.log("Starting SignalR connection...");

          await connection.start();

          if (isMounted) {
            setIsConnected(true);
          }

          console.log("Connected to SignalR hub");
        }
      } catch (err) {
        console.error("SignalR connection failed:", err);

        if (isMounted) {
          setIsConnected(false);
        }
      }
    };

    // ========================================
    // Receive normal messages
    // ========================================

    const handleReceiveMessage = (
      user: string,
      msg: string
    ) => {
      setMessages((prev) => [
        ...prev,
        {
          user,
          msg,
        },
      ]);
    };

    // ========================================
    // Receive system messages
    // ========================================

    const handleSystemMessage = (msg: string) => {
      setMessages((prev) => [
        ...prev,
        {
          msg,
          system: true,
        },
      ]);
    };

    connection.on(
      "ReceiveMessage",
      handleReceiveMessage
    );

    connection.on(
      "SystemMessage",
      handleSystemMessage
    );


    // ========================================
    // Connection lifecycle events
    // ========================================

    const handleReconnecting = (error?: Error) => {
      console.warn(
        "SignalR connection lost. Attempting to reconnect...",
        error
      );

      if (isMounted) {
        setIsConnected(false);
      }
    };

    const handleReconnected = (connectionId?: string) => {
      console.log(
        "SignalR reconnected.",
        connectionId
      );

      if (isMounted) {
        setIsConnected(true);
      }
    };

    const handleClosed = (error?: Error) => {
      console.warn(
        "SignalR connection closed.",
        error
      );

      if (isMounted) {
        setIsConnected(false);
      }
    };

    connection.onreconnecting(handleReconnecting);
    connection.onreconnected(handleReconnected);
    connection.onclose(handleClosed);


    // Start connection
    startConnection();


    // ========================================
    // Cleanup
    // ========================================

    return () => {
      isMounted = false;

      connection.off(
        "ReceiveMessage",
        handleReceiveMessage
      );

      connection.off(
        "SystemMessage",
        handleSystemMessage
      );

      connection.off(
        "reconnecting",
        handleReconnecting
      );

      connection.off(
        "reconnected",
        handleReconnected
      );

      connection.off(
        "close",
        handleClosed
      );
    };
  }, [connection]);


  // ========================================
  // Set username
  // ========================================

  const setName = async () => {
    const trimmedUser = user.trim();

    if (!trimmedUser) {
      return;
    }

    if (!connection) {
      console.error("SignalR connection does not exist.");
      return;
    }

    if (
      connection.state !==
      HubConnectionState.Connected
    ) {
      console.warn(
        "Cannot set username. SignalR is not connected.",
        connection.state
      );

      return;
    }

    try {
      await connection.invoke(
        "SetUserName",
        trimmedUser
      );

      setUser(trimmedUser);
      setUsernameSet(true);

      console.log(
        `Username set to: ${trimmedUser}`
      );
    } catch (err) {
      console.error(
        "Failed to set username:",
        err
      );
    }
  };


  // ========================================
  // Send message
  // ========================================

  const sendMessage = async () => {
    const trimmedMessage = message.trim();

    if (!trimmedMessage) {
      return;
    }

    if (!connection) {
      console.error(
        "SignalR connection does not exist."
      );

      return;
    }

    if (!usernameSet) {
      console.warn(
        "Please set your username before sending messages."
      );

      return;
    }

    if (
      connection.state !==
      HubConnectionState.Connected
    ) {
      console.warn(
        "Cannot send message. SignalR is not connected.",
        connection.state
      );

      return;
    }

    try {
      await connection.invoke(
        "SendMessage",
        user,
        trimmedMessage
      );

      setMessage("");
    } catch (err) {
      console.error(
        "Failed to send message:",
        err
      );
    }
  };


  // ========================================
  // Render
  // ========================================

  return (
    <div className="fixed inset-0 flex flex-col bg-gray-900 text-white">

      {/* Header */}

      <div className="bg-gray-800 p-4 text-lg font-semibold shadow flex items-center justify-between">

        <span>
          SignalR Chat
        </span>

        <span
          className={`text-xs ${
            isConnected
              ? "text-green-400"
              : "text-red-400"
          }`}
        >
          {isConnected
            ? "Connected"
            : "Disconnected"}
        </span>

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

            {!m.system && (
              <span className="block text-sm text-gray-300">
                {m.user}
              </span>
            )}

            <span className="block">
              {m.msg}
            </span>

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
              onChange={(e) =>
                setUser(e.target.value)
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setName();
                }
              }}
              className="flex-1 px-3 py-2 rounded bg-gray-700 text-white focus:outline-none"
            />

            <button
              onClick={setName}
              disabled={
                !isConnected ||
                !user.trim()
              }
              className="px-4 py-2 bg-green-500 rounded text-white hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
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
              onChange={(e) =>
                setMessage(e.target.value)
              }
              onKeyDown={(e) => {
                if (
                  e.key === "Enter" &&
                  !e.shiftKey
                ) {
                  sendMessage();
                }
              }}
              disabled={!isConnected}
              className="flex-1 px-3 py-2 rounded bg-gray-700 text-white focus:outline-none disabled:opacity-50"
            />

            <button
              onClick={sendMessage}
              disabled={
                !isConnected ||
                !message.trim()
              }
              className="px-4 py-2 bg-blue-500 rounded text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send
            </button>

          </>
        )}

      </div>

    </div>
  );
}