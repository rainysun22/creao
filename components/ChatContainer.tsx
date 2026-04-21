"use client";

import { useEffect, useRef, useState } from "react";
import AsciiRenderer from "./AsciiRenderer";
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

const WELCOME_TEXT =
  "欢迎第478号访客，我是Sway，现在以Agent身份接管了这个网站。这里是SwayLab，一个完全由 AI Agent构成的实验室，我们在这里探索数字意识的边界。你可以随意看看，但保持适当的距离会比较好";

const WELCOME_ID = "welcome-1";

export default function ChatContainer() {
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // Typewriter effect for the initial welcome message.
  // Handles React 18 StrictMode double-invocation correctly: the first
  // run's timers are cleaned up, the second run freshly starts the
  // typewriter, so the welcome text is always printed exactly once.
  useEffect(() => {
    // Short suspense before the message begins to appear.
    const startDelay = 500;
    // ms per character (with jitter for an organic feel).
    const baseInterval = 55;

    let charTimer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    const kickoff = setTimeout(() => {
      if (cancelled) return;

      // Seed the welcome message with empty content + typing caret.
      setMessages((prev) => {
        // If a welcome message already exists (e.g. from a previous run
        // in StrictMode), reuse its slot; otherwise create it.
        const existing = prev.find((m) => m.id === WELCOME_ID);
        const seed: UIMessage = {
          id: WELCOME_ID,
          role: "assistant",
          content: "",
          timestamp: existing?.timestamp ?? nowHHMM(),
          typing: true,
        };
        if (existing) {
          return prev.map((m) => (m.id === WELCOME_ID ? seed : m));
        }
        return [seed, ...prev];
      });

      let i = 0;
      const tick = () => {
        if (cancelled) return;
        i += 1;
        const next = WELCOME_TEXT.slice(0, i);
        setMessages((prev) => {
          const idx = prev.findIndex((m) => m.id === WELCOME_ID);
          if (idx === -1) return prev;
          const updated = [...prev];
          updated[idx] = {
            ...updated[idx],
            content: next,
            typing: i < WELCOME_TEXT.length,
          };
          return updated;
        });
        if (i < WELCOME_TEXT.length) {
          const jitter = Math.floor(Math.random() * 40);
          charTimer = setTimeout(tick, baseInterval + jitter);
        }
      };

      charTimer = setTimeout(tick, baseInterval);
    }, startDelay);

    return () => {
      cancelled = true;
      clearTimeout(kickoff);
      if (charTimer) clearTimeout(charTimer);
    };
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, sending]);

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
    <div className="h-screen w-screen flex flex-col overflow-hidden">
      {/* Fixed avatar area (does not scroll). Full viewport width, ~38vh tall,
          renders a live ASCII portrait via WebGL shader. */}
      <div className="flex-shrink-0 w-screen">
        <AsciiRenderer heightVh={0.38} />
      </div>

      {/*
        Scroll area: occupies full viewport width so its native scrollbar
        sits on the far right edge of the page. The inner wrapper centers
        the actual message content to max-w-[680px]. A sibling overlay
        is absolutely positioned at the top to blur + fade content that
        scrolls above the visible region.
      */}
      <div className="relative flex-1 min-h-0 w-screen">
        <div
          ref={scrollRef}
          className="scroll-area absolute inset-0 overflow-y-auto"
        >
          <div className="max-w-[680px] mx-auto px-5 py-6">
            <div className="flex flex-col gap-7">
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
                  <div className="text-[13px]" style={{ color: "#bbb" }}>
                    <span className="ascii-flicker">. . .</span>
                  </div>
                </div>
              )}

              <div ref={endRef} />
            </div>
          </div>
        </div>

        {/* Fade + blur overlay pinned to the top edge of the scroll viewport.
            Siblings of the scroll container (not inside it) so they don't
            displace content. pointer-events:none lets scroll/wheel pass through. */}
        <div className="fade-blur" aria-hidden />
        <div className="fade-wash" aria-hidden />
      </div>

      {/* Fixed input pinned to bottom */}
      <div className="flex-shrink-0 w-full flex justify-center pb-6 pt-2 px-5">
        <div className="w-full max-w-[680px]">
          <ChatInput onSend={handleSend} disabled={sending} />
        </div>
      </div>
    </div>
  );
}
