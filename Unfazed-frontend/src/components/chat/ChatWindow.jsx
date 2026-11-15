
import React, { useEffect, useRef, useState } from "react";
import MessageBubble from "./MessageBubble";
import { Send, MessageCircle, Loader2 } from "lucide-react";
const SOCKET_URL = "https://unfazed-backend-svzd.onrender.com";
const ChatWindow = ({
  messages = [],
  onSendMessage,
  connected = true,
  loading = false,
  error = "",
  chatTitle = "Messages",
  chatSubtitle = "Chat with your clients",
}) => {
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const message = newMessage.trim();

    if (!message || sending || !connected) return;

    if (message.length > 5000) return;

    try {
      setSending(true);

      // Clear only after the parent confirms success.
      const result = await onSendMessage?.(message);

      if (result !== false) {
        setNewMessage("");
      }
    } catch (err) {
      console.error("Message sending failed:", err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex h-[500px] flex-col overflow-hidden rounded-2xl border border-[#e0e9df] bg-[#fffefa] shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#e8e6dc] p-4">
        <div>
          <h2 className="text-lg font-semibold text-[#30483b]">
            {chatTitle}
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            {chatSubtitle}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              connected ? "bg-green-500" : "bg-orange-400"
            }`}
          />

          <span
            className={`text-xs font-medium ${
              connected ? "text-green-600" : "text-orange-500"
            }`}
          >
            {connected ? "Connected" : "Disconnected"}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-4 overflow-y-auto bg-[#f8f7f2] p-4">
        {loading ? (
          <div className="flex h-full items-center justify-center gap-2 text-gray-500">
            <Loader2 size={20} className="animate-spin" />
            Loading messages...
          </div>
        ) : messages.length > 0 ? (
          messages.map((message, index) => (
            <MessageBubble
              key={message._id || message.id || index}
              message={message}
              isOwn={
                message.isOwn ??
                message.senderType === "therapist"
              }
            />
          ))
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <MessageCircle
              size={38}
              className="mb-3 text-[#a8bea9]"
            />

            <p className="font-medium text-gray-600">
              No messages yet
            </p>

            <p className="mt-1 text-sm text-gray-400">
              Start a conversation!
            </p>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Error */}
      {error && (
        <div className="border-t border-red-100 bg-red-50 px-4 py-2 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Message Input */}
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-3 border-t border-[#e8e6dc] p-4"
      >
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder={
            connected
              ? "Type your message..."
              : "Waiting for connection..."
          }
          maxLength={5000}
          disabled={!connected || sending}
          className="min-w-0 flex-1 rounded-xl border border-[#e5e7dd] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#829d84] focus:ring-2 focus:ring-[#e8eee6] disabled:cursor-not-allowed disabled:bg-gray-100"
        />

        <button
          type="submit"
          disabled={
            !newMessage.trim() ||
            !connected ||
            sending
          }
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#52745f] text-white transition hover:bg-[#405e4b] disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Send message"
        >
          {sending ? (
            <Loader2 size={19} className="animate-spin" />
          ) : (
            <Send size={19} />
          )}
        </button>
      </form>

      <div className="px-4 pb-3 text-right text-xs text-gray-400">
        {newMessage.length}/5000 characters
      </div>
    </div>
  );
};

export default ChatWindow;
