import type { ChatMessage } from "./mockReplies";

export async function sendMessage(history: ChatMessage[]): Promise<string> {
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: history }),
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const data = (await res.json()) as { reply?: string; error?: string };
    if (data.error) throw new Error(data.error);
    return data.reply ?? "...";
  } catch (e) {
    return "[连接中断] 我这边出了点小故障，稍后再试一次?";
  }
}
