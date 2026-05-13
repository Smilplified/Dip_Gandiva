"use client";

import { IconBrandWhatsapp } from "@tabler/icons-react";
import type { Conversation } from "./types";
import { avatarBackground } from "./avatarColors";

interface ConversationItemProps {
  conversation: Conversation;
  active: boolean;
  onSelect: () => void;
}

function formatShortTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  } catch {
    return "";
  }
}

export default function ConversationItem({ conversation: c, active, onSelect }: ConversationItemProps) {
  const unread = c.unreadCount > 0;
  const bg = avatarBackground(c.avatarHue);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        "crm-conversation-item relative m-0 box-border flex w-full cursor-pointer appearance-none border-0 px-3 py-3 text-left font-inherit shadow-none outline-none transition-[background-color] duration-200 ease-out focus:outline-none focus-visible:outline-none",
        active
          ? "bg-gradient-to-r from-[#e8f8f1] via-[#f2fbf7] to-[#fafcfb]"
          : "bg-white hover:bg-[#fafbfb]",
      ].join(" ")}
    >
      <span
        aria-hidden
        className={[
          "pointer-events-none absolute bottom-0 left-0 top-0 w-[3px] rounded-r-sm transition-colors duration-200 ease-out",
          active ? "bg-[#1d9e75]" : "bg-transparent",
        ].join(" ")}
      />
      <div className="relative z-[1] flex min-w-0 flex-1 gap-3">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold text-white"
          style={{ background: bg }}
        >
          {c.initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <span className="text-[12px] font-semibold leading-tight text-[#101828]">
              Lead #{c.leadId}
            </span>
            <span className="relative flex shrink-0 items-center gap-1">
              {unread ? <span className="h-[7px] w-[7px] rounded-full bg-[#1d9e75]" aria-hidden /> : null}
              <span className="text-[10px] text-[#98a2b3]">{formatShortTime(c.lastMessageAt)}</span>
            </span>
          </div>
          <p
            className={[
              "mt-0.5 truncate text-[11px] leading-snug",
              unread ? "font-medium text-[#344054]" : "font-normal text-[#475467]",
            ].join(" ")}
          >
            {c.lastMessage}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-[#1d9e75]">
              {c.companyName}
            </span>
            <span className="inline-flex max-w-full items-center gap-0.5 rounded-full bg-[#1677ff] px-1.5 py-0.5 text-[9px] font-medium leading-tight text-white">
              <IconBrandWhatsapp size={11} stroke={1.5} className="shrink-0" aria-hidden />
              WhatsApp
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}
