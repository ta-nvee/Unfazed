
import { useEffect, useRef, useState, useCallback } from "react";
import { io } from "socket.io-client";
import axiosInstance from "../../api/axiosInstance";
import ChatWindow from "../../components/chat/ChatWindow";
import { User, Loader2, MessageCircle } from "lucide-react";

const Chat = () => {
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState("");

  const socketRef = useRef(null);
  const selectedClientRef = useRef("");

  useEffect(() => {
    selectedClientRef.current = selectedClient;
  }, [selectedClient]);

  // Load therapist's clients
  useEffect(() => {
    let cancelled = false;

    const fetchClients = async () => {
      try {
        const response = await axiosInstance.get("/clients");
        if (cancelled) return;

        const clientList = response.data.clients || [];
        setClients(clientList);

        if (clientList.length > 0) {
          setSelectedClient(String(clientList[0]._id));
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err.response?.data?.message || "Could not load clients."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchClients();

    return () => {
      cancelled = true;
    };
  }, []);

  // Connect Socket.IO
  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      setError("Please log in again to use chat.");
      return;
    }

    const socket = io(
      import.meta.env.VITE_SOCKET_URL || "http://localhost:5000",
      {
        auth: { token },
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      }
    );

    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      setError("");
    });

    socket.on("disconnect", () => {
      setConnected(false);
    });

    socket.on("connect_error", (err) => {
      setConnected(false);
      setError(err.message || "Chat connection failed.");
    });

    socket.on("receive-message", (message) => {
      const currentClientId = selectedClientRef.current;

      if (
        String(message.clientId || message.client?._id || message.client) !==
        String(currentClientId)
      ) {
        return;
      }

      setMessages((previous) => {
        if (
          previous.some(
            (item) => String(item._id) === String(message._id)
          )
        ) {
          return previous;
        }

        return [...previous, message];
      });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  // Join selected client's conversation
  useEffect(() => {
    const socket = socketRef.current;

    setMessages([]);

    if (!socket || !selectedClient) return;

    let cancelled = false;

    const joinRoom = () => {
      socket.emit("join-room", selectedClient, (response) => {
        if (cancelled) return;

        if (response?.success) {
          setMessages(response.messages || []);
          setError("");
        } else {
          setMessages([]);
          setError(response?.message || "Could not open chat.");
        }
      });
    };

    if (socket.connected) {
      joinRoom();
    } else {
      socket.once("connect", joinRoom);
    }

    return () => {
      cancelled = true;
      socket.off("connect", joinRoom);
    };
  }, [selectedClient, connected]);

  // Send message
  const handleSendMessage = useCallback(
    (messageText) => {
      return new Promise((resolve) => {
        const socket = socketRef.current;

        if (!socket?.connected || !selectedClient) {
          setError("Chat is disconnected. Please try again.");
          resolve(false);
          return;
        }

        if (!messageText?.trim()) {
          resolve(false);
          return;
        }

        socket.timeout(5000).emit(
          "send-message",
          {
            clientId: selectedClient,
            message: messageText.trim(),
          },
          (timeoutError, response) => {
            if (timeoutError) {
              setError("Message timed out. Please try again.");
              resolve(false);
              return;
            }

            if (!response?.success) {
              setError(
                response?.message || "Message could not be sent."
              );
              resolve(false);
              return;
            }

            setError("");
            resolve(true);
          }
        );
      });
    },
    [selectedClient]
  );

  const activeClient = clients.find(
    (client) => String(client._id) === String(selectedClient)
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="animate-spin text-purple-500" size={28} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf9f7] p-4 md:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <p className="text-sm font-medium text-purple-600">
            UNFAZED / COMMUNICATION
          </p>

          <h1 className="mt-2 text-3xl font-bold text-gray-800">
            Messages
          </h1>

          <p className="mt-1 text-gray-500">
            A calm space to stay connected with your clients.
          </p>
        </div>

        <div className="grid min-h-[600px] overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm md:grid-cols-[280px_1fr]">
          <div className="border-b border-gray-100 md:border-b-0 md:border-r">
            <div className="border-b p-5">
              <h2 className="font-semibold text-gray-800">
                Your Clients
              </h2>

              <p className="mt-1 text-sm text-gray-400">
                Select someone to chat with
              </p>
            </div>

            <div className="max-h-[550px] overflow-y-auto p-3">
              {clients.length === 0 ? (
                <p className="p-4 text-center text-sm text-gray-400">
                  No clients found. Add a client first.
                </p>
              ) : (
                clients.map((client) => (
                  <button
                    type="button"
                    key={client._id}
                    onClick={() => setSelectedClient(String(client._id))}
                    className={`mb-2 flex w-full items-center gap-3 rounded-xl p-3 text-left transition ${
                      String(selectedClient) === String(client._id)
                        ? "bg-purple-50 text-purple-700"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-100 text-purple-600">
                      <User size={19} />
                    </div>

                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {client.name}
                      </p>
                      <p className="text-xs text-gray-400">
                        Open conversation
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="min-h-[600px] p-3 md:p-5">
            {activeClient ? (
              <ChatWindow
                messages={messages}
                onSendMessage={handleSendMessage}
                connected={connected}
                loading={false}
                error={error}
                chatTitle={activeClient.name}
                chatSubtitle="Client conversation"
              />
            ) : (
              <div className="flex h-full min-h-[500px] flex-col items-center justify-center text-center">
                <MessageCircle
                  size={42}
                  className="mb-3 text-purple-200"
                />

                <p className="font-medium text-gray-700">
                  Select a client to start chatting
                </p>

                <p className="mt-1 text-sm text-gray-400">
                  Your conversations will appear here.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
