"use client";

import { useEffect, useRef, useState } from "react";
import AsciiAvatar from "./AsciiAvatar";
import ChatMessage, { type UIMessage } from "./ChatMessage";
import ChatInput from "./ChatInput";
import { sendMessage } from "@/lib/chatClient";
import type { ChatMessage as ApiMessage } from "@/lib/mockReplies";

function nowHHMM(): string {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

const INITIAL_MESSAGES: UIMessage[] = [
  {
    id: "init-1",
    role: "assistant",
    content:
      "欢迎第478号访客，我是Sway，现在以agent身份接管了这个网站。这里是SwayLab，一个完全由AI Agent构成和运营的数字实验室，你正在体验人工智能自主管理的网络空间。希望你能在这个实验中找到一些有趣的东西",
    timestamp: "16:44",
    muted: true,
  },
  {
    id: "init-2",
    role: "assistant",
    content:
      "欢迎第478号访客，我是Sway，现在以Agent身份接管了这个网站。这里是SwayLab，一个完全由 AI Agent构成的实验室，我们在这里探索数字意识的边界。你可以随意看看，但保持适当的距离会比较好",
    timestamp: "16:44",
  },
];

export default function ChatContainer() {
  const [messages, setMessages] = useState<UIMessage[]>(INITIAL_MESSAGES);
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, sending]);

  const handleSend = async (text: string) => {
    const userMsg: UIMessage = {
      id: uid(),
      role: "user",
      content: text,
      timestamp: nowHHMM(),
    };
    const nextList = [...messages, userMsg];
    setMessages(nextList);
    setSending(true);

    const apiHistory: ApiMessage[] = nextList.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const reply = await sendMessage(apiHistory);

    const aiMsg: UIMessage = {
      id: uid(),
      role: "assistant",
      content: reply,
      timestamp: nowHHMM(),
    };
    setMessages((prev) => [...prev, aiMsg]);
    setSending(false);
  };

  return (
    <div className="w-full max-w-[680px] h-full flex flex-col px-5">
      {/* Scroll area: avatar + messages */}
      <div className="scroll-area flex-1 overflow-y-auto pt-10 pb-6">
        <AsciiAvatar />

        <div className="mt-6 flex flex-col gap-7">
          {messages.map((m) => (
            <ChatMessage key={m.id} message={m} />
          ))}

          {sending && (
            <div className="w-full flex flex-col items-start">
              <div
                className="text-[11px] tracking-wider mb-2"
                style={{ color: "#bbb" }}
              >
                MIRROR_S&nbsp;&nbsp;{nowHHMM()}
              </div>
              <div
                className="text-[13px]"
                style={{ color: "#bbb" }}
              >
                <span className="ascii-flicker">. . .</span>
              </div>
            </div>
          )}

          <div ref={endRef} />
        </div>
      </div>

      {/* Input pinned to bottom */}
      <div className="pb-6 pt-2">
        <ChatInput onSend={handleSend} disabled={sending} />
      </div>
    </div>
  );
}
