"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  IconBrandWhatsapp,
  IconPaperclip,
  IconSend,
  IconUser,
  IconArrowsExchange,
  IconLayoutSidebarRight,
} from "@tabler/icons-react";
import type { ChatMessage, Conversation } from "./types";
import MessageBubble from "./MessageBubble";
import { avatarBackground } from "./avatarColors";

function formatDividerDate(iso: string): string {
  try {
    const d = new Date(iso);
    const today = new Date();
    const isToday =
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear();
    const long = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    return isToday ? `Today, ${long}` : long;
  } catch {
    return "";
  }
}

function dayKey(iso: string): string {
  try {
    return new Date(iso).toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

function DateDivider({ label }: { label: string }) {
  return (
    <div className="my-4 flex items-center gap-3">
      <div className="h-px flex-1 bg-[#e4e7ec]" />
      <span className="shrink-0 text-[10px] text-[#98a2b3]">{label}</span>
      <div className="h-px flex-1 bg-[#e4e7ec]" />
    </div>
  );
}

function TypingIndicator({ leadInitials, avatarHue }: { leadInitials: string; avatarHue: number }) {
  const bg = avatarBackground(avatarHue);
  return (
    <div className="flex max-w-[70%] gap-2 self-start">
      <style>{`
        @keyframes chatTypingDot {
          0%, 60%, 100% { opacity: 0.35; transform: translateY(0); }
          30% { opacity: 1; transform: translateY(-2px); }
        }
        .crm-chat-typing-dot {
          animation: chatTypingDot 1.1s ease-in-out infinite;
          display: inline-block;
          width: 6px;
          height: 6px;
          border-radius: 999px;
          background: #98a2b3;
        }
        .crm-chat-typing-dot:nth-child(2) { animation-delay: 0.18s; }
        .crm-chat-typing-dot:nth-child(3) { animation-delay: 0.36s; }
      `}</style>
      <div className="flex flex-col justify-end pb-5">
        <div
          className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white"
          style={{ background: bg }}
        >
          {leadInitials}
        </div>
      </div>
      <div className="flex items-center gap-1 rounded-[2px_12px_12px_12px] border border-[#e4e7ec] bg-white px-4 py-3">
        <span className="crm-chat-typing-dot" />
        <span className="crm-chat-typing-dot" />
        <span className="crm-chat-typing-dot" />
      </div>
    </div>
  );
}

const QUICK_CHIPS: { emoji: string; label: string; text: string }[] = [
  { emoji: "📅", label: "Schedule demo", text: "Let’s schedule a quick demo — which slots work this week?" },
  { emoji: "💰", label: "Share pricing", text: "Sharing our pricing overview for your team size." },
  { emoji: "📎", label: "Attach file", text: "I’m attaching the document to this chat." },
];

interface ChatThreadProps {
  conversation: Conversation | null;
  messages: ChatMessage[];
  draft: string;
  onDraftChange: (v: string) => void;
  onSend: () => void;
  leadInfoOpen: boolean;
  onToggleLeadInfo: () => void;
}

export default function ChatThread({
  conversation,
  messages,
  draft,
  onDraftChange,
  onSend,
  leadInfoOpen,
  onToggleLeadInfo,
}: ChatThreadProps) {
  const router = useRouter();
  const listRef = useRef<HTMLDivElement>(null);
  const [reassignOpen, setReassignOpen] = useState(false);

  const grouped = useMemo(() => {
    const rows: { type: "divider" | "msg"; key: string; label?: string; message?: ChatMessage }[] = [];
    let lastDay = "";
    for (const m of messages) {
      const dk = dayKey(m.createdAt);
      if (dk !== lastDay) {
        lastDay = dk;
        rows.push({ type: "divider", key: `d-${dk}`, label: formatDividerDate(m.createdAt) });
      }
      rows.push({ type: "msg", key: m.id, message: m });
    }
    return rows;
  }, [messages]);

  const scrollToBottom = useCallback(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  useEffect(() => {
    queueMicrotask(scrollToBottom);
  }, [messages, conversation?.leadId, scrollToBottom]);

  if (!conversation) {
    return (
      <div className="flex min-w-0 flex-1 items-center justify-center bg-[#f0f2f5] text-[14px] text-[#98a2b3]">
        Select a conversation
      </div>
    );
  }

  const headerBg = avatarBackground(conversation.avatarHue);

  const viewLead = () => {
    router.push("/dashboard/leads");
  };

  return (
    <div className="flex min-w-0 flex-1 flex-col bg-[#f0f2f5]">
      <header className="flex shrink-0 items-start justify-between gap-3 border-b border-[#e4e7ec] bg-white px-4 py-3">
        <div className="flex min-w-0 gap-3">
          <div
            className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full text-[13px] font-semibold text-white"
            style={{ background: headerBg }}
          >
            {conversation.initials}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[14px] font-semibold text-[#101828]">
                Lead #{conversation.leadId}
              </span>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-[#1d9e75]">
                {conversation.companyName}
              </span>
              <span className="inline-flex items-center gap-0.5 rounded-full bg-[#1677ff] px-2 py-0.5 text-[11px] font-medium text-white">
                <IconBrandWhatsapp size={13} stroke={1.5} aria-hidden />
                WhatsApp
              </span>
            </div>
            <p className="mt-1 truncate text-[11px] text-[#98a2b3]">
              Assigned: {conversation.assignedTo} · Campaign: {conversation.campaignName}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={viewLead}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#e4e7ec] bg-white px-3 py-1.5 text-[12px] font-medium text-[#344054] hover:bg-[#f7f8fa]"
          >
            <IconUser size={16} stroke={1.5} aria-hidden />
            View Lead
          </button>
          <button
            type="button"
            onClick={() => setReassignOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#e4e7ec] bg-white px-3 py-1.5 text-[12px] font-medium text-[#344054] hover:bg-[#f7f8fa]"
          >
            <IconArrowsExchange size={16} stroke={1.5} aria-hidden />
            Reassign
          </button>
          <button
            type="button"
            onClick={onToggleLeadInfo}
            aria-pressed={leadInfoOpen}
            title={leadInfoOpen ? "Hide lead info" : "Show lead info"}
            className={[
              "inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-colors",
              leadInfoOpen ? "border-[#1d9e75] bg-emerald-50 text-[#1d9e75]" : "border-[#e4e7ec] bg-white text-[#475467] hover:bg-[#f7f8fa]",
            ].join(" ")}
          >
            <IconLayoutSidebarRight size={18} stroke={1.5} aria-hidden />
          </button>
        </div>
      </header>

      <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        <div className="mx-auto flex max-w-3xl flex-col gap-1">
          {grouped.map((row) =>
            row.type === "divider" && row.label ? (
              <DateDivider key={row.key} label={row.label} />
            ) : row.type === "msg" && row.message ? (
              <MessageBubble
                key={row.key}
                message={row.message}
                leadInitials={conversation.initials}
                avatarHue={conversation.avatarHue}
              />
            ) : null
          )}
          {conversation.showTyping ? (
            <TypingIndicator leadInitials={conversation.initials} avatarHue={conversation.avatarHue} />
          ) : null}
        </div>
      </div>

      <footer className="shrink-0 border-l border-t border-[var(--border,#e4e7ec)] bg-white px-4 py-3">
        <div className="mx-auto max-w-3xl">
          <div className="mb-2 flex flex-wrap gap-2">
            {QUICK_CHIPS.map((c) => (
              <button
                key={c.label}
                type="button"
                onClick={() => onDraftChange(c.text)}
                className="rounded-full border border-[#e4e7ec] bg-[#f7f8fa] px-3 py-1.5 text-[12px] font-medium text-[#344054] hover:border-[#1d9e75] hover:text-[#1d9e75]"
              >
                {c.emoji} {c.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <textarea
              rows={1}
              value={draft}
              onChange={(e) => onDraftChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  onSend();
                }
              }}
              placeholder="Type a message..."
              className="min-h-[44px] flex-1 resize-none rounded-[20px] border-0 bg-[#f7f8fa] px-4 py-2.5 text-[14px] text-[#101828] outline-none ring-1 ring-transparent placeholder:text-[#98a2b3] focus:ring-[#1d9e75]"
            />
            <button
              type="button"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-0 bg-[#f7f8fa] text-[#475467] hover:bg-[#e4e7ec]"
              aria-label="Attach file"
            >
              <IconPaperclip size={20} stroke={1.5} />
            </button>
            <button
              type="button"
              onClick={onSend}
              className="flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-full border-0 bg-[var(--green,#1d9e75)] text-white shadow-sm hover:opacity-95"
              aria-label="Send"
            >
              <IconSend size={18} stroke={1.5} />
            </button>
          </div>
        </div>
      </footer>

      {reassignOpen ? (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/30 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reassign-title"
          onClick={() => setReassignOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-xl bg-white p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="reassign-title" className="m-0 text-[15px] font-semibold text-[#101828]">
              Reassign lead
            </h3>
            <p className="mt-1 text-[13px] text-[#475467]">Choose an agent (mock).</p>
            <ul className="mt-3 max-h-48 overflow-y-auto border border-[#e4e7ec] rounded-lg divide-y divide-[#e4e7ec]">
              {["Shlok S", "Asha K", "Ravi P"].map((name) => (
                <li key={name}>
                  <button
                    type="button"
                    className="w-full border-0 bg-transparent px-3 py-2.5 text-left text-[13px] text-[#344054] hover:bg-[#f7f8fa]"
                    onClick={() => setReassignOpen(false)}
                  >
                    {name}
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="mt-3 w-full rounded-lg border border-[#e4e7ec] bg-white py-2 text-[13px] font-medium text-[#475467]"
              onClick={() => setReassignOpen(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
