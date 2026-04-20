"use client";

import { useState, type FormEvent, type KeyboardEvent } from "react";

interface Props {
  onSend: (text: string) => void;
  disabled?: boolean;
}

export default function ChatInput({ onSend, disabled }: Props) {
  const [value, setValue] = useState("");

  const submit = () => {
    const text = value.trim();
    if (!text || disabled) return;
    if (text.length > 500) return;
    onSend(text);
    setValue("");
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    submit();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full flex items-center gap-3 px-5 py-3 rounded-sm"
      style={{ background: "#fafafa", border: "1px solid #eeeeee" }}
    >
      <span
        className="text-[13px] select-none"
        style={{ color: "#bbb" }}
      >
        &gt;
      </span>
      <input
        className="flex-1 text-[13px]"
        placeholder="..."
        value={value}
        maxLength={500}
        disabled={disabled}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        style={{ color: "#333" }}
      />
      <button
        type="submit"
        aria-label="send"
        disabled={disabled || !value.trim()}
        className="transition-opacity"
        style={{
          color: "#999",
          opacity: disabled || !value.trim() ? 0.35 : 1,
        }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="22" y1="2" x2="11" y2="13" />
          <polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
      </button>
    </form>
  );
}
