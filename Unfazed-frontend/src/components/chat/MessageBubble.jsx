
import React from "react";

const MessageBubble = ({ message, isOwn = false }) => {
  const messageText =
    typeof message === "string"
      ? message
      : message?.message || message?.text || "";

  const timestamp =
    message?.sentAt || message?.createdAt;

  const formattedTime = timestamp
    ? new Date(timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  return (
    <div
      className={`mb-4 flex ${
        isOwn ? "justify-end" : "justify-start"
      }`}
    >
      <div
        className={`max-w-[80%] break-words rounded-2xl px-4 py-3 shadow-sm ${
          isOwn
            ? "rounded-br-sm bg-[#52745f] text-white"
            : "rounded-bl-sm border border-[#e8e6dc] bg-white text-[#30483b]"
        }`}
      >
        <p className="whitespace-pre-wrap break-words text-sm leading-6">
          {messageText}
        </p>

        {formattedTime && (
          <p
            className={`mt-2 text-right text-[10px] ${
              isOwn ? "text-[#dce8dc]" : "text-gray-400"
            }`}
          >
            {formattedTime}
          </p>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;
