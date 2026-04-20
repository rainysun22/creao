"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";

interface Props {
  onSend: (text: string) => void;
  disabled?: boolean;
}

export default function ChatInput({ onSend, disabled }: Props) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus on mount so users can start typing immediately.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Whenever we transition from "sending" back to ready, return focus to
  // the input so the user can keep typing without clicking again.
  useEffect(() => {
    if (!disabled) {
      inputRef.current?.focus();
    }
  }, [disabled]);

  const submit = () => {
    const text = value.trim();
    if (!text || disabled) return;
    if (text.length > 500) return;
    onSend(text);
    setValue("");
    // Re-focus on next tick; parent may flip `disabled` briefly which would
    // otherwise cause the browser to blur the field.
    requestAnimationFrame(() => inputRef.current?.focus());
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

  // Prevent the send button's mousedown from stealing focus from the input.
  const handleButtonMouseDown = (e: ReactMouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
  };

  // Clicking anywhere on the form wrapper should focus the input.
  const handleFormClick = () => {
    inputRef.current?.focus();
  };

  const canSubmit = !disabled && value.trim().length > 0;

  return (
    <form
      onSubmit={handleSubmit}
      onClick={handleFormClick}
      className="w-full flex items-center gap-3 px-5 py-3 rounded-sm cursor-text"
      style={{ background: "#fafafa", border: "1px solid #eeeeee" }}
    >
      <span
        className="text-[13px] select-none"
        style={{ color: "#bbb" }}
      >
        &gt;
      </span>
      <input
        ref={inputRef}
        className="flex-1 text-[13px]"
        placeholder="..."
        value={value}
        maxLength={500}
        // NOTE: intentionally NOT using the `disabled` attribute — toggling
        // it causes the browser to blur the input, breaking continuous
        // typing after each send. We gate submissions in `submit()` instead.
        readOnly={disabled}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        style={{ color: "#333" }}
      />
      <button
        type="submit"
        aria-label="send"
        onMouseDown={handleButtonMouseDown}
        className="transition-opacity"
        style={{
          color: "#999",
          opacity: canSubmit ? 1 : 0.35,
          cursor: canSubmit ? "pointer" : "default",
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
