"use client";

export interface UIMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  muted?: boolean;
  typing?: boolean;
}

interface Props {
  message: UIMessage;
}

export default function ChatMessage({ message }: Props) {
  const isUser = message.role === "user";
  const label = isUser ? "YOU" : "MIRROR_S";

  return (
    <div className={`w-full flex flex-col ${isUser ? "items-end" : "items-start"}`}>
      <div
        className="text-[11px] tracking-wider mb-2"
        style={{ color: "#999" }}
      >
        {label}&nbsp;&nbsp;{message.timestamp}
      </div>

      {isUser ? (
        <div
          className="text-[13px] leading-[1.7] px-3.5 py-2 rounded-sm max-w-[80%]"
          style={{ background: "#f0f0f0", color: "#333" }}
        >
          {message.content}
        </div>
      ) : (
        <div
          className="text-[13px] leading-[1.9] max-w-[92%] whitespace-pre-wrap"
          style={{ color: message.muted ? "#bbbbbb" : "#333333" }}
        >
          {message.content}
          {message.typing && <span className="typing-caret">▍</span>}
        </div>
      )}
    </div>
  );
}
